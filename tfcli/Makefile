# former2-tf build
#
#   make build              native binary  -> bin/former2-tf
#   make dist               cross-compile all PLATFORMS -> dist/
#   make test / vet / sync / clean
#
# Go is taken from $PATH; override with `make GO=/path/to/go ...`
# (this repo's local toolchain lives at ~/.local/go/bin/go).

GO      ?= go
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

.PHONY: build dist test vet sync clean install version help

build: ## native static binary -> bin/former2-tf
	$(BUILD_ENV) $(GO) build -trimpath -ldflags '$(LDFLAGS)' -o bin/$(BIN) .
	@echo "built bin/$(BIN)  ($(VERSION))"

dist: ## cross-compile every PLATFORMS entry -> dist/
	@mkdir -p dist
	@$(foreach p,$(PLATFORMS), \
		os=$(word 1,$(subst /, ,$(p))); arch=$(word 2,$(subst /, ,$(p))); \
		out=dist/$(BIN)_$(VERSION)_$${os}_$${arch}; \
		echo "-> $${out}"; \
		$(BUILD_ENV) GOOS=$${os} GOARCH=$${arch} $(GO) build -trimpath -ldflags '$(LDFLAGS)' -o $${out} . || exit 1; \
	)
	@echo "done: $$(ls dist/)"

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
