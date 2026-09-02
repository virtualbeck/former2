package cli

import (
	"context"
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func scanCmd() *cobra.Command {
	var sf scanFlags
	var out string

	cmd := &cobra.Command{
		Use:   "scan",
		Short: "Step 1: discover AWS resources and write raw data",
		Long: "Queries the account (read-only) across every supported service and writes\n" +
			"the discovered resources to a raw JSON file that `generate` and `project`\n" +
			"can consume without hitting AWS again.",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			opts, err := sf.options()
			if err != nil {
				return err
			}
			log := newConsoleLogger(flagDebug, flagQuiet)
			raw, _, err := scanRawResources(ctx, opts, log)
			if err != nil {
				return err
			}
			if out == "" {
				out = "former2-raw.json"
			}
			if err := os.WriteFile(out, raw, 0o644); err != nil {
				return err
			}
			fmt.Fprintf(os.Stderr, "  wrote %s\n", out)
			return nil
		},
	}
	sf.bind(cmd)
	cmd.Flags().StringVarP(&out, "out", "o", "", "raw data output file (default former2-raw.json)")
	return cmd
}
