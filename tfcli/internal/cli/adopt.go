package cli

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/spf13/cobra"
	"github.com/virtualbeck/former2/tfcli/internal/tofu"
)

func adoptCmd() *cobra.Command {
	var sf scanFlags
	var pf prepareFlags
	var from, out, env, tofuBin string
	var runTofu, withImports, withImportScript bool

	cmd := &cobra.Command{
		Use:   "adopt",
		Short: "One shot: scan -> project + import blocks -> tofu fmt/init/plan -> drift report",
		Long: "Turns a console-built account into an opinionated Terraform repo primed\n" +
			"for import. Scans (or reads --from), writes the modules/workspaces tree\n" +
			"with an imports.tf, formats it, and (unless --no-tofu) runs a plan and\n" +
			"prints what still stands between you and `plan` = no changes.\n\n" +
			"The repo is NOT applied for you — review it, then `tofu apply` to import.",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			if out == "" {
				out = "infra"
			}
			envDir := sanitizeEnv(env)

			eng, err := prepareEngine(ctx, from, sf, pf)
			if err != nil {
				return err
			}
			defer eng.Close()

			files, err := eng.GenerateProject(env, withImports, withImportScript)
			if err != nil {
				return fmt.Errorf("project: %w", err)
			}
			if err := writeProject(out, "", files); err != nil {
				return err
			}
			for p, c := range files {
				if strings.HasSuffix(p, "/imports.tf") || strings.HasSuffix(p, "/import.sh") {
					reportImports(filepath.Join(out, p), c)
				}
			}

			wsDir := filepath.Join(out, "workspaces", envDir)

			if runTofu {
				bin, err := tofu.Bin(tofuBin)
				if err != nil {
					fmt.Fprintf(os.Stderr, "\n(skipping plan: %v)\n", err)
				} else {
					fmt.Fprintln(os.Stderr, "\n· tofu fmt")
					_, _ = tofu.Run(ctx, bin, out, false, "fmt", "-recursive")
					fmt.Fprintln(os.Stderr, "· tofu init")
					if _, err := tofu.Run(ctx, bin, wsDir, false, "init", "-input=false", "-no-color"); err != nil {
						return fmt.Errorf("tofu init: %w", err)
					}
					fmt.Fprintln(os.Stderr, "· tofu validate")
					if _, err := tofu.Run(ctx, bin, wsDir, false, "validate", "-no-color"); err != nil {
						fmt.Fprintf(os.Stderr,
							"\ntofu validate failed (see above) — fix the generated HCL, then\n"+
								"  former2-tf drift --dir %s --init\n", wsDir)
						fmt.Fprint(os.Stderr, adoptRunbook(wsDir, withImportScript))
						return nil
					}
					fmt.Fprintln(os.Stderr, "· tofu plan")
					planPath := filepath.Join(wsDir, ".former2.tfplan")
					if _, err := tofu.Run(ctx, bin, wsDir, false,
						"plan", "-input=false", "-no-color", "-lock=false", "-out", ".former2.tfplan"); err != nil {
						fmt.Fprintf(os.Stderr,
							"\ntofu plan did not complete (see errors above).\n"+
								"These are usually generated-HCL issues to fix by hand before adoption\n"+
								"(placeholder values, provider-5 attribute changes, unsupported nested blocks).\n")
					} else {
						raw, err := tofu.Run(ctx, bin, wsDir, true, "show", "-json", ".former2.tfplan")
						os.Remove(planPath)
						if err == nil {
							if changes, err := tofu.Parse(raw); err == nil {
								fmt.Println()
								reportDrift(changes)
							}
						}
					}
					os.Remove(planPath)
				}
			}

			fmt.Fprint(os.Stderr, adoptRunbook(wsDir, withImportScript))
			return nil
		},
	}
	sf.bind(cmd)
	pf.bind(cmd)
	cmd.Flags().StringVar(&from, "from", "", "raw data file from `scan` (skip scanning)")
	cmd.Flags().StringVarP(&out, "out", "o", "infra", "output directory for the Terraform repo")
	cmd.Flags().StringVar(&env, "env", "dev", "environment / workspace name")
	cmd.Flags().StringVar(&tofuBin, "tofu", "", "path to tofu/terraform (default: auto-detect)")
	cmd.Flags().BoolVar(&runTofu, "tofu-plan", true, "run tofu fmt/init/validate/plan and print a drift report")
	cmd.Flags().BoolVar(&withImports, "imports", true, "emit imports.tf (import blocks)")
	cmd.Flags().BoolVar(&withImportScript, "import-script", false, "emit import.sh instead of/as well as imports.tf (state-only `tofu import`)")
	return cmd
}

func adoptRunbook(wsDir string, script bool) string {
	populate := "tofu apply                 # consumes imports.tf: imports AND applies any drift - review the plan first"
	cleanup := "# once plan is clean: delete imports.tf, commit, continue only via IaC"
	if script {
		populate = "./import.sh                 # `tofu import` per resource - only writes state, never applies"
		cleanup = "# once plan is clean: commit and continue only via IaC"
	}
	return fmt.Sprintf(`
runbook:
  cd %s
  tofu init
  former2-tf drift --dir .    # iterate on the HCL until it prints "clean"
  %s
  %s
`, wsDir, populate, cleanup)
}

var nonIdent = regexp.MustCompile(`[^A-Za-z0-9_]`)

// sanitizeEnv mirrors tfProjectSanitize() in js/tfproject.js.
func sanitizeEnv(name string) string {
	if name == "" {
		name = "dev"
	}
	n := nonIdent.ReplaceAllString(name, "_")
	if n == "" || (n[0] != '_' && !isAlpha(n[0])) {
		n = "_" + n
	}
	return n
}

func isAlpha(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z')
}
