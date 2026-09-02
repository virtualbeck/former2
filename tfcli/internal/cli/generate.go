package cli

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/virtualbeck/former2/tfcli/internal/jsrt"
)

// prepareEngine returns an engine with resources loaded (from `from` if set,
// otherwise a fresh scan) and performF2Mappings already run.
func prepareEngine(ctx context.Context, from string, sf scanFlags, pf prepareFlags) (*jsrt.Engine, error) {
	var eng *jsrt.Engine

	if from != "" {
		raw, err := os.ReadFile(from)
		if err != nil {
			return nil, err
		}
		e, _, err := newOfflineEngine()
		if err != nil {
			return nil, err
		}
		n, err := e.LoadRaw(raw)
		if err != nil {
			e.Close()
			return nil, fmt.Errorf("load %s: %w", from, err)
		}
		fmt.Fprintf(os.Stderr, "loaded %d resources from %s\n", n, from)
		eng = e
	} else {
		scanOpts, err := sf.options()
		if err != nil {
			return nil, err
		}
		e, region, _, err := newEngine(ctx)
		if err != nil {
			return nil, err
		}
		fmt.Fprintf(os.Stderr, "scanning %s ...\n", region)
		n, err := e.Scan(scanOpts)
		if err != nil {
			e.Close()
			return nil, fmt.Errorf("scan: %w", err)
		}
		fmt.Fprintf(os.Stderr, "  found %d resources\n", n)
		eng = e
	}

	m, err := eng.Prepare(pf.options())
	if err != nil {
		eng.Close()
		return nil, fmt.Errorf("map resources: %w", err)
	}
	fmt.Fprintf(os.Stderr, "  mapped %d Terraform resources\n", m)
	return eng, nil
}

func generateCmd() *cobra.Command {
	var sf scanFlags
	var pf prepareFlags
	var from, out string

	cmd := &cobra.Command{
		Use:   "generate",
		Short: "Step 3: emit a single flat Terraform file",
		Long: "Maps discovered resources to Terraform and writes one .tf document.\n" +
			"With --from it reuses a raw.json from `scan`; otherwise it scans first.",
		RunE: func(cmd *cobra.Command, args []string) error {
			eng, err := prepareEngine(context.Background(), from, sf, pf)
			if err != nil {
				return err
			}
			defer eng.Close()

			tf, err := eng.GenerateTf()
			if err != nil {
				return fmt.Errorf("generate: %w", err)
			}
			return writeOutput(out, tf)
		},
	}
	sf.bind(cmd)
	pf.bind(cmd)
	cmd.Flags().StringVar(&from, "from", "", "raw data file from `scan` (skip scanning)")
	cmd.Flags().StringVarP(&out, "out", "o", "", "output .tf file (default stdout)")
	return cmd
}
