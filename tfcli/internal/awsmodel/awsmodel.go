// Package awsmodel loads the compact aws-sdk-js API models (apis/*.min.json)
// that were vendored into tfcli/assets/apis by scripts/sync-assets.js.
//
// Only the parts of the model the scanner needs are represented: operation
// http bindings, and enough shape metadata (type, members, list/map element
// shapes, locationName, flattening, payload/location bindings) to marshal a
// request and unmarshal an XML or JSON response.
package awsmodel

import (
	"embed"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
)

//go:embed apis/metadata.json apis/manifest.json apis/*.min.json
var assets embed.FS

// Metadata is the service-level model header.
type Metadata struct {
	APIVersion       string `json:"apiVersion"`
	EndpointPrefix   string `json:"endpointPrefix"`
	SigningName      string `json:"signingName"`
	GlobalEndpoint   string `json:"globalEndpoint"`
	Protocol         string `json:"protocol"`
	JSONVersion      string `json:"jsonVersion"`
	TargetPrefix     string `json:"targetPrefix"`
	SignatureVersion string `json:"signatureVersion"`
	XMLNamespace     string `json:"xmlNamespace"`
	ServiceID        string `json:"serviceId"`
	UID              string `json:"uid"`
}

// HTTP is an operation's http binding (rest-* and used loosely elsewhere).
type HTTP struct {
	Method       string `json:"method"`
	RequestURI   string `json:"requestUri"`
	ResponseCode int    `json:"responseCode"`
}

// Operation is a single API call.
type Operation struct {
	Name   string `json:"-"`
	HTTP   HTTP   `json:"http"`
	Input  *Shape `json:"input"`
	Output *Shape `json:"output"`
}

// Shape is a node in the type graph. A member reference like {"shape":"S3"}
// is stored with ShapeRef set; call API.Deref to get the resolved shape while
// preserving local overrides (locationName, flattened, ...).
type Shape struct {
	ShapeRef string `json:"shape"`

	Type      string            `json:"type"`
	Members   map[string]*Shape `json:"members"`
	Member    *Shape            `json:"member"`
	Key       *Shape            `json:"key"`
	Value     *Shape            `json:"value"`
	Flattened bool              `json:"flattened"`

	LocationName string `json:"locationName"`
	Location     string `json:"location"` // uri | querystring | header | headers | statusCode
	Payload      string `json:"payload"`
	Streaming    bool   `json:"streaming"`

	ResultWrapper  string `json:"resultWrapper"`
	TimestampFmt   string `json:"timestampFormat"`
	QueryName      string `json:"queryName"`
	XMLNamespace   json.RawMessage `json:"xmlNamespace"`
	Required       []string        `json:"required"`
}

// API is a fully parsed service model.
type API struct {
	Metadata   Metadata              `json:"metadata"`
	Operations map[string]*Operation `json:"operations"`
	Shapes     map[string]*Shape     `json:"shapes"`
}

// EffType returns the shape's type, defaulting bare {} to "string".
func (s *Shape) EffType() string {
	if s == nil {
		return "string"
	}
	if s.Type == "" {
		return "string"
	}
	return s.Type
}

// Deref resolves a shape reference against the API's shape table, layering any
// local overrides on the referenced shape. The returned shape is safe to read
// but must not be mutated.
func (a *API) Deref(s *Shape) *Shape {
	if s == nil || s.ShapeRef == "" {
		return s
	}
	base := a.Shapes[s.ShapeRef]
	if base == nil {
		return s
	}
	out := *base
	if s.LocationName != "" {
		out.LocationName = s.LocationName
	}
	if s.Location != "" {
		out.Location = s.Location
	}
	if s.Flattened {
		out.Flattened = true
	}
	if s.ResultWrapper != "" {
		out.ResultWrapper = s.ResultWrapper
	}
	if s.QueryName != "" {
		out.QueryName = s.QueryName
	}
	return &out
}

// Member looks up a struct member by its model name, returning the (deref'd)
// shape and true if present.
func (a *API) Member(structShape *Shape, name string) (*Shape, bool) {
	st := a.Deref(structShape)
	if st == nil || st.Members == nil {
		return nil, false
	}
	m, ok := st.Members[name]
	if !ok {
		return nil, false
	}
	return a.Deref(m), true
}

var (
	mu       sync.Mutex
	loaded   = map[string]*API{}
	manifest map[string]string // sdk class name -> model filename
	meta     map[string]metaEntry
)

type metaEntry struct {
	Name   string `json:"name"`
	Prefix string `json:"prefix"`
}

func bootstrap() error {
	if manifest != nil {
		return nil
	}
	mb, err := assets.ReadFile("apis/manifest.json")
	if err != nil {
		return err
	}
	if err := json.Unmarshal(mb, &manifest); err != nil {
		return err
	}
	xb, err := assets.ReadFile("apis/metadata.json")
	if err != nil {
		return err
	}
	raw := map[string]metaEntry{}
	if err := json.Unmarshal(xb, &raw); err != nil {
		return err
	}
	meta = map[string]metaEntry{}
	for k, v := range raw {
		key := v.Name
		if key == "" {
			key = k
		}
		meta[strings.ToLower(key)] = v
	}
	return nil
}

// Load returns the model for an aws-sdk-js client class name (e.g. "EC2",
// "ELBv2", "CloudWatchLogs"). Models are parsed once and cached.
func Load(sdkClassName string) (*API, error) {
	mu.Lock()
	defer mu.Unlock()
	if err := bootstrap(); err != nil {
		return nil, err
	}
	if a, ok := loaded[sdkClassName]; ok {
		return a, nil
	}
	file := manifest[sdkClassName]
	if file == "" {
		return nil, fmt.Errorf("no vendored API model for %q", sdkClassName)
	}
	b, err := assets.ReadFile("apis/" + file)
	if err != nil {
		return nil, err
	}
	var a API
	if err := json.Unmarshal(b, &a); err != nil {
		return nil, fmt.Errorf("parse %s: %w", file, err)
	}
	for name, op := range a.Operations {
		op.Name = name
	}
	loaded[sdkClassName] = &a
	return &a, nil
}

// FindOperation resolves an operation by the method name former2 passes to
// sdkcall (lowerCamelCase, e.g. "describeVpcs"). AWS operation names are
// UpperCamelCase.
func (a *API) FindOperation(method string) (*Operation, bool) {
	if op, ok := a.Operations[method]; ok {
		return op, true
	}
	up := strings.ToUpper(method[:1]) + method[1:]
	if op, ok := a.Operations[up]; ok {
		return op, true
	}
	// case-insensitive fallback
	for name, op := range a.Operations {
		if strings.EqualFold(name, method) {
			return op, true
		}
	}
	return nil, false
}
