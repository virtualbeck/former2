// Package awsclient is a small, model-driven AWS client. It reads the vendored
// aws-sdk-js API models and can issue any operation former2's scanner asks for
// via a single generic entrypoint, returning a loosely-typed map that matches
// what the browser SDK would have produced.
//
// It deliberately implements only what read-only discovery needs: request
// marshalling for the json / rest-json / query / ec2 / rest-xml protocols
// (inputs are almost always scalars, id lists or EC2 filters), SigV4 signing,
// and shape-guided response decoding. Pagination, ret/backoff and error
// classification stay in the JavaScript sdkcall() wrapper.
package awsclient

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

// APIError carries an AWS error code so the JS wrapper can classify throttling
// and access-denied the same way it does for the browser SDK.
type APIError struct {
	Code       string
	Message    string
	StatusCode int
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return e.Code + ": " + e.Message
	}
	return e.Code
}

// Client issues generic AWS calls.
type Client struct {
	creds      aws.CredentialsProvider
	region     string
	httpClient *http.Client
	signer     *v4.Signer
	ua         string

	// baseOverride, when set, replaces the resolved endpoint host (tests).
	baseOverride string
}

// New builds a Client from ambient AWS config (shared config, env, SSO, IMDS).
func New(creds aws.CredentialsProvider, region string) *Client {
	return &Client{
		creds:      creds,
		region:     region,
		httpClient: &http.Client{Timeout: 60 * time.Second},
		signer:     v4.NewSigner(),
		ua:         "former2-tfcli/0.1",
	}
}

// SetEndpointOverride forces every request to a fixed base URL. Intended for
// tests that replay canned AWS responses.
func (c *Client) SetEndpointOverride(u string) { c.baseOverride = u }

// Call issues one request for aws-sdk-js class `sdkClass` (e.g. "EC2"),
// operation `method` (lowerCamel, e.g. "describeVpcs"), with `params` keyed by
// model member name. `serviceOpts` is former2's serviceoptions object; only a
// `region` override is honoured.
func (c *Client) Call(ctx context.Context, sdkClass, method string, params map[string]interface{}, serviceOpts map[string]interface{}) (map[string]interface{}, error) {
	api, err := awsmodel.Load(sdkClass)
	if err != nil {
		return nil, err
	}
	op, ok := api.FindOperation(method)
	if !ok {
		return nil, fmt.Errorf("%s: unknown operation %q", sdkClass, method)
	}
	if params == nil {
		params = map[string]interface{}{}
	}

	region := c.region
	if serviceOpts != nil {
		if r, ok := serviceOpts["region"].(string); ok && r != "" {
			region = r
		}
	}
	baseURL, signRegion, signingName := endpoint(sdkClass, api.Metadata, region)
	if c.baseOverride != "" {
		baseURL = c.baseOverride
	}

	var req *http.Request
	switch api.Metadata.Protocol {
	case "json":
		req, err = buildJSON(ctx, api, op, params, baseURL)
	case "rest-json":
		req, err = buildRESTJSON(ctx, api, op, params, baseURL)
	case "query", "ec2":
		req, err = buildQuery(ctx, api, op, params, baseURL)
	case "rest-xml":
		req, err = buildRESTXML(ctx, api, op, params, baseURL)
	default:
		return nil, fmt.Errorf("%s: unsupported protocol %q", sdkClass, api.Metadata.Protocol)
	}
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", c.ua)

	// sign
	var bodyBytes []byte
	if req.Body != nil {
		bodyBytes, _ = io.ReadAll(req.Body)
		req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
		req.ContentLength = int64(len(bodyBytes))
	}
	sum := sha256.Sum256(bodyBytes)
	payloadHash := hex.EncodeToString(sum[:])

	creds, err := c.creds.Retrieve(ctx)
	if err != nil {
		return nil, fmt.Errorf("credentials: %w", err)
	}
	if err := c.signer.SignHTTP(ctx, creds, req, payloadHash, signingName, signRegion, time.Now()); err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}
	if bodyBytes != nil {
		req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		return nil, parseError(resp.StatusCode, resp.Header, respBody, api.Metadata.Protocol)
	}

	switch api.Metadata.Protocol {
	case "json", "rest-json":
		return decodeJSON(api, op, respBody, resp.Header)
	default:
		return decodeXML(api, op, respBody)
	}
}

func parseError(status int, hdr http.Header, body []byte, protocol string) error {
	e := &APIError{StatusCode: status, Code: fmt.Sprintf("HTTP%d", status)}
	trimmed := bytes.TrimSpace(body)
	if len(trimmed) > 0 && trimmed[0] == '{' {
		var m map[string]interface{}
		if json.Unmarshal(trimmed, &m) == nil {
			if v, ok := stringField(m, "__type", "code", "Code"); ok {
				e.Code = lastSegment(v)
			}
			if v, ok := stringField(m, "message", "Message"); ok {
				e.Message = v
			}
		}
		if t := hdr.Get("x-amzn-ErrorType"); t != "" {
			e.Code = lastSegment(strings.SplitN(t, ":", 2)[0])
		}
		return e
	}
	// XML error: <ErrorResponse><Error><Code>..</Code><Message>..</Message>
	if root, err := parseXML(trimmed); err == nil && root != nil {
		errNode := root.child("Error")
		if errNode == nil && root.Name == "Error" {
			errNode = root
		}
		if errNode != nil {
			if c := errNode.child("Code"); c != nil {
				e.Code = c.trimmedText()
			}
			if m := errNode.child("Message"); m != nil {
				e.Message = m.trimmedText()
			}
		}
	}
	return e
}

func stringField(m map[string]interface{}, keys ...string) (string, bool) {
	for _, k := range keys {
		if v, ok := m[k].(string); ok && v != "" {
			return v, true
		}
	}
	return "", false
}

func lastSegment(s string) string {
	if i := strings.LastIndexAny(s, "#/"); i >= 0 {
		return s[i+1:]
	}
	return s
}
