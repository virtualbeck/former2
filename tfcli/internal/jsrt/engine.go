// Package jsrt embeds former2's JavaScript mapping corpus and runs it on goja.
// Go supplies the environment former2 expects in a browser (a jQuery-ish shim,
// logging, and crucially sdkcall's transport via the generic awsclient), then
// drives the three steps: scan, generate (flat Terraform) and project.
package jsrt

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/virtualbeck/former2/tfcli/internal/awsclient"
)

//go:embed prelude.js prelude-post.js js
var assets embed.FS

// Logger receives diagnostic output from the JS layer.
type Logger interface {
	Debug(msg string)
	Warn(msg string)
	Notify(title, message string)
	Progress(done, total int)
}

// Engine is a single-use former2 runtime. Not safe for concurrent Step calls.
type Engine struct {
	loop   *eventloop.EventLoop
	client *awsclient.Client
	region string
	log    Logger
	debug  bool

	sem chan struct{}

	inflight sync.WaitGroup
}

// New builds and initialises the runtime: loads the prelude, the vendored
// former2 files and the post-prelude. Returns once the JS environment is ready.
func New(client *awsclient.Client, region string, log Logger, debug bool, maxConcurrency int) (*Engine, error) {
	if maxConcurrency <= 0 {
		maxConcurrency = 32
	}
	e := &Engine{
		loop:   eventloop.NewEventLoop(eventloop.WithRegistry(nil)),
		client: client,
		region: region,
		log:    log,
		debug:  debug,
		sem:    make(chan struct{}, maxConcurrency),
	}
	e.loop.Start()

	var initErr error
	e.runOnLoopSync(func(vm *goja.Runtime) {
		initErr = e.bootstrap(vm)
	})
	if initErr != nil {
		e.loop.StopNoWait()
		return nil, initErr
	}
	return e, nil
}

// Close stops the event loop.
func (e *Engine) Close() {
	e.loop.StopNoWait()
}

func (e *Engine) bootstrap(vm *goja.Runtime) error {
	vm.Set("__hostLog", func(level, msg string) {
		switch level {
		case "warn", "error":
			e.log.Warn(msg)
		case "trace":
			if e.debug {
				e.log.Warn(msg)
			}
		default:
			if e.debug {
				e.log.Debug(msg)
			}
		}
	})
	vm.Set("__hostNotify", func(title, message string) {
		e.log.Notify(title, message)
	})
	vm.Set("__hostProgress", func(done, total int) {
		e.log.Progress(done, total)
	})
	vm.Set("__hostSdkCall", func(call goja.FunctionCall) goja.Value {
		return e.hostSdkCall(vm, call)
	})

	// load order matters
	files := []string{"prelude.js"}
	files = append(files, "js/deepmerge.js", "js/mappings.js", "js/datatables.js")
	svc, err := fs.ReadDir(assets, "js/services")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(svc))
	for _, d := range svc {
		if strings.HasSuffix(d.Name(), ".js") {
			names = append(names, "js/services/"+d.Name())
		}
	}
	sort.Strings(names)
	files = append(files, names...)
	files = append(files, "js/tfproject.js", "prelude-post.js")

	for _, f := range files {
		src, err := assets.ReadFile(f)
		if err != nil {
			return fmt.Errorf("read %s: %w", f, err)
		}
		if _, err := vm.RunScript(f, string(src)); err != nil {
			return fmt.Errorf("load %s: %w", f, err)
		}
	}

	vm.Set("region", e.region)
	// sanity: the corpus must have registered its sections + mappers
	if v := vm.Get("service_mapping_functions"); v == nil || goja.IsUndefined(v) {
		return fmt.Errorf("former2 corpus did not initialise (service_mapping_functions missing)")
	}
	return nil
}

// --- sdkcall bridge ---------------------------------------------------

func (e *Engine) hostSdkCall(vm *goja.Runtime, call goja.FunctionCall) goja.Value {
	svc := call.Argument(0).String()
	method := call.Argument(1).String()
	paramsJSON := call.Argument(2).String()
	optsJSON := call.Argument(3).String()
	cb, ok := goja.AssertFunction(call.Argument(4))
	if !ok {
		panic(vm.NewTypeError("__hostSdkCall: callback is not a function"))
	}

	var params map[string]interface{}
	_ = json.Unmarshal([]byte(paramsJSON), &params)
	var opts map[string]interface{}
	_ = json.Unmarshal([]byte(optsJSON), &opts)

	e.inflight.Add(1)
	go func() {
		defer e.inflight.Done()
		e.sem <- struct{}{}
		defer func() { <-e.sem }()

		ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()
		data, err := e.client.Call(ctx, svc, method, params, opts)

		e.loop.RunOnLoop(func(vm *goja.Runtime) {
			if err != nil {
				code := "UnknownError"
				msg := err.Error()
				var apiErr *awsclient.APIError
				if ok := asAPIError(err, &apiErr); ok {
					code = apiErr.Code
					msg = apiErr.Message
				}
				ej, _ := json.Marshal(map[string]interface{}{"code": code, "message": msg})
				cb(goja.Undefined(), vm.ToValue(string(ej)), goja.Null())
				return
			}
			dj, mErr := json.Marshal(data)
			if mErr != nil {
				ej, _ := json.Marshal(map[string]interface{}{"code": "MarshalError", "message": mErr.Error()})
				cb(goja.Undefined(), vm.ToValue(string(ej)), goja.Null())
				return
			}
			cb(goja.Undefined(), goja.Null(), vm.ToValue(string(dj)))
		})
	}()

	return goja.Undefined()
}

