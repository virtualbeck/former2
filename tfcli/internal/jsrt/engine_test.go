package jsrt

import (
	"fmt"
	"strings"
	"testing"
)

// TestCycleDetectionScalesPastFiveHundred: former2's circular-reference guard
// used to switch OFF entirely above 500 tracked resources, so two resources
// that reference each other (e.g. a pair of security groups that each allow
// the other) both got rewritten into `${...id}` refs - a dependency cycle
// `tofu validate` rejects. With the memoised detector it stays on.
func TestCycleDetectionScalesPastFiveHundred(t *testing.T) {
	if testing.Short() {
		t.Skip("generates 500+ resources; former2's correlation loop is ~O(n^2)")
	}
	e := newTestEngine(t)
	defer e.Close()

	var b strings.Builder
	b.WriteString("[")
	for i := 0; i < 505; i++ {
		fmt.Fprintf(&b, `{"f2id":"vpc-%04d","f2type":"ec2.vpc","f2region":"us-east-1","f2data":{"VpcId":"vpc-%04d","CidrBlock":"10.%d.%d.0/24","InstanceTenancy":"default"}},`,
			i, i, i/256, i%256)
	}
	b.WriteString(`{"f2id":"sg-aaaa","f2type":"ec2.securitygroup","f2region":"us-east-1","f2data":{"GroupId":"sg-aaaa","GroupName":"a","Description":"a","VpcId":"vpc-0000","IpPermissions":[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"UserIdGroupPairs":[{"GroupId":"sg-bbbb"}]}]}},`)
	b.WriteString(`{"f2id":"sg-bbbb","f2type":"ec2.securitygroup","f2region":"us-east-1","f2data":{"GroupId":"sg-bbbb","GroupName":"b","Description":"b","VpcId":"vpc-0000","IpPermissions":[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"UserIdGroupPairs":[{"GroupId":"sg-aaaa"}]}]}}]`)

	if _, err := e.LoadRaw([]byte(b.String())); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}
	tf, err := e.GenerateTf()
	if err != nil {
		t.Fatal(err)
	}

	a := tf[strings.Index(tf, `resource "aws_security_group" "EC2SecurityGroup" {`):]
	a = a[:strings.Index(a, "\n}\n")]
	sg2 := tf[strings.Index(tf, `resource "aws_security_group" "EC2SecurityGroup2" {`):]
	sg2 = sg2[:strings.Index(sg2, "\n}\n")]

	aRefs2 := strings.Contains(a, "aws_security_group.EC2SecurityGroup2.id")
	sg2Refs1 := strings.Contains(sg2, "aws_security_group.EC2SecurityGroup.id")
	if aRefs2 && sg2Refs1 {
		t.Fatalf("mutual references => cycle survived detection:\nA:\n%s\nB:\n%s", a, sg2)
	}
	if !aRefs2 && !sg2Refs1 {
		t.Fatalf("expected one direction of the reference to be wired:\nA:\n%s\nB:\n%s", a, sg2)
	}
}

type testLogger struct{ t *testing.T }

func (l testLogger) Debug(m string)         { l.t.Logf("debug: %s", m) }
func (l testLogger) Warn(m string)          { l.t.Logf("warn:  %s", m) }
func (l testLogger) Notify(a, b string)     { l.t.Logf("notify: %s | %s", a, b) }
func (l testLogger) Progress(done, tot int) {}

const rawSQS = `[{
  "f2id":"https://sqs.us-east-1.amazonaws.com/123456789012/myq",
  "f2type":"sqs.queue",
  "f2region":"us-east-1",
  "f2data":{
    "QueueUrl":"https://sqs.us-east-1.amazonaws.com/123456789012/myq",
    "Attributes":{
      "QueueArn":"arn:aws:sqs:us-east-1:123456789012:myq",
      "VisibilityTimeout":"30","DelaySeconds":"0",
      "MessageRetentionPeriod":"345600","MaximumMessageSize":"262144",
      "ReceiveMessageWaitTimeSeconds":"0"
    }
  }
}]`

