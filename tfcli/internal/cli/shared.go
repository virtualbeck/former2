package cli

import (
	"archive/zip"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/cobra"
	"github.com/virtualbeck/former2/tfcli/internal/jsrt"
)

type scanFlags struct {
	services        string
	excludeServices string
	includeDefault  bool
}

func (f *scanFlags) bind(cmd *cobra.Command) {
	cmd.Flags().StringVar(&f.services, "services", "", "comma-separated list of services to scan (default: all)")
	cmd.Flags().StringVar(&f.excludeServices, "exclude-services", "", "comma-separated list of services to skip")
	cmd.Flags().BoolVar(&f.includeDefault, "include-default-resources", false, "include default VPCs, subnets, etc.")
}

func (f *scanFlags) options() (jsrt.ScanOptions, error) {
	if f.services != "" && f.excludeServices != "" {
		return jsrt.ScanOptions{}, fmt.Errorf("--services and --exclude-services are mutually exclusive")
	}
	o := jsrt.ScanOptions{IncludeDefaultResources: f.includeDefault}
	if f.services != "" && !strings.EqualFold(f.services, "all") {
		o.Services = splitList(f.services)
	}
	if f.excludeServices != "" {
		o.ExcludeServices = splitList(f.excludeServices)
	}
	return o, nil
}

type prepareFlags struct {
	searchFilter string
	regexFilter  string
	sortOutput   bool
}

func (f *prepareFlags) bind(cmd *cobra.Command) {
	cmd.Flags().StringVar(&f.searchFilter, "search-filter", "", "keep only rows whose JSON contains this (',' = OR, '&' = AND)")
	cmd.Flags().StringVar(&f.regexFilter, "regex-filter", "", "keep only rows whose JSON matches this regexp")
	cmd.Flags().BoolVar(&f.sortOutput, "sort-output", false, "sort resources by id before mapping")
}

func (f *prepareFlags) options() jsrt.PrepareOptions {
	return jsrt.PrepareOptions{
		SearchFilter: f.searchFilter,
		RegexFilter:  f.regexFilter,
		SortOutput:   f.sortOutput,
	}
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func writeOutput(path, content string) error {
	if path == "" || path == "-" {
		_, err := os.Stdout.WriteString(content)
		return err
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return err
	}
	fmt.Fprintf(os.Stderr, "  wrote %s\n", path)
	return nil
}

func writeProject(dir, zipPath string, files map[string]string) error {
	paths := make([]string, 0, len(files))
	for p := range files {
		paths = append(paths, p)
	}
	sort.Strings(paths)

	if dir != "" {
		for _, p := range paths {
			dst := filepath.Join(dir, filepath.FromSlash(p))
			if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
				return err
			}
			if err := os.WriteFile(dst, []byte(files[p]), 0o644); err != nil {
				return err
			}
		}
		fmt.Fprintf(os.Stderr, "  wrote %d files under %s/\n", len(paths), dir)
	}

	if zipPath != "" {
		zf, err := os.Create(zipPath)
		if err != nil {
			return err
		}
		defer zf.Close()
		zw := zip.NewWriter(zf)
		for _, p := range paths {
			w, err := zw.Create(p)
			if err != nil {
				return err
			}
			if _, err := w.Write([]byte(files[p])); err != nil {
				return err
			}
		}
		if err := zw.Close(); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "  wrote %s (%d files)\n", zipPath, len(paths))
	}

	if dir == "" && zipPath == "" {
		// print a manifest to stdout
		for _, p := range paths {
			fmt.Printf("===== %s =====\n%s\n", p, files[p])
		}
	}
	return nil
}