func asAPIError(err error, target **awsclient.APIError) bool {
	if ae, ok := err.(*awsclient.APIError); ok {
		*target = ae
		return true
	}
	return false
}

// --- loop helpers ---------------------------------------------------

func (e *Engine) runOnLoopSync(fn func(vm *goja.Runtime)) {
	done := make(chan struct{})
	e.loop.RunOnLoop(func(vm *goja.Runtime) {
		defer close(done)
		fn(vm)
	})
	<-done
}

// callAsync invokes a JS function that returns a Promise (or a plain value) and
// blocks until it settles, returning the exported result.
func (e *Engine) callAsync(fnName string, args ...interface{}) (interface{}, error) {
	type outcome struct {
		val interface{}
		err error
	}
	res := make(chan outcome, 1)

	e.loop.RunOnLoop(func(vm *goja.Runtime) {
		fn, ok := goja.AssertFunction(vm.Get(fnName))
		if !ok {
			res <- outcome{err: fmt.Errorf("js function %s not found", fnName)}
			return
		}
		jsArgs := make([]goja.Value, len(args))
		for i, a := range args {
			jsArgs[i] = vm.ToValue(a)
		}
		ret, err := fn(goja.Undefined(), jsArgs...)
		if err != nil {
			res <- outcome{err: err}
			return
		}
		prom, isProm := ret.Export().(*goja.Promise)
		if !isProm {
			res <- outcome{val: ret.Export()}
			return
		}
		// attach reactions
		thenV, _ := goja.AssertFunction(ret.ToObject(vm).Get("then"))
		onOK := vm.ToValue(func(c goja.FunctionCall) goja.Value {
			res <- outcome{val: c.Argument(0).Export()}
			return goja.Undefined()
		})
		onErr := vm.ToValue(func(c goja.FunctionCall) goja.Value {
			res <- outcome{err: fmt.Errorf("%v", c.Argument(0))}
			return goja.Undefined()
		})
		if _, err := thenV(ret, onOK, onErr); err != nil {
			res <- outcome{err: err}
		}
		_ = prom
	})

	o := <-res
	return o.val, o.err
}

// --- steps ----------------------------------------------------------

// ScanOptions filters which services are queried.
type ScanOptions struct {
	Services                []string `json:"services,omitempty"`
	ExcludeServices         []string `json:"excludeServices,omitempty"`
	IncludeDefaultResources bool     `json:"includeDefaultResources,omitempty"`
}

// Scan runs step 1. Returns the number of discovered resource rows.
func (e *Engine) Scan(opts ScanOptions) (int, error) {
	b, _ := json.Marshal(opts)
	v, err := e.callAsync("__runScan", string(b))
	if err != nil {
		return 0, err
	}
	return toInt(v), nil
}

// LoadRaw seeds the runtime with previously scanned rows (raw.json).
func (e *Engine) LoadRaw(raw []byte) (int, error) {
	v, err := e.callAsync("__loadRawResources", string(raw))
	if err != nil {
		return 0, err
	}
	return toInt(v), nil
}

// DumpRaw returns the scanned rows as JSON.
func (e *Engine) DumpRaw() ([]byte, error) {
	v, err := e.callAsync("__getRawResources")
	if err != nil {
		return nil, err
	}
	return []byte(fmt.Sprintf("%v", v)), nil
}

// PrepareOptions controls filtering + logical-id ordering for steps 2/3.
type PrepareOptions struct {
	SearchFilter string `json:"searchFilter,omitempty"`
	RegexFilter  string `json:"regexFilter,omitempty"`
	SortOutput   bool   `json:"sortOutput,omitempty"`
}

// Prepare runs performF2Mappings over the scanned rows. Must be called before
// GenerateTf / GenerateProject.
func (e *Engine) Prepare(opts PrepareOptions) (int, error) {
	b, _ := json.Marshal(opts)
	v, err := e.callAsync("__prepareResources", string(b))
	if err != nil {
		return 0, err
	}
	return toInt(v), nil
}

// GenerateTf runs step 3 and returns the flat Terraform document.
func (e *Engine) GenerateTf() (string, error) {
	v, err := e.callAsync("__generateTf")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%v", v), nil
}

// GenerateProject runs step 4 and returns a path -> content map.
func (e *Engine) GenerateProject(env string) (map[string]string, error) {
	v, err := e.callAsync("__generateProject", env)
	if err != nil {
		return nil, err
	}
	var files map[string]string
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", v)), &files); err != nil {
		return nil, fmt.Errorf("decode project files: %w", err)
	}
	return files, nil
}

func toInt(v interface{}) int {
	switch t := v.(type) {
	case int64:
		return int(t)
	case int:
		return t
	case float64:
		return int(t)
	default:
		return 0
	}
}