func newTestEngine(t *testing.T) *Engine {
	t.Helper()
	e, err := New(nil, "us-east-1", testLogger{t}, true, 4)
	if err != nil {
		t.Fatalf("engine init: %v", err)
	}
	return e
}

const rawNetworked = `[
 {"f2id":"vpc-0aa11bb22","f2type":"ec2.vpc","f2region":"us-east-1","f2data":{"VpcId":"vpc-0aa11bb22","CidrBlock":"10.0.0.0/16","InstanceTenancy":"default","EnableDnsSupport":true,"EnableDnsHostnames":true,"Tags":[{"Key":"Name","Value":"main"}]}},
 {"f2id":"subnet-0a1","f2type":"ec2.subnet","f2region":"us-east-1","f2data":{"SubnetId":"subnet-0a1","VpcId":"vpc-0aa11bb22","CidrBlock":"10.0.1.0/24","AvailabilityZone":"us-east-1a","MapPublicIpOnLaunch":false,"Tags":[{"Key":"Name","Value":"app-a"}]}},
 {"f2id":"sg-0web","f2type":"ec2.securitygroup","f2region":"us-east-1","f2data":{"GroupId":"sg-0web","GroupName":"web","Description":"web sg","VpcId":"vpc-0aa11bb22","IpPermissions":[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]}],"Tags":[{"Key":"Name","Value":"web"}]}}
]`

func TestProjectCrossModuleWiring(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	if _, err := e.LoadRaw([]byte(rawNetworked)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}
	files, err := e.GenerateProject("prod", false, false)
	if err != nil {
		t.Fatalf("GenerateProject: %v", err)
	}
	sg := files["modules/security_groups/main.tf"]
	if !strings.Contains(sg, "vpc_id = var.network_EC2VPC_id") {
		t.Fatalf("SG vpc_id not wired to a module input:\n%s", sg)
	}
	net := files["modules/network/outputs.tf"]
	if !strings.Contains(net, `output "EC2VPC_id"`) {
		t.Fatalf("network module missing EC2VPC_id output:\n%s", net)
	}
	ws := files["workspaces/prod/main.tf"]
	if !strings.Contains(ws, "network_EC2VPC_id = module.network.EC2VPC_id") {
		t.Fatalf("workspace not wiring SG<-network:\n%s", ws)
	}
}

func TestGenerateImports(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	const rawIAM = `[{"f2id":"my-app-role","f2type":"iam.role","f2region":"us-east-1","f2data":{
	  "RoleName":"my-app-role","RoleId":"AROA","Arn":"arn:aws:iam::123456789012:role/my-app-role","Path":"/",
	  "AssumeRolePolicyDocument":"%7B%7D",
	  "AttachedPolicies":[{"PolicyName":"S3RO","PolicyArn":"arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"}]}}]`

	if _, err := e.LoadRaw([]byte(rawIAM)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}

	// flat
	imp, err := e.GenerateImports()
	if err != nil {
		t.Fatal(err)
	}
	if imp.Count != 2 {
		t.Fatalf("want 2 import blocks, got %d\n%s", imp.Count, imp.Content)
	}
	if !strings.Contains(imp.Content, `to = aws_iam_role.IAMRole`) ||
		!strings.Contains(imp.Content, `id = "my-app-role/arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"`) {
		t.Fatalf("flat imports wrong:\n%s", imp.Content)
	}

	// project layout: addresses must be module-qualified
	files, err := e.GenerateProject("prod", true, false)
	if err != nil {
		t.Fatal(err)
	}
	it := files["workspaces/prod/imports.tf"]
	if !strings.Contains(it, "to = module.iam.aws_iam_role.IAMRole") {
		t.Fatalf("project imports not module-qualified:\n%s", it)
	}
}

func TestBootstrap(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()
}

