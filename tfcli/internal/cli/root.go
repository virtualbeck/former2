// Package cli wires the former2 tfcli commands.
//
//	former2-tf scan      -> discover resources, write raw.json
//	former2-tf generate  -> raw.json (or a fresh scan) -> one Terraform file
//	former2-tf project   -> raw.json (or a fresh scan) -> modules/ + workspaces/ repo
//	former2-tf all        -> scan, then generate, then project
package cli

import (
	"context"
	"fmt"
	"os"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/spf13/cobra"
	"github.com/virtualbeck/former2/tfcli/internal/awsclient"
	"github.com/virtualbeck/former2/tfcli/internal/jsrt"
	"github.com/virtualbeck/former2/tfcli/internal/version"
)

var (
	flagRegion      string
	flagProfile     string
	flagDebug       bool
	flagQuiet       bool
	flagConcurrency int
)

// Execute is the entry point.
func Execute() {
	root := &cobra.Command{
		Use:           "former2-tf",
		Short:         "Generate Terraform from existing AWS resources (former2, Terraform-only)",
		Version:       version.String(),
		SilenceUsage:  true,
		SilenceErrors: true,
	}
	root.SetVersionTemplate("former2-tf {{.Version}}\n")
	pf := root.PersistentFlags()
	pf.StringVar(&flagRegion, "region", "", "AWS region to scan (default: from profile/env, then us-east-1)")
	pf.StringVar(&flagProfile, "profile", "", "shared-config profile to use")
	pf.BoolVar(&flagDebug, "debug", false, "verbose diagnostics")
	pf.BoolVar(&flagQuiet, "quiet", false, "suppress progress and warnings")
	pf.IntVar(&flagConcurrency, "concurrency", 32, "max concurrent AWS requests during a scan")

	root.AddCommand(scanCmd(), generateCmd(), projectCmd(), allCmd(), driftCmd(), adoptCmd())

	if err := root.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

// newEngine builds the JS runtime with a live AWS client. resolvedRegion is the
// region actually in effect.
func newEngine(ctx context.Context) (*jsrt.Engine, string, *consoleLogger, error) {
	opts := []func(*awsconfig.LoadOptions) error{}
	if flagRegion != "" {
		opts = append(opts, awsconfig.WithRegion(flagRegion))
	}
	if flagProfile != "" {
		opts = append(opts, awsconfig.WithSharedConfigProfile(flagProfile))
	}
	cfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, "", nil, fmt.Errorf("load AWS config: %w", err)
	}
	region := cfg.Region
	if region == "" {
		region = "us-east-1"
	}

	// fail fast if there are no usable credentials at all
	if _, err := cfg.Credentials.Retrieve(ctx); err != nil {
		return nil, "", nil, fmt.Errorf("no AWS credentials: %w\n"+
			"configure a profile/env, or use `generate --from raw.json` / `project --from raw.json`", err)
	}

	client := awsclient.New(cfg.Credentials, region)
	log := newConsoleLogger(flagDebug, flagQuiet)
	eng, err := jsrt.New(client, region, log, flagDebug, flagConcurrency)
	if err != nil {
		return nil, "", nil, err
	}
	return eng, region, log, nil
}

// newOfflineEngine builds the runtime without requiring AWS credentials (used
// when a command only consumes an existing raw.json).
func newOfflineEngine() (*jsrt.Engine, *consoleLogger, error) {
	log := newConsoleLogger(flagDebug, flagQuiet)
	eng, err := jsrt.New(nil, "us-east-1", log, flagDebug, flagConcurrency)
	if err != nil {
		return nil, nil, err
	}
	return eng, log, nil
}
