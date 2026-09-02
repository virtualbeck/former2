# former2-tf

A slim, Terraform-only command-line build of [former2](https://github.com/iann0036/former2).

It runs former2's real scanning and mapping logic — the ~150 per-service
JavaScript files, `mappings.js` and `tfproject.js` — on an embedded JavaScript
engine ([goja](https://github.com/dop251/goja)), with Go supplying the pieces a
browser normally would: AWS credentials, request signing, HTTP, and
concurrency. The result is a single static binary that produces **exactly** the
Terraform the browser tool and `cli/main.js` produce, plus the "Download
Project" post-processing.

Nothing but Terraform is emitted (no CloudFormation / CDK / Pulumi / diagrams).

## Build

```sh
cd tfcli
make build          # native static binary -> bin/former2-tf
make dist           # cross-compile -> dist/former2-tf_<version>_<os>_<arch>
make test
```

`make dist` builds for Apple Silicon and Linux x86-64 by default; override with
`make dist PLATFORMS="darwin/arm64 darwin/amd64 linux/amd64 linux/arm64"`.
Go is taken from `$PATH` — override with `make GO=/path/to/go ...`.

Plain `go build -o former2-tf .` also works (without the embedded version
string). The binary is a fully static ELF/Mach-O: it embeds the JS corpus and
the aws-sdk-js API models, and needs no Node.js, libc, or this repo at runtime —
copy the single file to any same-arch host with AWS credentials.

`former2-tf --version` reports the build tag, commit and date.

## Commands

The three steps are independent and each can start from a saved raw-data file:

| Command | Step | Input | Output |
| --- | --- | --- | --- |
| `scan` | 1 | live AWS account | `former2-raw.json` |
| `generate` | 3 | `--from raw.json` **or** a fresh scan | one flat `.tf` file |
| `project` | 4 | `--from raw.json` **or** a fresh scan | `modules/` + `workspaces/` tree |
| `all` | 1 → 3 → 4 | live AWS account | raw + flat + project, one scan |
| `adopt` | 1 → 4 → tofu | live AWS account (or `--from`) | import-primed repo + drift report |
| `drift` | — | a tofu plan / a workspace dir | grouped summary of what's not yet `no-op` |

### scan

```sh
former2-tf scan --region us-east-1 --profile myprofile -o raw.json
former2-tf scan --services EC2,IAM,RDS
former2-tf scan --exclude-services CloudWatch,KMS
```

### generate (flat Terraform)

```sh
former2-tf generate --from raw.json -o main.tf
former2-tf generate --region us-east-1 --search-filter myapp -o main.tf
```

### project (modules + workspaces repo)

```sh
former2-tf project --from raw.json --out ./infra --env prod
former2-tf project --region us-east-1 --zip infra.zip
```

Layout produced:

```
modules/<group>/{main,data,variables,outputs}.tf
workspaces/<env>/{provider,backend,main}.tf
README.md  .gitignore
```

Post-processing (all from former2's `tfproject.js`): literal values that match
another resource's computed attribute become `${type.lid.attr}` references;
region / account id inside ARNs become `data` lookups; curated top-level scalars
are hoisted into each module's `variables.tf` with the discovered value as the
default; references that cross a module boundary are wired through module
inputs/outputs in `workspaces/<env>/main.tf`.

### all

```sh
former2-tf all --region us-east-1 --out ./infra --raw-out raw.json --tf-out flat.tf
```

Scans once, keeps the result in memory, then runs generate (if `--tf-out`) and
project.

## Adopting a console-built account

Goal: start from an account built entirely in the console, end with an
opinionated, formatted Terraform/OpenTofu repo whose `tofu plan` reports **no
changes** — a "continue only via IaC" baseline.

```sh
# one shot: scan -> modules/workspaces repo + import blocks -> fmt -> validate -> plan -> drift
former2-tf adopt --profile myprofile --region us-east-1 --out infra --env prod
```

`adopt` writes `infra/` (see `project` above) plus
`infra/workspaces/prod/imports.tf` — a Terraform `import {}` block per
discovered resource, addressed at `module.<group>.<type>.<name>`. It then runs
`tofu fmt`, `init`, `validate` and `plan` and prints a drift report. It does
**not** apply anything.

Then iterate:

```sh
cd infra/workspaces/prod
tofu apply                       # consumes imports.tf -> state is populated
former2-tf drift --dir .         # what still isn't `no-op`?
```

`drift` groups the plan:

- **create** — the resource exists in AWS but isn't in state → its import block
  is missing or has the wrong id. Fix `imports.tf`, re-apply.
- **update** — the generated HCL disagrees with AWS on the listed attributes →
  edit them, or add `lifecycle { ignore_changes = [...] }` for values you can't
  manage from code.
- **delete** — in state but not in config → usually a stale import block.

Repeat until `former2-tf drift` prints `✓ clean`. Then delete the `imports.tf`
files (they're inert after apply), commit, and enforce IaC-only from there.

```sh
former2-tf drift --plan-json plan.json    # also accepts a `tofu show -json` file or a `tofu plan -json` stream on stdin
```

Import-id notes: for most resource types the import id is the physical id
former2 discovered (`vpc-…`, bucket name, ARN, …). Composite ids
(`<role>/<policy_arn>`, `<rtb>_<cidr>`, route53 `<zone>_<name>_<type>`, …) are
computed. Types with no automatic id are emitted as commented blocks marked
`REPLACE_ME`; `adopt`/`project --imports` report how many.

`project --imports` and `generate --imports` produce the same blocks without
running tofu.

## Common flags

```
--region        AWS region to scan (default: profile/env, then us-east-1)
--profile       shared-config profile
--concurrency   max concurrent AWS requests during a scan (default 32)
--debug         verbose diagnostics
--quiet         suppress progress + warnings
```

Credentials come from the standard AWS chain (env, shared config, SSO, IMDS).
Use read-only credentials (`ReadOnlyAccess`).

## Updating the embedded former2 corpus

The JS files and API models under `internal/*/` are build inputs copied from the
parent repo. After changing `js/services/*.js`, `js/mappings.js`,
`js/tfproject.js` or `js/tfimports.js`, re-sync and rebuild:

```sh
node tfcli/scripts/sync-assets.js
cd tfcli && go build -o former2-tf .
```

`sync-assets.js` also rewrites the single line in `datatables.js` where
`sdkcall()` talks to the AWS SDK so it calls into the Go host instead; it fails
loudly if that patch no longer applies.

## How it works

```
Go: cobra CLI, AWS config, generic model-driven client (query/ec2/json/
    rest-json/rest-xml marshalling + SigV4), worker pool, event loop
------------------------------------------------------------------------
JS (unchanged former2): sections[] + updateDatatable*  (scan)
    service_mapping_functions + outputMapTf            (generate)
    generateTerraformProject                           (project)
    sdkcall() keeps its pagination / backoff / error handling; only its
    transport call is redirected to the Go client.
```

## Limitations

- `scan` needs live AWS access; `generate` / `project` from `--from` do not.
- `adopt` / `drift --dir` need `tofu` (or `terraform`) on PATH; `drift
  --plan-json` / stdin do not.
- Reaching `plan` = no changes is iterative — former2's per-resource mappers
  omit some attributes and still emit a few AWS-provider-3.x names (the project
  scaffold fixes the common ones, e.g. `aws_db_instance.name` -> `db_name`).
  The `drift` loop is how you close the gap.
- Import blocks are placed in `workspaces/<env>/imports.tf` with fully-qualified
  `module.<group>.…` addresses (module-local import blocks aren't portable
  across tofu/terraform versions).
- Inherits former2's emitter limitation: repeated nested blocks (some SG rules,
  WAF statements, S3 lifecycle transitions) render as list literals.
- The generic AWS client implements what read-only discovery needs. A service
  whose discovery uses an unusual request shape may return nothing; run with
  `--debug` to see which `updateDatatable*` calls failed.
