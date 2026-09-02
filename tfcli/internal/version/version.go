// Package version holds build metadata, injected via -ldflags -X at build time
// (see the Makefile). Defaults apply to `go build` / `go run` without ldflags.
package version

import (
	"fmt"
	"runtime"
)

var (
	// Version is a semver-ish tag or `git describe` output.
	Version = "dev"
	// Commit is the short git SHA.
	Commit = "none"
	// Date is the RFC3339 build timestamp.
	Date = "unknown"
)

// String is the one-line version shown by `former2-tf --version`.
func String() string {
	return fmt.Sprintf("%s (commit %s, built %s, %s/%s)",
		Version, Commit, Date, runtime.GOOS, runtime.GOARCH)
}