func TestGeneratePipelineOffline(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	n, err := e.LoadRaw([]byte(rawSQS))
	if err != nil || n != 1 {
		t.Fatalf("LoadRaw: n=%d err=%v", n, err)
	}
	m, err := e.Prepare(PrepareOptions{})
	if err != nil || m != 1 {
		t.Fatalf("Prepare: m=%d err=%v", m, err)
	}
	tf, err := e.GenerateTf()
	if err != nil {
		t.Fatalf("GenerateTf: %v", err)
	}
	if !strings.Contains(tf, `resource "aws_sqs_queue"`) {
		t.Fatalf("flat tf missing sqs queue:\n%s", tf)
	}
	t.Logf("flat tf:\n%s", tf)

	files, err := e.GenerateProject("dev", false, false)
	if err != nil {
		t.Fatalf("GenerateProject: %v", err)
	}
	var got []string
	for p := range files {
		got = append(got, p)
	}
	t.Logf("project files: %v", got)
	main, ok := files["modules/messaging/main.tf"]
	if !ok {
		t.Fatalf("expected modules/messaging/main.tf, got %v", got)
	}
	if !strings.Contains(main, "aws_sqs_queue") {
		t.Fatalf("messaging module missing queue:\n%s", main)
	}
	if _, ok := files["workspaces/dev/main.tf"]; !ok {
		t.Fatalf("missing workspace main.tf")
	}
}

// former2's mappers emitted HCL the AWS provider v5 rejects at `tofu validate`.
// Each case here is one class of that.
func TestProviderV5Hcl(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	const raw = `[
	 {"f2id":"al","f2type":"cloudwatch.alarm","f2region":"us-east-1","f2data":{"AlarmName":"a","AlarmArn":"arn:aws:cloudwatch:us-east-1:1:alarm:a","EvaluationPeriods":1,"Threshold":1,"ComparisonOperator":"GreaterThanThreshold","Dimensions":[{"Name":"InstanceId","Value":"i-1"}],"Metrics":[{"Id":"m1","MetricStat":{"Metric":{"MetricName":"N","Namespace":"NS","Dimensions":[{"Name":"D","Value":"v"}]},"Period":60,"Stat":"Sum"}}]}},
	 {"f2id":"as","f2type":"ssm.association","f2region":"us-east-1","f2data":{"Name":"AWS-Run","Parameters":{"Op":["Install"]}}},
	 {"f2id":"er","f2type":"eventbridge.rule","f2region":"us-east-1","f2data":{"Name":"r","Arn":"arn:aws:events:us-east-1:1:rule/r","EventPattern":"{}","Targets":[{"Id":"t","Arn":"arn:aws:lambda:us-east-1:1:function:f","InputTransformer":{"InputPathsMap":{"i":"$.d"},"InputTemplate":"\"x\""}}]}},
	 {"f2id":"b","f2type":"s3.bucket","f2region":"us-east-1","f2data":{"Name":"b","Tags":[{"Key":"k:1","Value":"v"}]}},
	 {"f2id":"ip","f2type":"iam.instanceprofile","f2region":"us-east-1","f2data":{"InstanceProfileName":"p","Path":"/","Roles":[{"Arn":"arn:aws:iam::1:role/r","RoleName":"r"}]}},
	 {"f2id":"bp","f2type":"backup.backupplan","f2region":"us-east-1","f2data":{"BackupPlanId":"x","BackupPlan":{"BackupPlanName":"n","Rules":[{"RuleName":"aws/efs/automatic-backup-rule","TargetBackupVaultName":"aws/efs/vault","ScheduleExpression":"cron(0 5 * * ? *)"}]}}},
	 {"f2id":"lr","f2type":"elbv2.loadbalancerlistenerrule","f2region":"us-east-1","f2data":{"RuleArn":"arn:aws:elasticloadbalancing:us-east-1:1:listener-rule/app/x/1/2/3","Priority":"1","ListenerArn":"arn:aws:elasticloadbalancing:us-east-1:1:listener/app/x/1/2","Conditions":[{"Field":"path-pattern","PathPatternConfig":{"Values":["/a/*"]}}],"Actions":[{"Type":"forward","TargetGroupArn":"arn:aws:elasticloadbalancing:us-east-1:1:targetgroup/t/a","ForwardConfig":{"TargetGroups":[{"TargetGroupArn":"arn:aws:elasticloadbalancing:us-east-1:1:targetgroup/t/a","Weight":1}],"TargetGroupStickinessConfig":{"Enabled":false}}}]}},
	 {"f2id":"acl","f2type":"waf.v2webacl","f2region":"us-east-1","f2data":{"Name":"w","Id":"i","ARN":"arn:aws:wafv2:us-east-1:1:regional/webacl/w/i","Scope":"REGIONAL","DefaultAction":{"Allow":{}},"VisibilityConfig":{"SampledRequestsEnabled":true,"CloudWatchMetricsEnabled":true,"MetricName":"w"},"Rules":[{"Name":"r","Priority":1,"Action":{"Block":{}},"VisibilityConfig":{"SampledRequestsEnabled":true,"CloudWatchMetricsEnabled":true,"MetricName":"r"},"Statement":{"ByteMatchStatement":{"SearchString":"x","FieldToMatch":{"SingleHeader":{"Name":"ua"}},"TextTransformations":[{"Priority":0,"Type":"NONE"}],"PositionalConstraint":"CONTAINS"}}}]}}
	]`
	if _, err := e.LoadRaw([]byte(raw)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}
	tf, err := e.GenerateTf()
	if err != nil {
		t.Fatal(err)
	}

	// GenerateTf output is not run through `tofu fmt`, so exact substrings hold.
	must := []string{
		"dimensions = {",                    // 1 metric alarm
		"parameters = {",                    // 2 ssm association
		"input_paths = {",                   // 3 event target
		"tags = {",                          // 4 s3 bucket
		`"k:1" = "v"`,                       // 4 non-ident tag key stays quoted
		"cloudwatch_metrics_enabled = true", // 5 wafv2 rename
		`role = "r"`,                        // 6 instance profile single role
		`rule_name = "aws_efs_automatic-backup-rule"`, // 8d backup sanitised
		`target_vault_name = "aws_efs_vault"`,         // 8d
		"target_group {",                              // 7 lb rule repeatable block
		"text_transformation {",                       // 8a wafv2 repeatable block
		"metric {",                                    // 8c metric_query nested metric block
		"metric_name = \"N\"",                         // 8c mapped, not raw MetricName
	}
	forbidden := []string{
		"dimensions {",
		"parameters {",
		"input_paths {",
		"cloud_watch_metrics_enabled",
		"roles = [",
		"target_group = [",
		"text_transformation = [",
		"Metric {", // raw PascalCase MetricStat leaking through
		"Period =",
	}
	for _, s := range must {
		if !strings.Contains(tf, s) {
			t.Errorf("expected %q in output:\n%s", s, tf)
		}
	}
	for _, s := range forbidden {
		if strings.Contains(tf, s) {
			t.Errorf("did not expect %q in output:\n%s", s, tf)
		}
	}
}

