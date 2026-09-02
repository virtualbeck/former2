// Package tofu shells out to OpenTofu (or Terraform) and parses plan output
// so the CLI can report how far an adopted repo is from "no changes".
package tofu

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Bin locates the tofu binary, falling back to terraform. An explicit override
// wins.
func Bin(override string) (string, error) {
	cands := []string{override, "tofu", "terraform"}
	for _, c := range cands {
		if c == "" {
			continue
		}
		if p, err := exec.LookPath(c); err == nil {
			return p, nil
		}
	}
	return "", fmt.Errorf("neither `tofu` nor `terraform` found on PATH (set --tofu)")
}

// Run executes `<bin> <args...>` in dir, streaming stderr, returning stdout.
func Run(ctx context.Context, bin, dir string, quiet bool, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Dir = dir
	var out bytes.Buffer
	cmd.Stdout = &out
	if quiet {
		cmd.Stderr = &bytes.Buffer{}
	} else {
		cmd.Stderr = os.Stderr
	}
	err := cmd.Run()
	return out.Bytes(), err
}

// Change is one resource's planned action.
type Change struct {
	Address string
	Type    string
	Actions []string // e.g. ["no-op"], ["update"], ["create"], ["delete"], ["create","delete"]
	// Before/After are populated only from a plan-file (`show -json`), not the
	// message stream.
	Before map[string]interface{}
	After  map[string]interface{}
}

// Noop reports whether the change requires nothing.
func (c Change) Noop() bool {
	if len(c.Actions) == 0 {
		return true
	}
	for _, a := range c.Actions {
		if a != "no-op" && a != "read" {
			return false
		}
	}
	return true
}

// ChangedKeys lists top-level attribute names that differ between Before and
// After (best-effort; empty when Before/After are absent).
func (c Change) ChangedKeys() []string {
	if c.Before == nil && c.After == nil {
		return nil
	}
	seen := map[string]bool{}
	var keys []string
	add := func(m map[string]interface{}) {
		for k := range m {
			if seen[k] {
				continue
			}
			b, _ := json.Marshal(c.Before[k])
			a, _ := json.Marshal(c.After[k])
			if !bytes.Equal(b, a) {
				seen[k] = true
				keys = append(keys, k)
			}
		}
	}
	add(c.Before)
	add(c.After)
	return keys
}

// --- plan-file JSON (`tofu show -json plan.tfplan`) --------------------

type planFile struct {
	ResourceChanges []struct {
		Address string `json:"address"`
		Type    string `json:"type"`
		Mode    string `json:"mode"`
		Change  struct {
			Actions []string               `json:"actions"`
			Before  map[string]interface{} `json:"before"`
			After   map[string]interface{} `json:"after"`
		} `json:"change"`
	} `json:"resource_changes"`
}

// --- message stream (`tofu plan -json`) -------------------------------

type streamMsg struct {
	Type   string `json:"type"`
	Change *struct {
		Resource struct {
			Addr         string `json:"addr"`
			ResourceType string `json:"resource_type"`
		} `json:"resource"`
		Action string `json:"action"`
	} `json:"change"`
}

// Parse detects whether b is a plan-file JSON document or a newline-delimited
// message stream and returns the resource changes.
func Parse(b []byte) ([]Change, error) {
	trimmed := bytes.TrimSpace(b)
	if len(trimmed) == 0 {
		return nil, fmt.Errorf("no plan output to parse")
	}

	if trimmed[0] == '{' {
		var pf planFile
		if err := json.Unmarshal(trimmed, &pf); err == nil && pf.ResourceChanges != nil {
			out := make([]Change, 0, len(pf.ResourceChanges))
			for _, rc := range pf.ResourceChanges {
				if rc.Mode == "data" {
					continue
				}
				out = append(out, Change{
					Address: rc.Address,
					Type:    rc.Type,
					Actions: rc.Change.Actions,
					Before:  rc.Change.Before,
					After:   rc.Change.After,
				})
			}
			return out, nil
		}
	}

	// message stream
	var out []Change
	seen := map[string]bool{}
	for _, line := range strings.Split(string(trimmed), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || line[0] != '{' {
			continue
		}
		var m streamMsg
		if json.Unmarshal([]byte(line), &m) != nil || m.Change == nil {
			continue
		}
		if m.Type != "planned_change" && m.Type != "resource_drift" {
			continue
		}
		addr := m.Change.Resource.Addr
		if addr == "" || seen[addr] {
			continue
		}
		seen[addr] = true
		out = append(out, Change{
			Address: addr,
			Type:    m.Change.Resource.ResourceType,
			Actions: []string{normAction(m.Change.Action)},
		})
	}
	return out, nil
}

func normAction(a string) string {
	switch a {
	case "noop", "no-op":
		return "no-op"
	default:
		return a
	}
}
