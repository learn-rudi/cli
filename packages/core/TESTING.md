# RUDI Core Testing Guide

`@learnrudi/core` uses Node's built-in test runner through the repository test
wrapper. The suite covers package resolution, installation, configuration,
stack lifecycle, tool indexing, and selected end-to-end runtime behavior.

Test counts and timings are intentionally omitted because they change as the
suite evolves. The test runner output is the source of truth.

## Commands

From `packages/core/`:

```bash
pnpm test                    # Fast unit + integration suite
pnpm test:unit               # Deterministic unit tests
pnpm test:integration        # Integration tests with npm installs skipped
pnpm test:integration:full   # Integration tests including npm installs
pnpm test:e2e                # Ollama-dependent end-to-end tests
pnpm test:all                # All layers; E2E is skipped by default
pnpm test:watch              # Watch the unit suite
```

From the CLI repository root:

```bash
pnpm --filter @learnrudi/core test
node scripts/run-tests.js packages/core/src/__tests__/unit/
node scripts/run-tests.js packages/core/src/__tests__/unit/tool-index.test.js
```

## Test Layers

### Unit

Unit tests live in `src/__tests__/unit/` and cover behavior including:

- platform and registry resolution
- installer command execution, installed-package discovery, and state preservation
- bundled and related skill installation
- RUDI configuration
- stack lifecycle behavior
- tool-index generation

### Integration

Integration tests live in `src/__tests__/integration/`. They use isolated
temporary directories and exercise real filesystem and process boundaries.
The default integration command sets `SKIP_NPM_TESTS=true` to avoid slow or
network-sensitive package installation.

### End to end

End-to-end tests live in `src/__tests__/e2e/`. The Ollama flow requires a local
Ollama server and its configured embedding model. These tests are skipped by
the default `test:all` path; run `pnpm test:e2e` explicitly when prerequisites
are available.

## Environment Controls

| Variable | Effect |
| --- | --- |
| `SKIP_NPM_TESTS=true` | Skip integration cases that perform npm installs. |
| `SKIP_E2E=true` | Skip external-runtime end-to-end cases. |
| `VERBOSE=true` | Use the verbose/spec reporter. |
| `TEST_REPORTER=<name>` | Override the Node test reporter. |

## Adding Behavior

For behavior-bearing changes, follow the repository red-green-refactor rule:

1. Add one behavior-level test.
2. Run it and confirm the expected failure.
3. Implement the smallest change that passes it.
4. Rerun the unchanged test.
5. Refactor only while the affected tests remain green.

Tests must isolate filesystem state, avoid the real `~/.rudi`, clean up their
temporary resources, and cover relevant failure paths as well as successful
behavior.

The package scripts in `package.json` and the files under `src/__tests__/` are
authoritative when this guide and the implementation differ.
