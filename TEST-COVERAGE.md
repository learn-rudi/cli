# RUDI CLI Test Coverage Analysis

**Generated:** 2026-01-09
**Status:** 🟡 Partial Coverage

---

## Current State

| Package | Tests | Coverage | Priority |
|---------|-------|----------|----------|
| **@learnrudi/core** | ✅ 40 tests | ~90% | ✅ Complete |
| @learnrudi/embeddings | ❌ None | 0% | 🔴 Critical |
| @learnrudi/db | ❌ None | 0% | 🔴 Critical |
| @learnrudi/registry-client | ❌ None | 0% | 🟡 High |
| @learnrudi/manifest | ❌ None | 0% | 🟡 High |
| @learnrudi/mcp | ❌ None | 0% | 🟡 High |
| @learnrudi/runner | ❌ None | 0% | 🟢 Medium |
| @learnrudi/secrets | ❌ None | 0% | 🟢 Medium |
| @learnrudi/env | ❌ None | 0% | 🟢 Medium |
| @learnrudi/utils | ❌ None | 0% | 🟢 Low |
| **Main CLI** | ❌ None | 0% | 🟡 High |

**Total Coverage:** ~8% (1/11 packages tested)

---

## Critical Gaps (🔴 High Priority)

### 1. @learnrudi/embeddings

**What it does:**
- Ollama provider (localhost:11434)
- OpenAI provider (API)
- Embedding generation for semantic search
- Auto-detection (Ollama → OpenAI fallback)

**Needs testing:**
```
├── Unit Tests
│   ├── Provider auto-detection logic
│   ├── Ollama client configuration
│   ├── OpenAI client configuration
│   └── Error handling (API failures, network issues)
├── Integration Tests
│   ├── Generate embeddings via Ollama (if available)
│   ├── Generate embeddings via OpenAI (with mock)
│   ├── Batch embedding generation
│   └── Dimension validation (768 for nomic, 1536 for OpenAI)
└── E2E Tests
    ├── Full embedding flow with real Ollama
    └── Fallback behavior when Ollama unavailable
```

**Critical test cases:**
- ✅ Auto-detect Ollama at localhost:11434
- ✅ Fallback to OpenAI when Ollama not available
- ✅ Generate 768-dim embeddings (nomic-embed-text)
- ✅ Handle network errors gracefully
- ✅ Batch embedding with proper chunking

---

### 2. @learnrudi/db

**What it does:**
- SQLite database operations
- Session import/export
- Turn embeddings storage
- Semantic search queries

**Needs testing:**
```
├── Unit Tests
│   ├── Schema initialization
│   ├── Session CRUD operations
│   ├── Turn embeddings insert/query
│   └── Search query building
├── Integration Tests
│   ├── Import sessions from various sources
│   ├── Store embeddings with metadata
│   ├── Semantic search with cosine similarity
│   └── Database migration handling
└── Performance Tests
    ├── Large session import (1000+ turns)
    └── Search performance (10k+ embeddings)
```

**Critical test cases:**
- ✅ Create/initialize database schema
- ✅ Import sessions (Claude, Cursor, Windsurf formats)
- ✅ Store turn embeddings with session FK
- ✅ Semantic search returns ranked results
- ✅ Handle concurrent writes safely

---

## High Priority (🟡)

### 3. @learnrudi/registry-client

**What it does:**
- Fetch registry index from GitHub
- Download packages (stacks, runtimes, binaries)
- Cache management
- Local dev fallback

**Needs testing:**
```
├── Unit Tests
│   ├── URL construction
│   ├── Cache TTL logic
│   ├── Local registry fallback
│   └── Manifest parsing
├── Integration Tests
│   ├── Fetch real registry index
│   ├── Download small package
│   ├── Cache hit/miss behavior
│   └── Network error handling
└── E2E Tests
    └── Full package download → extract → verify flow
```

