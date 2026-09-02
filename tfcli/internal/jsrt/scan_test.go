package jsrt

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/virtualbeck/former2/tfcli/internal/awsclient"
)

// A tiny fake AWS that answers just enough for the SQS scan path.
func fakeAWS(t *testing.T) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		target := r.Header.Get("X-Amz-Target")
		form := string(body)
		w.Header().Set("Content-Type", "application/x-amz-json-1.0")

		switch {
		case strings.Contains(target, "ListQueues"):
			io.WriteString(w, `{"QueueUrls":["https://sqs.us-east-1.amazonaws.com/123456789012/q1"]}`)
		case strings.Contains(target, "GetQueueAttributes"):
			io.WriteString(w, `{"Attributes":{"QueueArn":"arn:aws:sqs:us-east-1:123456789012:q1","VisibilityTimeout":"30"}}`)
		case strings.Contains(target, "GetResources") || strings.Contains(form, "GetResources"):
			io.WriteString(w, `{"ResourceTagMappingList":[]}`)
		case strings.Contains(target, "GetCallerIdentity") || strings.Contains(form, "GetCallerIdentity"):
			io.WriteString(w, `{"Account":"123456789012","Arn":"arn:aws:iam::123456789012:user/x","UserId":"AID"}`)
		default:
			io.WriteString(w, `{}`)
		}
	}))
}

func TestScanSQSOffline(t *testing.T) {
	srv := fakeAWS(t)
	defer srv.Close()

	client := awsclient.New(credentials.NewStaticCredentialsProvider("AKID", "SECRET", ""), "us-east-1")
	client.SetEndpointOverride(srv.URL)

	e, err := New(client, "us-east-1", testLogger{t}, true, 8)
	if err != nil {
		t.Fatal(err)
	}
	defer e.Close()

	n, err := e.Scan(ScanOptions{Services: []string{"SQS"}})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if n < 1 {
		t.Fatalf("expected at least one resource, got %d", n)
	}
	raw, _ := e.DumpRaw()
	if !strings.Contains(string(raw), "sqs.queue") {
		t.Fatalf("raw missing sqs.queue: %s", raw)
	}

	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatalf("prepare: %v", err)
	}
	tf, err := e.GenerateTf()
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if !strings.Contains(tf, `resource "aws_sqs_queue"`) {
		t.Fatalf("tf missing queue:\n%s", tf)
	}
}
