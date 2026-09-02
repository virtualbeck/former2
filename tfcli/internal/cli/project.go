package cli

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

// reportImports prints a one-line summary of a generated imports.tf.
func reportImports(path, content string) {
	active, todo := 0, 0
	for _, ln := range strings.Split(content, "\n") {
		t := strings.TrimSpace(ln)
		if strings.HasPrefix(t, "to = ") {
			active++
		} else if strings.HasPrefix(t, "#   to = ") {
			todo++
		}
	}
	fmt.Fprintf(os.Stderr, "  %s: %d import block(s)", path, active)
	if todo > 0 {
		fmt.Fprintf(os.Stderr, ", %d need a manual id (REPLACE_ME)", todo)
	}
	fmt.Fprintln(os.Stderr)
}

func projectCmd() *cobra.Command {
	var sf scanFlags
	var pf prepareFlags
	var from, out, zipPath, env string
	var withImports bool

	cmd := &cobra.Command{
		Use:   "project",
		Short: "Step 4: emit a modules/ + workspaces/ Terraform repo",
		Long: "Runs the same mapping as `generate`, then lays the resources out as a\n" +
			"modules + workspaces project with former2's post-processing (value -> ref\n" +
			"resolution, region/account data lookups, scalar hoisting, cross-module\n" +
			"wiring). With --from it reuses a raw.json from `scan`; otherwise it scans.",
		RunE: func(cmd *cobra.Command, args []string) error {
			eng, err := prepareEngine(context.Background(), from, sf, pf)
			if err != nil {
				return err
			}
			defer eng.Close()

			files, err := eng.GenerateProject(env, withImports)
			if err != nil {
				return fmt.Errorf("project: %w", err)
			}
			if err := writeProject(out, zipPath, files); err != nil {
				return err
			}
			if withImports {
				for p, c := range files {
					if strings.HasSuffix(p, "/imports.tf") {
						reportImports(p, c)
					}
				}
			}
			return nil
		},
	}
	sf.bind(cmd)
	pf.bind(cmd)
	cmd.Flags().StringVar(&from, "from", "", "raw data file from `scan` (skip scanning)")
	cmd.Flags().StringVarP(&out, "out", "o", "", "output directory for the project tree")
	cmd.Flags().StringVar(&zipPath, "zip", "", "also write the project as a zip archive")
	cmd.Flags().StringVar(&env, "env", "dev", "environment / workspace name")
	cmd.Flags().BoolVar(&withImports, "imports", false, "also emit workspaces/<env>/imports.tf with Terraform import blocks")
	return cmd
}
