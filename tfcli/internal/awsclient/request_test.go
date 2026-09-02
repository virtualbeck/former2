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
	var gotAuth, gotTarget, gotSha string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotTarget = r.Header.Get("X-Amz-Target")
		gotSha = r.Header.Get("X-Amz-Content-Sha256")
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
	// S3 rejects requests without this header; it must be the body hash.
	// (SQS ListQueues marshals an empty JSON object body.)
	const emptyObjSha = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
	if gotSha != emptyObjSha {
		t.Fatalf("x-amz-content-sha256 = %q", gotSha)
	}
	if !strings.Contains(gotAuth, "x-amz-content-sha256") {
		t.Fatalf("content-sha256 not in SignedHeaders: %q", gotAuth)
	}
	if urls, ok := out["QueueUrls"].([]interface{}); !ok || len(urls) != 1 {
		t.Fatalf("out = %#v", out)
	}
	_ = aws.Credentials{}
}
