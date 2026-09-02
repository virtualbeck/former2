package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"os"
	"time"

	"github.com/virtualbeck/former2/tfcli/internal/awsclient"
	"github.com/virtualbeck/former2/tfcli/internal/jsrt"
)

// scanUSRegions scans each US commercial region with its own engine and returns
// the merged raw rows as a JSON array.
//
// Global resources (IAM, CloudFront, Route 53, ...) are reported by former2 in
// every region with byte-identical data; they are de-duplicated here on
// (f2type, f2id, hash(f2data)) so the copy from the first region — us-east-1 —
// survives and the rest are dropped. Genuinely regional resources differ in
// their data (region shows up in every ARN) and are all kept.
func scanUSRegions(ctx context.Context, scanOpts jsrt.ScanOptions, log *consoleLogger) ([]byte, error) {
	cfg, err := loadAWSConfig(ctx)
	if err != nil {
		return nil, err
	}

	merged := make([]json.RawMessage, 0, 1024)
	seen := make(map[uint64]struct{}, 2048)
	start := time.Now()

	for _, region := range usCommercialRegions {
		client := awsclient.New(cfg.Credentials, region)
		eng, err := jsrt.New(client, region, log, flagDebug, flagConcurrency)
		if err != nil {
			return nil, fmt.Errorf("init %s: %w", region, err)
		}

		fmt.Fprintf(os.Stderr, "scanning %s ...\n", region)
		if _, err := eng.Scan(scanOpts); err != nil {
			eng.Close()
			return nil, fmt.Errorf("scan %s: %w", region, err)
		}
		raw, err := eng.DumpRaw()
		eng.Close()
		if err != nil {
			return nil, fmt.Errorf("dump %s: %w", region, err)
		}

		var rows []json.RawMessage
		if err := json.Unmarshal(raw, &rows); err != nil {
			return nil, fmt.Errorf("parse %s rows: %w", region, err)
		}
		added := 0
		for _, row := range rows {
			k := rowDedupKey(row)
			if _, dup := seen[k]; dup {
				continue
			}
			seen[k] = struct{}{}
			merged = append(merged, row)
			added++
		}
		fmt.Fprintf(os.Stderr, "  %s: %d rows, %d new\n", region, len(rows), added)
	}

	fmt.Fprintf(os.Stderr, "  merged %d resources across %d regions in %s\n",
		len(merged), len(usCommercialRegions), time.Since(start).Round(time.Second))
	return json.Marshal(merged)
}

// rowDedupKey hashes (f2type, f2id, canonical f2data) so a resource reported
// identically in more than one region collapses to a single row.
func rowDedupKey(row json.RawMessage) uint64 {
	var r struct {
		ID   string          `json:"f2id"`
		Type string          `json:"f2type"`
		Data json.RawMessage `json:"f2data"`
	}
	_ = json.Unmarshal(row, &r)

	h := fnv.New64a()
	h.Write([]byte(r.Type))
	h.Write([]byte{0})
	h.Write([]byte(r.ID))
	h.Write([]byte{0})
	// Re-encode f2data through interface{} so key order is canonical.
	var v interface{}
	if json.Unmarshal(r.Data, &v) == nil {
		if b, err := json.Marshal(v); err == nil {
			h.Write(b)
		}
	} else {
		h.Write(r.Data)
	}
	return h.Sum64()
}

// scanRawResources returns the raw scan rows as a JSON array, honouring
// --all-us-regions. label is a short human description of what was scanned.
func scanRawResources(ctx context.Context, scanOpts jsrt.ScanOptions, log *consoleLogger) (raw []byte, label string, err error) {
	if flagAllUSRegions {
		raw, err = scanUSRegions(ctx, scanOpts, log)
		return raw, "all US regions", err
	}

	eng, region, _, err := newEngine(ctx)
	if err != nil {
		return nil, "", err
	}
	defer eng.Close()

	fmt.Fprintf(os.Stderr, "scanning %s ...\n", region)
	start := time.Now()
	n, err := eng.Scan(scanOpts)
	if err != nil {
		return nil, "", fmt.Errorf("scan: %w", err)
	}
	fmt.Fprintf(os.Stderr, "  found %d resources in %s\n", n, time.Since(start).Round(time.Second))
	raw, err = eng.DumpRaw()
	return raw, region, err
}
