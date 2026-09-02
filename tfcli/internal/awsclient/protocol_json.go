package awsclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

func jsonContentType(m awsmodel.Metadata) string {
	v := m.JSONVersion
	if v == "" {
		v = "1.1"
	}
	return "application/x-amz-json-" + v
}

func buildJSON(ctx context.Context, api *awsmodel.API, op *awsmodel.Operation, params map[string]interface{}, baseURL string) (*http.Request, error) {
	body, err := json.Marshal(params)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", jsonContentType(api.Metadata))
	target := op.Name
	if api.Metadata.TargetPrefix != "" {
		target = api.Metadata.TargetPrefix + "." + op.Name
	}
	req.Header.Set("X-Amz-Target", target)
	return req, nil
}

// buildRESTJSON handles method+uri binding: uri / querystring / header members
// are pulled out, the rest form a JSON body (or the payload member is the body).
func buildRESTJSON(ctx context.Context, api *awsmodel.API, op *awsmodel.Operation, params map[string]interface{}, baseURL string) (*http.Request, error) {
	method := op.HTTP.Method
	if method == "" {
		method = http.MethodPost
	}
	rawURI := op.HTTP.RequestURI
	if rawURI == "" {
		rawURI = "/"
	}

	path := rawURI
	query := url.Values{}
	if i := strings.IndexByte(rawURI, '?'); i >= 0 {
		path = rawURI[:i]
		for _, kv := range strings.Split(rawURI[i+1:], "&") {
			if kv == "" {
				continue
			}
			p := strings.SplitN(kv, "=", 2)
			if len(p) == 2 {
				query.Set(p[0], p[1])
			} else {
				query.Set(p[0], "")
			}
		}
	}

	headers := http.Header{}
	input := api.Deref(op.Input)
	bodyMembers := map[string]interface{}{}
	var payloadName string
	if input != nil {
		payloadName = input.Payload
	}

	for name, val := range params {
		var mShape *awsmodel.Shape
		if input != nil {
			if ms, ok := api.Member(input, name); ok {
				mShape = ms
			}
		}
		loc := ""
		locName := name
		if mShape != nil {
			loc = mShape.Location
			if mShape.LocationName != "" {
				locName = mShape.LocationName
			}
		}
		switch loc {
		case "uri":
			ph := "{" + locName + "}"
			phGreedy := "{" + locName + "+}"
			sv := toStr(val)
			if strings.Contains(path, phGreedy) {
				path = strings.ReplaceAll(path, phGreedy, greedyEscape(sv))
			} else {
				path = strings.ReplaceAll(path, ph, url.PathEscape(sv))
			}
		case "querystring":
			addQuery(query, locName, val)
		case "header":
			headers.Set(locName, toStr(val))
		case "headers":
			if mm, ok := val.(map[string]interface{}); ok {
				for hk, hv := range mm {
					headers.Set(locName+hk, toStr(hv))
				}
			}
		default:
			if name == payloadName {
				bodyMembers = nil
				payloadName = name
			}
			if bodyMembers != nil {
				bodyMembers[name] = val
			}
		}
	}

	// strip any unresolved path placeholders
	path = stripPlaceholders(path)

	u := baseURL + path
	if enc := query.Encode(); enc != "" {
		u += "?" + enc
	}

	var bodyReader *bytes.Reader
	setJSON := false
	if payloadName != "" {
		if pv, ok := params[payloadName]; ok {
			switch t := pv.(type) {
			case string:
				bodyReader = bytes.NewReader([]byte(t))
			default:
				b, _ := json.Marshal(pv)
				bodyReader = bytes.NewReader(b)
				setJSON = true
			}
		}
	} else if len(bodyMembers) > 0 {
		b, err := json.Marshal(bodyMembers)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
		setJSON = true
	}

	var req *http.Request
	var err error
	if bodyReader != nil {
		req, err = http.NewRequestWithContext(ctx, method, u, bodyReader)
	} else {
		req, err = http.NewRequestWithContext(ctx, method, u, nil)
	}
	if err != nil {
		return nil, err
	}
	for k, vs := range headers {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	if setJSON {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

func decodeJSON(api *awsmodel.API, op *awsmodel.Operation, body []byte, hdr http.Header) (map[string]interface{}, error) {
	out := map[string]interface{}{}
	trimmed := bytes.TrimSpace(body)
	if len(trimmed) > 0 {
		if trimmed[0] == '{' {
			if err := json.Unmarshal(trimmed, &out); err != nil {
				return nil, fmt.Errorf("decode json response: %w", err)
			}
		} else {
			// non-object payload (rare); expose under a payload member if named
			if o := api.Deref(op.Output); o != nil && o.Payload != "" {
				out[o.Payload] = string(trimmed)
			}
		}
	}
	// merge simple header-bound outputs
	if o := api.Deref(op.Output); o != nil {
		for name, rawM := range o.Members {
			m := api.Deref(rawM)
			if m == nil || m.Location != "header" {
				continue
			}
			ln := name
			if rawM.LocationName != "" {
				ln = rawM.LocationName
			}
			if hv := hdr.Get(ln); hv != "" {
				out[name] = hv
			}
		}
	}
	return out, nil
}

func addQuery(q url.Values, key string, val interface{}) {
	switch t := val.(type) {
	case []interface{}:
		for _, e := range t {
			q.Add(key, toStr(e))
		}
	default:
		q.Set(key, toStr(val))
	}
}

func toStr(v interface{}) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprintf("%v", t)
	case int64:
		return fmt.Sprintf("%d", t)
	case int:
		return fmt.Sprintf("%d", t)
	default:
		return fmt.Sprintf("%v", t)
	}
}

func greedyEscape(s string) string {
	parts := strings.Split(s, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return strings.Join(parts, "/")
}

func stripPlaceholders(path string) string {
	for {
		i := strings.IndexByte(path, '{')
		if i < 0 {
			return path
		}
		j := strings.IndexByte(path[i:], '}')
		if j < 0 {
			return path
		}
		path = path[:i] + path[i+j+1:]
	}
}
