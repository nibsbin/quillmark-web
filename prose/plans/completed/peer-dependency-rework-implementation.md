# Peer Dependency Rework Implementation Plan

## Overview

This plan outlines the implementation steps to move `@quillmark-test/wasm` from a direct dependency to a peer dependency, as described in the design document [`peer-dependency-rework.md`](../designs/peer-dependency-rework.md).

## Current State

- `@quillmark-test/wasm` is a direct dependency in package.json
- `Quillmark` class is re-exported from index.ts
- `render()` function takes a `Quillmark` instance and `markdown: string`
- Consumer imports come from a single package

## Desired State

- `@quillmark-test/wasm` is a peer dependency
- No WASM re-exports in index.ts
- `render()` function takes a `QuillmarkEngine` interface and `ParsedDocument`
- Consumer imports come from two packages
- Version bumped to v2.0.0

## Implementation Phases

### Phase 1: Define Interfaces

**File: `src/lib/types.ts`**

- [ ] Add `QuillmarkEngine` interface describing the engine contract
- [ ] Ensure `ParsedDocument` interface is complete and matches WASM output

```typescript
export interface QuillmarkEngine {
  registerQuill(quill: QuillJson): void;
  getQuillInfo(quillName: string): QuillInfo;
  render(
    parsed: ParsedDocument,
    options: { format: RenderFormat } & Record<string, unknown>
  ): unknown;
}
```

### Phase 2: Update Exporters

**File: `src/lib/exporters.ts`**

- [ ] Remove `import { Quillmark } from '@quillmark-test/wasm'`
- [ ] Import `QuillmarkEngine` from `./types`
- [ ] Update `render()` signature:
  - Change first parameter type from `Quillmark` to `QuillmarkEngine`
  - Change second parameter from `markdown: string` to `parsed: ParsedDocument`
  - Remove internal `Quillmark.parseMarkdown()` call
- [ ] Update `getPreferredPreviewFormat()` to use the interface

**Before:**
```typescript
import { Quillmark } from '@quillmark-test/wasm';

export function render(
  engine: Quillmark,
  markdown: string,
  options?: RenderOptions
): RenderResult {
  const parsed: ParsedDocument = Quillmark.parseMarkdown(markdown);
  // ...
}
```

**After:**
```typescript
import type { QuillmarkEngine, ParsedDocument, /* ... */ } from './types';

export function render(
  engine: QuillmarkEngine,
  parsed: ParsedDocument,
  options?: RenderOptions
): RenderResult {
  const quillName = options?.quillName || parsed.quillTag;
  // ... rest unchanged
}
```

### Phase 3: Update Index Exports

**File: `src/lib/index.ts`**

- [ ] Remove `export { Quillmark } from '@quillmark-test/wasm'`
- [ ] Add `QuillmarkEngine` to type exports

**Before:**
```typescript
export { Quillmark } from '@quillmark-test/wasm';
```

**After:**
```typescript
// REMOVED: export { Quillmark } from '@quillmark-test/wasm';

export type {
  QuillJson,
  // ... existing types
  QuillmarkEngine,  // NEW
} from './types';
```

### Phase 4: Update Package Configuration

**File: `package.json`**

- [ ] Move `@quillmark-test/wasm` from `dependencies` to `peerDependencies`
- [ ] Set appropriate version constraint (`>=0.6.12`)
- [ ] Add `peerDependenciesMeta` for optional warning control
- [ ] Bump version to `2.0.0`

**Changes:**
```diff
{
- "version": "1.1.0",
+ "version": "2.0.0",
  "dependencies": {
-   "@quillmark-test/wasm": "^0.6.12",
    "fflate": "^0.8.2"
  },
+ "peerDependencies": {
+   "@quillmark-test/wasm": ">=0.6.12"
+ },
  "devDependencies": {
+   "@quillmark-test/wasm": "^0.6.12",
    // ... existing devDependencies
  }
}
```

Note: Add to devDependencies so development/testing continues to work.

### Phase 5: Update Playground

**File: `src/main.ts` (playground)**

- [ ] Update imports to source `Quillmark` from `@quillmark-test/wasm`
- [ ] Update render calls to pre-parse markdown

**Before:**
```typescript
import { Quillmark, loaders, exporters } from './lib';

const result = exporters.render(engine, markdown, { format: 'pdf' });
```

**After:**
```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, exporters } from './lib';

const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, { format: 'pdf' });
```

### Phase 6: Update Tests

**File: `basic.test.js` and other test files**

- [ ] Update test imports
- [ ] Update test render calls to use pre-parsed documents
- [ ] Verify all tests pass

### Phase 7: Update Documentation

**File: `README.md`**

- [ ] Update installation instructions to include both packages
- [ ] Update all code examples to show two-package import pattern
- [ ] Update API documentation for `render()` function
- [ ] Add v2.0.0 migration section
- [ ] Update version number in footer

**Installation section:**

```bash
npm install @quillmark/web-utils @quillmark-test/wasm
```

**Example updates:**

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, exporters } from '@quillmark/web-utils';

const engine = new Quillmark();
engine.registerQuill(quill);

const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, { format: 'pdf' });
```

### Phase 8: Add Migration Guide

**File: `README.md` (new section)**

- [ ] Document breaking changes
- [ ] Provide step-by-step migration instructions
- [ ] Show before/after code comparisons

## Testing Strategy

1. **Unit Tests**: Verify `render()` works with the new signature
2. **Integration Tests**: Verify playground works end-to-end
3. **Type Checking**: Ensure TypeScript compilation succeeds
4. **Build Verification**: Both library and playground build successfully

```bash
npm run build:lib    # Library builds
npm run build        # Full build including playground
npm test            # All tests pass
```

## Rollback Plan

If issues arise:
- Revert package.json version to 1.1.0
- Re-add `@quillmark-test/wasm` to dependencies
- Restore `Quillmark` export in index.ts
- Restore original `render()` signature

## Success Criteria

- [ ] No `@quillmark-test/wasm` in `dependencies`
- [ ] `@quillmark-test/wasm` in `peerDependencies` with `>=0.6.12`
- [ ] No `Quillmark` export from index.ts
- [ ] `render()` accepts `QuillmarkEngine` and `ParsedDocument`
- [ ] All tests pass
- [ ] Library builds successfully
- [ ] Playground works correctly
- [ ] README updated with migration guide
- [ ] Version is `2.0.0`

## Timeline Estimate

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Define interfaces | Pending |
| 2 | Update exporters | Pending |
| 3 | Update index exports | Pending |
| 4 | Update package.json | Pending |
| 5 | Update playground | Pending |
| 6 | Update tests | Pending |
| 7 | Update documentation | Pending |
| 8 | Add migration guide | Pending |

## Dependencies

This work has no external dependencies. All changes are internal to the repository.

## Related Documents

- Design: [`peer-dependency-rework.md`](../designs/peer-dependency-rework.md)
- Previous API work: [`api-redesign.md`](../designs/api-redesign.md)
