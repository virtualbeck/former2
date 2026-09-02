package awsclient

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

// buildQuery marshals the AWS `query` and `ec2` protocols (form-encoded POST).
// former2's scan inputs are scalars, scalar lists and EC2 filter structures;
// deeper structures are handled generically but have not all been exercised.
func buildQuery(ctx context.Context, api *awsmodel.API, op *awsmodel.Operation, params map[string]interface{}, baseURL string) (*http.Request, error) {
	ec2 := api.Metadata.Protocol == "ec2"
	form := url.Values{}
	form.Set("Action", op.Name)
	form.Set("Version", api.Metadata.APIVersion)

	input := api.Deref(op.Input)
	for name, val := range params {
		var mShape *awsmodel.Shape
		key := name
		if input != nil {
			if ms, ok := api.Member(input, name); ok {
				mShape = ms
				if ec2 {
					if q := queryMemberName(name, ms); q != "" {
						key = q
					}
				} else if ms.LocationName != "" {
					key = ms.LocationName
				}
			}
		}
		encodeQueryParam(form, key, val, mShape, api, ec2)
	}

	body := form.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/", strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=utf-8")
	return req, nil
}

func queryMemberName(name string, s *awsmodel.Shape) string {
	if s.QueryName != "" {
		return s.QueryName
	}
	if s.LocationName != "" {
		// ec2 capitalises the first letter of locationName
		return strings.ToUpper(s.LocationName[:1]) + s.LocationName[1:]
	}
	return name
}

func encodeQueryParam(form url.Values, prefix string, val interface{}, shape *awsmodel.Shape, api *awsmodel.API, ec2 bool) {
	if shape != nil {
		shape = api.Deref(shape)
	}
	switch v := val.(type) {
	case []interface{}:
		flattened := shape != nil && (shape.Flattened || ec2)
		memberShape := (*awsmodel.Shape)(nil)
		memberTag := "member"
		if shape != nil && shape.Member != nil {
			memberShape = api.Deref(shape.Member)
			if shape.Member.LocationName != "" {
				memberTag = shape.Member.LocationName
			}
		}
		for i, e := range v {
			var key string
			if flattened {
				key = prefix + "." + strconv.Itoa(i+1)
			} else {
				key = prefix + "." + memberTag + "." + strconv.Itoa(i+1)
			}
			encodeQueryParam(form, key, e, memberShape, api, ec2)
		}
	case map[string]interface{}:
		for k, e := range v {
			var childShape *awsmodel.Shape
			childKey := k
			if shape != nil && shape.Members != nil {
				if cs, ok := shape.Members[k]; ok {
					childShape = api.Deref(cs)
					if ec2 {
						childKey = queryMemberName(k, cs)
					} else if cs.LocationName != "" {
						childKey = cs.LocationName
					}
				}
			}
			encodeQueryParam(form, prefix+"."+childKey, e, childShape, api, ec2)
		}
	default:
		form.Set(prefix, toStr(val))
	}
}

// buildRESTXML covers S3 / Route53 / S3Control. former2's discovery calls bind
// their inputs to the uri / querystring / headers; request bodies (rare for
// reads) are not marshalled.
func buildRESTXML(ctx context.Context, api *awsmodel.API, op *awsmodel.Operation, params map[string]interface{}, baseURL string) (*http.Request, error) {
	// identical binding rules to rest-json minus the JSON body
	req, err := buildRESTJSON(ctx, api, op, params, baseURL)
	if err != nil {
		return nil, err
	}
	req.Header.Del("Content-Type")
	return req, nil
}
