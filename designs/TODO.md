# Production-readiness checklist — trimmed

This is a much smaller, actionable checklist for the near term. We don't need security monitoring, complex release automation, or heavy infrastructure yet — just the essentials to build, test, document, and publish the library when needed.

## Quick status

Completed:
- Core library in `src/lib/`
- Basic loaders and renderers
- Playground/demo

Short-term priorities:
- Build & package the library
- Minimal automated tests
- Clear README and a small example
- A simple CI to run tests and build on PRs

---

## 1. Build & packaging (minimal)

Goal: Produce a consumable npm package without extra complexity.

- [ ] Add a library build config (e.g. `vite.config.lib.ts`) with `src/lib/index.ts` as the entry.
- [ ] Add `build:lib` and `build:playground` scripts to `package.json`, and a top-level `build` that runs both.
- [ ] Produce ESM and CommonJS outputs and TypeScript declarations in `dist/` (keep UMD optional).
- [ ] Ensure peer-dependency `@quillmark-test/wasm` is declared as a peer dependency.
- [ ] Keep source maps enabled for easier debugging.

Files to touch: `vite.config.lib.ts` (optional), `package.json`, `tsconfig.json` or `tsconfig.lib.json`.

---

## 2. Minimal tests

Goal: Fast feedback for core functionality.

- [ ] Add `vitest` and test setup (basic `vitest.config.ts`).
- [ ] Create a small set of unit tests for critical paths:
  - loaders: `fromZip()` happy path + missing Quill.toml
  - utils: `detectBinaryFile()`, `debounce()` basic behavior
  - renderers: smoke tests for `renderToBlob()` / `renderToDataUrl()` (mock engine)
- [ ] Wire `npm test` to run the test suite.

Keep coverage goals informal for now — we want reliable tests, not a strict % threshold.

---

## 3. Documentation & example

Goal: Help users get started quickly.

- [ ] Update `README.md` with install, quick-start, and a minimal example that shows loading a quill and rendering it.
- [ ] Add a small `examples/vanilla-js/` (single HTML + script) demonstrating basic usage.
- [ ] Keep API docs light — enhance inline JSDoc comments and add examples where helpful.

---

## 4. Simple CI

Goal: Run tests and build on PRs and pushes to `main` without a big matrix.

- [ ] Add a single GitHub Actions workflow `.github/workflows/ci.yml` that runs on PR and push to `main`.
  - Checkout, setup Node (single supported version), install, run `npm test`, run `npm run build`.
- [ ] Defer cross-platform matrices, Codecov uploads, and publishing automation until needed.

---

## Phase 6: Release Process

### 6.1 Versioning Strategy

**Goal:** Semantic versioning with clear release process

- [ ] Adopt [Semantic Versioning](https://semver.org/)
- [ ] Use conventional commits for automatic versioning
- [ ] Install and configure `semantic-release`:
  - [ ] Auto-determine version bumps
  - [ ] Generate changelog
  - [ ] Create git tags
  - [ ] Publish to npm
- [ ] Or use `np` for manual releases with safety checks
- [ ] Define version stages:
  - [ ] 0.1.x - Alpha (breaking changes expected)
  - [ ] 0.x.x - Beta (feature complete, stabilizing)
  - [ ] 1.0.0 - First stable release
  - [ ] 1.x.x - Stable (SemVer compliance)

### 6.2 Pre-release Checklist

**Goal:** Ensure quality before each release

Create `.github/PULL_REQUEST_TEMPLATE.md`:
- [ ] All tests pass
- [ ] Code coverage meets thresholds
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)
- [ ] Examples updated
- [ ] Version bumped appropriately
- [ ] Git tag created

**Files to create:**
- `.github/PULL_REQUEST_TEMPLATE.md`
- `RELEASING.md` (internal release process)

### 6.3 NPM Publishing Setup

**Goal:** Prepare for npm registry publication

- [ ] Create npm account (if needed)
- [ ] Set up npm organization `@quillmark` or appropriate scope
- [ ] Configure `.npmrc` for registry settings
- [ ] Add `.npmignore` to exclude dev files:
  - [ ] `src/` (source files, ship dist only)
  - [ ] `examples/`
  - [ ] `*.test.ts`
  - [ ] `.github/`
  - [ ] Development configs
- [ ] Test package locally:
  - [ ] `npm pack` to generate tarball
  - [ ] Test installation in separate project
  - [ ] Verify all exports work
- [ ] Set up npm automation token for CI/CD
- [ ] Configure 2FA for npm account

**Files to create:**
- `.npmignore`
- `.npmrc` (optional, for team settings)
