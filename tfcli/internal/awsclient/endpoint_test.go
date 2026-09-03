package awsclient

import (
	"testing"

	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

func TestEndpointResolution(t *testing.T) {
	cases := []struct {
		class, region     string
		wantURL, wantSign string
	}{
		// standard regional service follows --region
		{"EC2", "us-west-1", "https://ec2.us-west-1.amazonaws.com", "us-west-1"},
		// fixed-hostname globals
		{"IAM", "us-west-1", "https://iam.amazonaws.com", "us-east-1"},
		{"CloudFront", "eu-west-1", "https://cloudfront.amazonaws.com", "us-east-1"},
		// single-region control planes ignore --region for host AND signing
		{"CUR", "us-west-1", "https://cur.us-east-1.amazonaws.com", "us-east-1"},
		{"GlobalAccelerator", "us-west-1", "https://globalaccelerator.us-west-2.amazonaws.com", "us-west-2"},
		{"NetworkManager", "eu-central-1", "https://networkmanager.us-west-2.amazonaws.com", "us-west-2"},
		{"Organizations", "ap-south-1", "https://organizations.us-east-1.amazonaws.com", "us-east-1"},
		// S3 path-style
		{"S3", "us-west-1", "https://s3.us-west-1.amazonaws.com", "us-west-1"},
	}
	for _, c := range cases {
		api, err := awsmodel.Load(c.class)
		if err != nil {
			t.Fatalf("load %s: %v", c.class, err)
		}
		gotURL, gotSign, _ := endpoint(c.class, api.Metadata, c.region)
		if gotURL != c.wantURL || gotSign != c.wantSign {
			t.Errorf("%s @ %s: got (%s, %s), want (%s, %s)",
				c.class, c.region, gotURL, gotSign, c.wantURL, c.wantSign)
		}
	}
}
