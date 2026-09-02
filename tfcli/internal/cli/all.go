package cli

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"
)

func allCmd() *cobra.Command {
	var sf scanFlags
	var pf prepareFlags
	var rawOut, tfOut, projectOut, zipPath, env string
	var withImports bool

	cmd := &cobra.Command{
		Use:     "all",
		Aliases: []string{"run"},
		Short:   "Run scan, then generate, then project in one pass",
		Long: "Scans the account once and keeps the result in memory for the generate\n" +
			"and project steps. Each step's output is written if its --*-out flag is set;\n" +
			"the project tree is always written (default ./terraform-project).",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			scanOpts, err := sf.options()
			if err != nil {
				return err
			}
			eng, region, _, err := newEngine(ctx)
			if err != nil {
				return err
			}
			defer eng.Close()

			// step 1
			fmt.Fprintf(os.Stderr, "[1/3] scanning %s ...\n", region)
			start := time.Now()
			n, err := eng.Scan(scanOpts)
			if err != nil {
				return fmt.Errorf("scan: %w", err)
			}
			fmt.Fprintf(os.Stderr, "      %d resources in %s\n", n, time.Since(start).Round(time.Second))
			if rawOut != "" {
				raw, err := eng.DumpRaw()
				if err != nil {
					return err
				}
				if err := os.WriteFile(rawOut, raw, 0o644); err != nil {
					return err
				}
				fmt.Fprintf(os.Stderr, "      wrote %s\n", rawOut)
			}

			// map once
			m, err := eng.Prepare(pf.options())
			if err != nil {
				return fmt.Errorf("map resources: %w", err)
			}
			fmt.Fprintf(os.Stderr, "      mapped %d Terraform resources\n", m)

			// step 2 / 3 (flat)
			if tfOut != "" {
				fmt.Fprintln(os.Stderr, "[2/3] generating flat Terraform ...")
				tf, err := eng.GenerateTf()
				if err != nil {
					return fmt.Errorf("generate: %w", err)
				}
				if err := writeOutput(tfOut, tf); err != nil {
					return err
				}
			}

			// step 4 (project)
			fmt.Fprintln(os.Stderr, "[3/3] generating Terraform project ...")
			if projectOut == "" && zipPath == "" {
				projectOut = "terraform-project"
			}
			files, err := eng.GenerateProject(env, withImports)
			if err != nil {
				return fmt.Errorf("project: %w", err)
			}
			if err := writeProject(projectOut, zipPath, files); err != nil {
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
	cmd.Flags().StringVar(&rawOut, "raw-out", "", "also write scan raw data here")
	cmd.Flags().StringVar(&tfOut, "tf-out", "", "also write the flat Terraform file here")
	cmd.Flags().StringVarP(&projectOut, "out", "o", "", "project tree output directory (default terraform-project)")
	cmd.Flags().StringVar(&zipPath, "zip", "", "also write the project as a zip archive")
	cmd.Flags().StringVar(&env, "env", "dev", "environment / workspace name")
	cmd.Flags().BoolVar(&withImports, "imports", false, "also emit workspaces/<env>/imports.tf with Terraform import blocks")
	return cmd
}
