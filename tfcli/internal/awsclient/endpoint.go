package awsclient

import (
	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

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
	signRegion = region

	switch sdkClass {
	case "GlobalAccelerator":
		signRegion = "us-west-2"
	case "CostExplorer", "CUR", "Route53Domains":
		signRegion = "us-east-1"
	case "Organizations", "WAF", "Shield":
		signRegion = "us-east-1"
	}

	// Global services: a fixed hostname, signed against us-east-1 (or the
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
	case "Organizations":
		return "https://organizations.us-east-1.amazonaws.com", "us-east-1", "organizations"
	case "Shield":
		return "https://shield.us-east-1.amazonaws.com", "us-east-1", "shield"
	}

	if m.GlobalEndpoint != "" && region == "" {
		return "https://" + m.GlobalEndpoint, "us-east-1", signingName
	}

	if region == "" {
		region = "us-east-1"
		signRegion = "us-east-1"
	}

	host := prefix + "." + region + ".amazonaws.com"

	// S3: virtual-host style is avoided; regional path-style endpoint works for
	// the list/get operations former2 performs.
	if sdkClass == "S3" {
		host = "s3." + region + ".amazonaws.com"
	}

	return "https://" + host, signRegion, signingName
}
