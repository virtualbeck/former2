package awsclient

import (
	"reflect"
	"testing"

	"github.com/virtualbeck/former2/tfcli/internal/awsmodel"
)

func decodeFixture(t *testing.T, sdkClass, method string, body []byte) map[string]interface{} {
	t.Helper()
	api, err := awsmodel.Load(sdkClass)
	if err != nil {
		t.Fatalf("load %s: %v", sdkClass, err)
	}
	op, ok := api.FindOperation(method)
	if !ok {
		t.Fatalf("%s: no operation %s", sdkClass, method)
	}
	var out map[string]interface{}
	switch api.Metadata.Protocol {
	case "json", "rest-json":
		out, err = decodeJSON(api, op, body, nil)
	default:
		out, err = decodeXML(api, op, body)
	}
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	return out
}

func TestDecodeEC2DescribeVpcs(t *testing.T) {
	body := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<DescribeVpcsResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/">
  <requestId>abc</requestId>
  <vpcSet>
    <item>
      <vpcId>vpc-11112222</vpcId>
      <state>available</state>
      <cidrBlock>10.0.0.0/16</cidrBlock>
      <isDefault>false</isDefault>
      <tagSet>
        <item><key>Name</key><value>main</value></item>
      </tagSet>
    </item>
    <item>
      <vpcId>vpc-33334444</vpcId>
      <state>available</state>
      <cidrBlock>172.16.0.0/16</cidrBlock>
      <isDefault>true</isDefault>
    </item>
  </vpcSet>
</DescribeVpcsResponse>`)
	out := decodeFixture(t, "EC2", "describeVpcs", body)
	vpcs, ok := out["Vpcs"].([]interface{})
	if !ok || len(vpcs) != 2 {
		t.Fatalf("want 2 vpcs, got %#v", out["Vpcs"])
	}
	v0 := vpcs[0].(map[string]interface{})
	if v0["VpcId"] != "vpc-11112222" || v0["CidrBlock"] != "10.0.0.0/16" {
		t.Fatalf("vpc0 wrong: %#v", v0)
	}
	if v0["IsDefault"] != false {
		t.Fatalf("IsDefault should be bool false, got %#v", v0["IsDefault"])
	}
	tags, ok := v0["Tags"].([]interface{})
	if !ok || len(tags) != 1 || tags[0].(map[string]interface{})["Key"] != "Name" {
		t.Fatalf("tags wrong: %#v", v0["Tags"])
	}
	if vpcs[1].(map[string]interface{})["IsDefault"] != true {
		t.Fatalf("vpc1 IsDefault should be true")
	}
}

func TestDecodeIAMListRoles(t *testing.T) {
	body := []byte(`<ListRolesResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
  <ListRolesResult>
    <IsTruncated>false</IsTruncated>
    <Roles>
      <member>
        <Path>/</Path>
        <RoleName>admin</RoleName>
        <RoleId>AROA1111</RoleId>
        <Arn>arn:aws:iam::123456789012:role/admin</Arn>
      </member>
      <member>
        <Path>/svc/</Path>
        <RoleName>worker</RoleName>
        <RoleId>AROA2222</RoleId>
        <Arn>arn:aws:iam::123456789012:role/svc/worker</Arn>
      </member>
    </Roles>
  </ListRolesResult>
</ListRolesResponse>`)
	out := decodeFixture(t, "IAM", "listRoles", body)
	roles, ok := out["Roles"].([]interface{})
	if !ok || len(roles) != 2 {
		t.Fatalf("want 2 roles, got %#v", out["Roles"])
	}
	if roles[0].(map[string]interface{})["RoleName"] != "admin" {
		t.Fatalf("role0 wrong: %#v", roles[0])
	}
	if out["IsTruncated"] != false {
		t.Fatalf("IsTruncated should be bool false, got %#v", out["IsTruncated"])
	}
}

func TestDecodeS3ListBuckets(t *testing.T) {
	body := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Owner><ID>abcd</ID><DisplayName>me</DisplayName></Owner>
  <Buckets>
    <Bucket><Name>my-logs</Name><CreationDate>2020-01-01T00:00:00.000Z</CreationDate></Bucket>
    <Bucket><Name>my-data</Name><CreationDate>2021-06-01T00:00:00.000Z</CreationDate></Bucket>
  </Buckets>
</ListAllMyBucketsResult>`)
	out := decodeFixture(t, "S3", "listBuckets", body)
	buckets, ok := out["Buckets"].([]interface{})
	if !ok || len(buckets) != 2 {
		t.Fatalf("want 2 buckets, got %#v", out["Buckets"])
	}
	if buckets[0].(map[string]interface{})["Name"] != "my-logs" {
		t.Fatalf("bucket0 wrong: %#v", buckets[0])
	}
	owner, ok := out["Owner"].(map[string]interface{})
	if !ok || owner["DisplayName"] != "me" {
		t.Fatalf("owner wrong: %#v", out["Owner"])
	}
}

func TestDecodeJSONPassthrough(t *testing.T) {
	// json / rest-json responses are already the right shape
	body := []byte(`{"QueueUrls":["https://sqs.us-east-1.amazonaws.com/1/a","https://sqs.us-east-1.amazonaws.com/1/b"]}`)
	out := decodeFixture(t, "SQS", "listQueues", body)
	urls, ok := out["QueueUrls"].([]interface{})
	if !ok || len(urls) != 2 {
		t.Fatalf("want 2 urls, got %#v", out)
	}
}

func TestModelProtocolsResolve(t *testing.T) {
	// every service former2 scans must have a loadable model with a known protocol
	for _, class := range []string{"EC2", "IAM", "S3", "Route53", "RDS", "Lambda", "ECS", "DynamoDB", "SQS", "SNS", "ELBv2", "CloudFront", "AutoScaling", "KMS"} {
		api, err := awsmodel.Load(class)
		if err != nil {
			t.Errorf("%s: %v", class, err)
			continue
		}
		switch api.Metadata.Protocol {
		case "json", "rest-json", "query", "ec2", "rest-xml":
		default:
			t.Errorf("%s: unexpected protocol %q", class, api.Metadata.Protocol)
		}
		_ = reflect.TypeOf(api)
	}
}
