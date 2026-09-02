package tofu

import "testing"

const planFileJSON = `{
  "format_version": "1.2",
  "resource_changes": [
    {"address":"module.network.aws_vpc.EC2VPC","type":"aws_vpc","mode":"managed",
     "change":{"actions":["no-op"],"before":{"id":"vpc-1"},"after":{"id":"vpc-1"}}},
    {"address":"module.rds.aws_db_instance.RDSDBInstance","type":"aws_db_instance","mode":"managed",
     "change":{"actions":["update"],"before":{"storage_type":"gp2","allocated_storage":20},"after":{"storage_type":"gp3","allocated_storage":20}}},
    {"address":"module.sg.aws_security_group.Web","type":"aws_security_group","mode":"managed",
     "change":{"actions":["create"],"before":null,"after":{"name":"web"}}},
    {"address":"data.aws_region.current","type":"aws_region","mode":"data",
     "change":{"actions":["read"],"before":null,"after":{}}}
  ]
}`

func TestParsePlanFile(t *testing.T) {
	changes, err := Parse([]byte(planFileJSON))
	if err != nil {
		t.Fatal(err)
	}
	if len(changes) != 3 {
		t.Fatalf("want 3 managed changes (data skipped), got %d", len(changes))
	}
	byAddr := map[string]Change{}
	for _, c := range changes {
		byAddr[c.Address] = c
	}
	if !byAddr["module.network.aws_vpc.EC2VPC"].Noop() {
		t.Errorf("vpc should be no-op")
	}
	upd := byAddr["module.rds.aws_db_instance.RDSDBInstance"]
	if upd.Noop() {
		t.Errorf("db instance should not be no-op")
	}
	keys := upd.ChangedKeys()
	if len(keys) != 1 || keys[0] != "storage_type" {
		t.Errorf("want changed key [storage_type], got %v", keys)
	}
	if byAddr["module.sg.aws_security_group.Web"].Noop() {
		t.Errorf("sg create should not be no-op")
	}
}

const planStream = `{"@level":"info","type":"version"}
{"@level":"info","type":"planned_change","change":{"resource":{"addr":"aws_vpc.x","resource_type":"aws_vpc"},"action":"create"}}
{"@level":"info","type":"resource_drift","change":{"resource":{"addr":"aws_s3_bucket.y","resource_type":"aws_s3_bucket"},"action":"update"}}
{"@level":"info","type":"planned_change","change":{"resource":{"addr":"aws_sqs_queue.z","resource_type":"aws_sqs_queue"},"action":"noop"}}
{"@level":"info","type":"change_summary","changes":{"add":1,"change":0,"remove":0}}`

func TestParseStream(t *testing.T) {
	changes, err := Parse([]byte(planStream))
	if err != nil {
		t.Fatal(err)
	}
	if len(changes) != 3 {
		t.Fatalf("want 3 changes, got %d: %+v", len(changes), changes)
	}
	got := map[string][]string{}
	for _, c := range changes {
		got[c.Address] = c.Actions
	}
	if got["aws_vpc.x"][0] != "create" {
		t.Errorf("vpc action = %v", got["aws_vpc.x"])
	}
	if got["aws_sqs_queue.z"][0] != "no-op" {
		t.Errorf("noop should normalise to no-op, got %v", got["aws_sqs_queue.z"])
	}
}
