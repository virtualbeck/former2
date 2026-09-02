package awsclient

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

func mustOp(t *testing.T, class, method string) (*awsmodel.API, *awsmodel.Operation) {
	t.Helper()
	api, err := awsmodel.Load(class)
	if err != nil {
		t.Fatal(err)
	}
	op, ok := api.FindOperation(method)
	if !ok {
		t.Fatalf("no op %s.%s", class, method)
	}
	return api, op
}

func TestBuildJSONTarget(t *testing.T) {
	api, op := mustOp(t, "SQS", "listQueues")
	req, err := buildJSON(context.Background(), api, op, map[string]interface{}{"MaxResults": 10}, "https://sqs.us-east-1.amazonaws.com")
	if err != nil {
		t.Fatal(err)
	}
	if got := req.Header.Get("X-Amz-Target"); got != "AmazonSQS.ListQueues" {
		t.Fatalf("target = %q", got)
	}
	if !strings.HasPrefix(req.Header.Get("Content-Type"), "application/x-amz-json-") {
		t.Fatalf("content-type = %q", req.Header.Get("Content-Type"))
	}
	b, _ := io.ReadAll(req.Body)
	if !strings.Contains(string(b), `"MaxResults":10`) {
		t.Fatalf("body = %s", b)
	}
}

func TestBuildRESTJSONURI(t *testing.T) {
	// Lambda GetFunction: GET /2015-03-31/functions/{FunctionName}
	api, op := mustOp(t, "Lambda", "getFunction")
	req, err := buildRESTJSON(context.Background(), api, op, map[string]interface{}{"FunctionName": "my-fn"}, "https://lambda.us-east-1.amazonaws.com")
	if err != nil {
		t.Fatal(err)
	}
	if req.Method != http.MethodGet {
		t.Fatalf("method = %s", req.Method)
	}
	if !strings.Contains(req.URL.Path, "/functions/my-fn") {
		t.Fatalf("path = %s", req.URL.Path)
	}
}

func TestBuildQueryForm(t *testing.T) {
	// EC2 DescribeInstances with a filter
	api, op := mustOp(t, "EC2", "describeInstances")
	params := map[string]interface{}{
		"MaxResults": 5,
		"Filters": []interface{}{
			map[string]interface{}{"Name": "instance-state-name", "Values": []interface{}{"running"}},
		},
	}
	req, err := buildQuery(context.Background(), api, op, params, "https://ec2.us-east-1.amazonaws.com")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(req.Body)
	body := string(b)
	for _, want := range []string{"Action=DescribeInstances", "Version=2016-11-15", "MaxResults=5", "Filter.1.Name=instance-state-name", "Filter.1.Value.1=running"} {
		if !strings.Contains(body, want) {
			t.Fatalf("form missing %q:\n%s", want, body)
		}
	}
}

func TestCallEndToEndSigned(t *testing.T) {
	var gotAuth, gotTarget string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotTarget = r.Header.Get("X-Amz-Target")
		w.Header().Set("Content-Type", "application/x-amz-json-1.0")
		io.WriteString(w, `{"QueueUrls":["https://sqs.us-east-1.amazonaws.com/1/a"]}`)
	}))
	defer srv.Close()

	c := New(credentials.NewStaticCredentialsProvider("AKID", "SECRET", ""), "us-east-1")
	// point at the test server
	c.baseOverride = srv.URL

	out, err := c.Call(context.Background(), "SQS", "listQueues", nil, nil)
	if err != nil {
		t.Fatalf("call: %v", err)
	}
	if !strings.HasPrefix(gotAuth, "AWS4-HMAC-SHA256 Credential=AKID/") {
		t.Fatalf("authorization = %q", gotAuth)
	}
	if gotTarget != "AmazonSQS.ListQueues" {
		t.Fatalf("target = %q", gotTarget)
	}
	if urls, ok := out["QueueUrls"].([]interface{}); !ok || len(urls) != 1 {
		t.Fatalf("out = %#v", out)
	}
	_ = aws.Credentials{}
}