// An aws_s3_bucket and its aws_s3_bucket_* satellites all carry the bucket
// name as their Terraform id. former2 must not turn that into a two-way
// reference (bucket -> encryption config -> bucket), which `tofu validate`
// rejects as a cycle.
func TestS3BucketNoReferenceCycle(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	const raw = `[{"f2id":"my-bucket","f2type":"s3.bucket","f2region":"us-east-1","f2data":{
	  "Name":"my-bucket",
	  "Versioning":{"Status":"Enabled"},
	  "Encryption":{"ServerSideEncryptionConfiguration":{"Rules":[
	    {"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}}
	}}]`
	if _, err := e.LoadRaw([]byte(raw)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}

	files, err := e.GenerateProject("prod", false, false)
	if err != nil {
		t.Fatal(err)
	}
	s3 := files["modules/s3/main.tf"]
	if s3 == "" {
		t.Fatalf("no modules/s3/main.tf in %v", keysOf(files))
	}
	// satellite -> bucket dependency is fine and expected
	if !strings.Contains(s3, "bucket = aws_s3_bucket.S3Bucket.id") {
		t.Fatalf("SSE/versioning config not wired to the bucket:\n%s", s3)
	}
	// the bucket must NOT depend on any of its satellites
	bkt := s3[strings.Index(s3, `resource "aws_s3_bucket" "S3Bucket" {`):]
	bkt = bkt[:strings.Index(bkt, "\n}\n")]
	if strings.Contains(bkt, "aws_s3_bucket_") {
		t.Fatalf("aws_s3_bucket references a satellite (cycle):\n%s", bkt)
	}
}

