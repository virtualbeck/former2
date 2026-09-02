package cli

import (
	"encoding/json"
	"testing"
)

func TestRowDedupKey(t *testing.T) {
	// A global resource seen in two regions: same type + id + data -> same key.
	east := json.RawMessage(`{"f2id":"role-a","f2type":"iam.role","f2region":"us-east-1","f2data":{"RoleName":"role-a","Arn":"arn:aws:iam::1:role/role-a"}}`)
	west := json.RawMessage(`{"f2id":"role-a","f2type":"iam.role","f2region":"us-west-2","f2data":{"RoleName":"role-a","Arn":"arn:aws:iam::1:role/role-a"}}`)
	if rowDedupKey(east) != rowDedupKey(west) {
		t.Fatal("identical global resource in two regions should share a dedup key")
	}

	// Key order in f2data must not matter.
	reordered := json.RawMessage(`{"f2id":"role-a","f2type":"iam.role","f2data":{"Arn":"arn:aws:iam::1:role/role-a","RoleName":"role-a"}}`)
	if rowDedupKey(east) != rowDedupKey(reordered) {
		t.Fatal("f2data key order should not affect the dedup key")
	}

	// A genuinely regional resource: region shows up in the ARN -> distinct keys.
	tblEast := json.RawMessage(`{"f2id":"t","f2type":"dynamodb.table","f2data":{"TableArn":"arn:aws:dynamodb:us-east-1:1:table/t"}}`)
	tblWest := json.RawMessage(`{"f2id":"t","f2type":"dynamodb.table","f2data":{"TableArn":"arn:aws:dynamodb:us-west-2:1:table/t"}}`)
	if rowDedupKey(tblEast) == rowDedupKey(tblWest) {
		t.Fatal("same-named tables in different regions must not be de-duplicated")
	}
}