**Critical test cases:**
- ✅ Fetch registry index (with cache)
- ✅ Parse package manifests correctly
- ✅ Download with progress reporting
- ✅ Verify checksums on download
- ✅ Fallback to local registry in dev mode

---

### 4. @learnrudi/manifest

**What it does:**
- Parse stack.yaml, prompt.yaml
- Validate against JSON schema
- Runtime/binary manifest validation

**Needs testing:**
```
├── Unit Tests
│   ├── Parse valid stack.yaml
│   ├── Parse valid prompt.yaml
│   ├── Reject invalid manifests
│   └── Schema validation errors
└── Integration Tests
    ├── Parse real manifests from registry
    └── Validate all registry packages
```

**Critical test cases:**
- ✅ Parse valid YAML manifests
- ✅ Validate required fields (id, kind, name, version)
- ✅ Reject invalid manifests with clear errors
- ✅ Handle YAML syntax errors gracefully

---

### 5. @learnrudi/mcp

**What it does:**
- Detect AI agents (Claude, Cursor, Windsurf, etc.)
- Read/write MCP server configs
- Handle different config formats (JSON, TOML)

**Needs testing:**
```
├── Unit Tests
│   ├── Agent detection logic
│   ├── Config path resolution
│   ├── JSON config read/write
│   ├── TOML config read/write
│   └── Merge behavior for updates
├── Integration Tests
│   ├── Detect real agents on system
│   ├── Register MCP server to agent
│   ├── Update existing MCP config
│   └── Handle missing config files
└── E2E Tests
    └── Full flow: detect → register → verify
```

**Critical test cases:**
- ✅ Detect Claude Desktop config
- ✅ Register MCP server to claude_desktop_config.json
- ✅ Handle TOML format (Codex)
- ✅ Preserve existing MCP servers on update
- ✅ Handle missing config directories

---

### 6. Main CLI

**What it does:**
- Command routing (install, remove, search, etc.)
- Argument parsing
- User interaction (prompts, progress)
- Error handling

**Needs testing:**
```
├── Unit Tests
│   ├── Argument parsing
│   ├── Command validation
│   └── Error message formatting
├── Integration Tests
│   ├── rudi install <package>
│   ├── rudi remove <package>
│   ├── rudi search <query>
│   ├── rudi list
│   └── rudi doctor
└── E2E Tests
    ├── Full install → run → remove flow
    └── Error recovery scenarios
```

**Critical test cases:**
- ✅ Parse CLI arguments correctly
- ✅ Route to correct command handler
- ✅ Display user-friendly errors
- ✅ Handle missing dependencies gracefully
- ✅ Exit codes (0 for success, 1 for error)

---

## Medium Priority (🟢)

### 7. @learnrudi/runner

**What it does:**
- Spawn MCP server processes
- Stream stdout/stderr
- Secret injection
- Process lifecycle management

**Needs testing:**
```
├── Unit Tests
│   ├── Command building
│   ├── Environment variable merging
│   └── Secret redaction
├── Integration Tests
│   ├── Spawn simple process (echo)
│   ├── Capture stdout/stderr
│   ├── Handle process exit codes
│   └── Timeout handling
└── Stress Tests
    └── Multiple concurrent processes
```

---

### 8. @learnrudi/secrets

**What it does:**
- Read/write secrets.json
- Encrypt sensitive data
- Secret validation

**Needs testing:**
```
├── Unit Tests
│   ├── Parse secrets file
│   ├── Validate secret format
│   └── Merge secrets
└── Integration Tests
    ├── Write secrets to file
    └── Read secrets with permissions check
```

---

### 9. @learnrudi/env

**What it does:**
- PATHS constant (~/.rudi directories)
- Platform detection (darwin, linux, win32)
- Architecture detection (arm64, x64)

**Needs testing:**
```
├── Unit Tests
│   ├── Platform key generation
│   ├── Path resolution
│   └── Package path utilities
└── Integration Tests
    └── Verify PATHS directories exist
```

