package cli

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"
	"github.com/virtualbeck/former2/tfcli/internal/tofu"
)

func driftCmd() *cobra.Command {
	var dir, planJSON, tofuBin string
	var doInit, doFmt, noExit bool

	cmd := &cobra.Command{
		Use:   "drift",
		Short: "Summarise how far a Terraform dir is from `plan` = no changes",
		Long: "Runs (or reads) an OpenTofu/Terraform plan and groups the resource\n" +
			"changes by action. The adoption target is zero create/update/delete/\n" +
			"replace on managed resources.\n\n" +
			"Input: --dir <workspace> (runs tofu), or --plan-json <file> / stdin\n" +
			"(a `tofu show -json plan.tfplan` document, or a `tofu plan -json` stream).",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()

			var raw []byte
			if dir != "" {
				bin, err := tofu.Bin(tofuBin)
				if err != nil {
					return err
				}
				if doFmt {
					fmt.Fprintln(os.Stderr, "· tofu fmt")
					_, _ = tofu.Run(ctx, bin, dir, false, "fmt", "-recursive")
				}
				if doInit {
					fmt.Fprintln(os.Stderr, "· tofu init")
					if _, err := tofu.Run(ctx, bin, dir, false, "init", "-input=false", "-no-color"); err != nil {
						return fmt.Errorf("tofu init: %w", err)
					}
				}
				fmt.Fprintln(os.Stderr, "· tofu plan")
				planPath := filepath.Join(dir, ".former2.tfplan")
				if _, err := tofu.Run(ctx, bin, dir, false,
					"plan", "-input=false", "-no-color", "-lock=false", "-out", ".former2.tfplan"); err != nil {
					return fmt.Errorf("tofu plan: %w", err)
				}
				defer os.Remove(planPath)
				raw, err = tofu.Run(ctx, bin, dir, true, "show", "-json", ".former2.tfplan")
				if err != nil {
					return fmt.Errorf("tofu show: %w", err)
				}
			} else if planJSON != "" {
				b, err := os.ReadFile(planJSON)
				if err != nil {
					return err
				}
				raw = b
			} else {
				b, err := io.ReadAll(os.Stdin)
				if err != nil {
					return err
				}
				raw = b
			}

			changes, err := tofu.Parse(raw)
			if err != nil {
				return err
			}
			clean := reportDrift(changes)
			if !clean && !noExit {
				os.Exit(2)
			}
			return nil
		},
	}
	cmd.Flags().StringVar(&dir, "dir", "", "workspace directory to plan (e.g. infra/workspaces/prod)")
	cmd.Flags().StringVar(&planJSON, "plan-json", "", "read a plan JSON file instead of running tofu")
	cmd.Flags().StringVar(&tofuBin, "tofu", "", "path to tofu/terraform (default: auto-detect)")
	cmd.Flags().BoolVar(&doInit, "init", false, "run `tofu init` before planning")
	cmd.Flags().BoolVar(&doFmt, "fmt", false, "run `tofu fmt -recursive` before planning")
	cmd.Flags().BoolVar(&noExit, "no-exit-code", false, "always exit 0 (default: exit 2 when drift remains)")
	return cmd
}

// reportDrift prints the grouped summary and returns true when every managed
// resource is a no-op.
func reportDrift(changes []tofu.Change) bool {
	if len(changes) == 0 {
		fmt.Println("no resource changes reported — nothing to adopt or already clean")
		return true
	}

	byAction := map[string][]tofu.Change{}
	noop := 0
	for _, c := range changes {
		if c.Noop() {
			noop++
			continue
		}
		key := strings.Join(c.Actions, "+")
		byAction[key] = append(byAction[key], c)
	}

	if len(byAction) == 0 {
		fmt.Printf("✓ clean — %d resource(s), all no-op. `tofu plan` reports no changes.\n", noop)
		return true
	}

	// stable, useful ordering
	order := []string{"create", "delete", "update", "create+delete", "delete+create"}
	printed := map[string]bool{}
	fmt.Printf("drift remains — %d no-op, %d need work:\n\n", noop, countChanges(byAction))

	emit := func(key string) {
		cs := byAction[key]
		if len(cs) == 0 {
			return
		}
		printed[key] = true
		fmt.Printf("  %s (%d)\n", driftLabel(key), len(cs))
		sort.Slice(cs, func(i, j int) bool { return cs[i].Address < cs[j].Address })
		for _, c := range cs {
			line := "    " + c.Address
			if ck := c.ChangedKeys(); len(ck) > 0 {
				sort.Strings(ck)
				if len(ck) > 8 {
					ck = append(ck[:8], "…")
				}
				line += "  [" + strings.Join(ck, ", ") + "]"
			}
			fmt.Println(line)
		}
		fmt.Println()
	}
	for _, k := range order {
		emit(k)
	}
	for k := range byAction {
		if !printed[k] {
			emit(k)
		}
	}

	fmt.Println("next:")
	fmt.Println("  create  -> resource exists but isn't in state: add/fix its import block, `tofu apply`")
	fmt.Println("  update  -> generated HCL disagrees with AWS: adjust the attributes shown,")
	fmt.Println("             or add `lifecycle { ignore_changes = [...] }` for values you can't manage")
	fmt.Println("  delete  -> in state but not in HCL: usually a stale import block; remove it")
	return false
}

func driftLabel(key string) string {
	switch key {
	case "create":
		return "create — not in state"
	case "delete":
		return "delete — in state, not in config"
	case "update":
		return "update — attribute drift"
	case "create+delete", "delete+create":
		return "replace"
	default:
		return key
	}
}

func countChanges(m map[string][]tofu.Change) int {
	n := 0
	for _, v := range m {
		n += len(v)
	}
	return n
}
