# former2-tf build
#
#   make            vet + test, then cross-compile all PLATFORMS -> dist/
#   make build      same as above (default)
#   make dist       cross-compile only, no checks
#   make native     quick single-arch build -> bin/former2-tf, no checks
#   make test / vet / sync / clean / install / version / help
#
# Go is taken from $PATH; override with `make GO=/path/to/go ...`
# (this repo's local toolchain lives at ~/.local/go/bin/go).

# Prefer a `go` on PATH; fall back to this repo's local toolchain.
GO      ?= $(shell command -v go 2>/dev/null || echo $(HOME)/.local/go/bin/go)
PKG     := github.com/virtualbeck/former2/tfcli
BIN     := former2-tf

# darwin/arm64 = Apple Silicon, linux/amd64 = x86-64.
PLATFORMS ?= darwin/arm64 linux/amd64

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT  := $(shell git rev-parse --short HEAD 2>/dev/null || echo none)
DATE    := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)

LDFLAGS := -s -w \
	-X $(PKG)/internal/version.Version=$(VERSION) \
	-X $(PKG)/internal/version.Commit=$(COMMIT) \
	-X $(PKG)/internal/version.Date=$(DATE)

BUILD_ENV := CGO_ENABLED=0

.DEFAULT_GOAL := build
.PHONY: build dist native test vet sync clean install version help

build: ## vet + test, then cross-compile every PLATFORMS entry
	$(MAKE) --no-print-directory GO='$(GO)' vet
	$(MAKE) --no-print-directory GO='$(GO)' test
	$(MAKE) --no-print-directory GO='$(GO)' dist

dist: ## cross-compile only (no checks) -> dist/
	@mkdir -p dist
	@$(foreach p,$(PLATFORMS), \
		os=$(word 1,$(subst /, ,$(p))); arch=$(word 2,$(subst /, ,$(p))); \
		out=dist/$(BIN)_$(VERSION)_$${os}_$${arch}; \
		echo "-> $${out}"; \
		$(BUILD_ENV) GOOS=$${os} GOARCH=$${arch} $(GO) build -trimpath -ldflags '$(LDFLAGS)' -o $${out} . || exit 1; \
	)
	@echo "done ($(VERSION)): $$(ls dist/)"

native: ## quick native static binary (no checks) -> bin/former2-tf
	$(BUILD_ENV) $(GO) build -trimpath -ldflags '$(LDFLAGS)' -o bin/$(BIN) .
	@echo "built bin/$(BIN)  ($(VERSION))"

test: ## run the test suite
	$(GO) test ./...

vet: ## go vet
	$(GO) vet ./...

sync: ## re-copy the former2 JS corpus + AWS models from the parent repo
	node scripts/sync-assets.js

install: ## install the native binary into GOBIN / GOPATH/bin
	$(BUILD_ENV) $(GO) install -trimpath -ldflags '$(LDFLAGS)' .

version: ## print the version string that would be embedded
	@echo "$(VERSION) (commit $(COMMIT), built $(DATE))"

clean:
	rm -rf bin dist

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  %-10s %s\n", $$1, $$2}'