---

## Test Infrastructure Needed

### Package Test Templates

Each package should have:
```
packages/<name>/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   └── index.js
├── scripts/
│   └── test.sh
└── package.json (with test scripts)
```

### Shared Test Utilities

Create `packages/test-utils/` with:
- Mock providers (Ollama, OpenAI)
- Temp directory helpers
- Database fixtures
- MCP test harness
- CLI test runner

---

## Recommended Implementation Order

### Phase 1: Critical Foundation (Week 1)
1. **@learnrudi/embeddings** - Core functionality for search
2. **@learnrudi/db** - Data persistence layer

### Phase 2: Registry & Install (Week 2)
3. **@learnrudi/registry-client** - Package discovery
4. **@learnrudi/manifest** - Validation layer

### Phase 3: Integration (Week 3)
5. **@learnrudi/mcp** - Agent integration
6. **Main CLI** - User-facing commands

### Phase 4: Supporting (Week 4)
7. **@learnrudi/runner** - Process management
8. **@learnrudi/secrets** - Security
9. **@learnrudi/env** - Platform utilities
10. **@learnrudi/utils** - Helpers

---

## Coverage Goals

| Milestone | Coverage | Packages Tested | Status |
|-----------|----------|-----------------|--------|
| Current | 8% | 1/11 | ✅ Done |
| Phase 1 | 30% | 3/11 | 🎯 Next |
| Phase 2 | 50% | 5/11 | - |
| Phase 3 | 70% | 7/11 | - |
| Phase 4 | 90% | 11/11 | - |

---

## Test Metrics

### Target Metrics
- **Unit test coverage:** >80% per package
- **Integration coverage:** >60% per package
- **E2E coverage:** >40% critical flows
- **Test execution time:** <5s for fast CI
- **Flakiness rate:** <1%

### Current Metrics
- **Unit tests:** 22 (core only)
- **Integration tests:** 10 (core only)
- **E2E tests:** 8 (core only)
- **Total runtime:** ~920ms
- **Flakiness:** 0% ✅

---

## Quick Start: Adding Tests to a Package

1. **Create test directory:**
   ```bash
   mkdir -p packages/<name>/src/__tests__/{unit,integration,fixtures}
   ```

2. **Add test script:**
   ```json
   // package.json
   "scripts": {
     "test": "node --test src/__tests__/",
     "test:unit": "node --test src/__tests__/unit/",
     "test:watch": "node --test --watch src/__tests__/unit/"
   }
   ```

3. **Write first test:**
   ```javascript
   // src/__tests__/unit/index.test.js
   import { test } from 'node:test';
   import assert from 'node:assert';
   import { myFunction } from '../../index.js';

   test('myFunction: basic behavior', () => {
     const result = myFunction('input');
     assert.strictEqual(result, 'expected');
   });
   ```

4. **Run tests:**
   ```bash
   pnpm test --filter @learnrudi/<name>
   ```

---

## CI/CD Integration

### Fast CI (All PRs)
```yaml
- name: Test
  run: |
    pnpm test --filter @learnrudi/core
    pnpm test --filter @learnrudi/embeddings
    pnpm test --filter @learnrudi/db
  env:
    SKIP_E2E: true
    SKIP_NPM_TESTS: true
  # Duration target: <10s
```

### Full CI (Main branch)
```yaml
- name: Test All Packages
  run: pnpm test -r --if-present
  # Duration target: <2 minutes
```

---

## Next Steps

1. **Immediate:** Create tests for @learnrudi/embeddings (highest impact)
2. **This week:** Add tests for @learnrudi/db (semantic search validation)
3. **Next week:** Registry and manifest validation tests
4. **Ongoing:** Maintain >80% coverage as new features added

---

**Want me to start with one of these packages?** I recommend:
1. **embeddings** - Most critical for search functionality
2. **db** - Data layer validation
3. **mcp** - Agent integration reliability
