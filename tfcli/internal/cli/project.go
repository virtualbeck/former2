package cli

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

// reportImports prints a one-line summary of a generated imports.tf / import.sh.
func reportImports(path, content string) {
	active, todo := 0, 0
	isScript := strings.HasSuffix(path, ".sh")
	for _, ln := range strings.Split(content, "\n") {
		t := strings.TrimSpace(ln)
		switch {
		case isScript && strings.HasPrefix(t, "imp "):
			active++
		case isScript && strings.HasPrefix(t, "# imp "):
			todo++
		case !isScript && strings.HasPrefix(t, "to = "):
			active++
		case !isScript && strings.HasPrefix(t, "#   to = "):
			todo++
		}
	}
	unit := "import block(s)"
	if isScript {
		unit = "tofu import command(s)"
	}
	fmt.Fprintf(os.Stderr, "  %s: %d %s", path, active, unit)
	if todo > 0 {
		fmt.Fprintf(os.Stderr, ", %d need a manual id (REPLACE_ME)", todo)
	}
	fmt.Fprintln(os.Stderr)
}

func projectCmd() *cobra.Command {
	var sf scanFlags
	var pf prepareFlags
	var from, out, zipPath, env string
	var withImports, withImportScript bool

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

			files, err := eng.GenerateProject(env, withImports, withImportScript)
			if err != nil {
				return fmt.Errorf("project: %w", err)
			}
			if err := writeProject(out, zipPath, files); err != nil {
				return err
			}
			for p, c := range files {
				if strings.HasSuffix(p, "/imports.tf") || strings.HasSuffix(p, "/import.sh") {
					reportImports(p, c)
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
	cmd.Flags().BoolVar(&withImports, "imports", false, "emit workspaces/<env>/imports.tf (import blocks; `apply` imports AND applies drift)")
	cmd.Flags().BoolVar(&withImportScript, "import-script", false, "emit workspaces/<env>/import.sh (`tofu import` per resource; state-only, never applies)")
	return cmd
}
