package awsclient

import (
	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

// pinnedRegion lists services whose (control-plane) endpoint lives in exactly
// one region no matter which region the user is scanning. For these we must
// pin BOTH the hostname and the SigV4 signing region there — otherwise a scan
// of, say, us-west-1 builds cur.us-west-1.amazonaws.com, which does not exist,
// and the resources are silently missed.
//
// former2's own datatables.js does this for GlobalAccelerator and CostExplorer
// via serviceoptions.region; the rest are equally global.
var pinnedRegion = map[string]string{
	"GlobalAccelerator":            "us-west-2",
	"NetworkManager":               "us-west-2",
	"Route53RecoveryControlConfig": "us-west-2",
	"Route53RecoveryReadiness":     "us-west-2",
	"CostExplorer":                 "us-east-1",
	"CUR":                          "us-east-1",
	"Route53Domains":               "us-east-1",
	"Organizations":                "us-east-1",
	"Shield":                       "us-east-1",
}

// endpoint returns the base URL and the region to use for SigV4 signing.
//
// former2's sdkcall applies a few hard region overrides; global services sign
// against us-east-1. Everything else is the standard regional endpoint.
func endpoint(sdkClass string, m awsmodel.Metadata, region string) (baseURL, signRegion, signingName string) {
	prefix := m.EndpointPrefix
	signingName = m.SigningName
	if signingName == "" {
		signingName = prefix
	}

	// Global services: a single fixed hostname, signed against us-east-1 (the
	// partition-global pseudo-region, which us-east-1 satisfies for aws).
	switch sdkClass {
	case "IAM":
		return "https://iam.amazonaws.com", "us-east-1", "iam"
	case "Route53":
		return "https://route53.amazonaws.com", "us-east-1", "route53"
	case "CloudFront":
		return "https://cloudfront.amazonaws.com", "us-east-1", "cloudfront"
	case "WAF":
		return "https://waf.amazonaws.com", "us-east-1", "waf"
	}

	// Single-region control planes: ignore the scan region entirely.
	if pin, ok := pinnedRegion[sdkClass]; ok {
		region = pin
	}

	if region == "" {
		region = "us-east-1"
	}
	signRegion = region

	host := prefix + "." + region + ".amazonaws.com"

	// S3: virtual-host style is avoided; regional path-style endpoint works for
	// the list/get operations former2 performs.
	if sdkClass == "S3" {
		host = "s3." + region + ".amazonaws.com"
	}

	return "https://" + host, signRegion, signingName
}