func keysOf(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

func TestMultiRegionProviderAlignment(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	// two VPCs: one us-east-1 (primary), one us-west-2 (aliased).
	const raw = `[
 {"f2id":"vpc-east","f2type":"ec2.vpc","f2region":"us-east-1","f2data":{"VpcId":"vpc-east","CidrBlock":"10.0.0.0/16","InstanceTenancy":"default","Tags":[{"Key":"Name","Value":"east"}]}},
 {"f2id":"vpc-west","f2type":"ec2.vpc","f2region":"us-west-2","f2data":{"VpcId":"vpc-west","CidrBlock":"10.1.0.0/16","InstanceTenancy":"default","Tags":[{"Key":"Name","Value":"west"}]}}
]`
	if _, err := e.LoadRaw([]byte(raw)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}

	// flat
	tf, err := e.GenerateTf()
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(tf, `provider "aws" {`) || !strings.Contains(tf, `alias  = "us_west_2"`) {
		t.Fatalf("flat output missing aliased provider:\n%s", tf)
	}
	if !strings.Contains(tf, "provider = aws.us_west_2") {
		t.Fatalf("flat output: west resource not pinned to alias:\n%s", tf)
	}

	// project
	files, err := e.GenerateProject("prod", false, false)
	if err != nil {
		t.Fatal(err)
	}
	prov := files["workspaces/prod/provider.tf"]
	if !strings.Contains(prov, `alias  = "us_west_2"`) || !strings.Contains(prov, `region = "us-west-2"`) {
		t.Fatalf("workspace provider.tf missing us-west-2 alias:\n%s", prov)
	}
	modProv := files["modules/network/providers.tf"]
	if !strings.Contains(modProv, "configuration_aliases = [aws.us_west_2]") {
		t.Fatalf("network module missing configuration_aliases:\n%s", modProv)
	}
	wsMain := files["workspaces/prod/main.tf"]
	if !strings.Contains(wsMain, "aws.us_west_2 = aws.us_west_2") {
		t.Fatalf("workspace main.tf not passing the alias to the module:\n%s", wsMain)
	}
	netMain := files["modules/network/main.tf"]
	if !strings.Contains(netMain, "provider = aws.us_west_2") {
		t.Fatalf("network module: west VPC not pinned to alias:\n%s", netMain)
	}
	if strings.Count(netMain, "provider = aws.") != 1 {
		t.Fatalf("expected exactly one aliased resource in network module:\n%s", netMain)
	}
}

// AWS tag keys often contain ':' '/' '.' etc. Those must be emitted as
// quoted HCL attribute names or `tofu fmt`/`init` chokes with
// "Missing attribute separator".
func TestNonIdentifierTagKeysAreQuoted(t *testing.T) {
	e := newTestEngine(t)
	defer e.Close()

	const rawIAM = `[{"f2id":"my-app-role","f2type":"iam.role","f2region":"us-east-1","f2data":{
	  "RoleName":"my-app-role","RoleId":"AROA","Arn":"arn:aws:iam::123456789012:role/my-app-role","Path":"/",
	  "AssumeRolePolicyDocument":"%7B%7D",
	  "Tags":[{"Key":"Environment","Value":"ops"},{"Key":"IAC:ModulePath","Value":"environments/ops/cmdb"}]}}]`

	if _, err := e.LoadRaw([]byte(rawIAM)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Prepare(PrepareOptions{}); err != nil {
		t.Fatal(err)
	}
	tf, err := e.GenerateTf()
	if err != nil {
		t.Fatalf("GenerateTf: %v", err)
	}
	if !strings.Contains(tf, `"IAC:ModulePath" = "environments/ops/cmdb"`) {
		t.Fatalf("colon tag key not quoted:\n%s", tf)
	}
	if strings.Contains(tf, "\n        IAC:ModulePath ") {
		t.Fatalf("raw unquoted colon key still present:\n%s", tf)
	}
}
