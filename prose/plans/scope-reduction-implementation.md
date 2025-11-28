# Scope Reduction Implementation Plan (Phase 2)

## Overview

This plan outlines the implementation steps to reduce `@quillmark-test/web` to a utils-only library, removing all rendering functionality as described in the design document [`peer-dependency-rework.md`](../designs/peer-dependency-rework.md#scope-reduction-phase-2).

## Current State (After Phase 1)

The library currently exports:

```typescript
// Types
export type {
  QuillJson,
  FileTree,
  FileNode,
  QuillMetadata,
  RenderFormat,      // TO REMOVE
  RenderOptions,     // TO REMOVE
  ParsedDocument,    // TO REMOVE
  QuillInfo,         // TO REMOVE
  Artifact,          // TO REMOVE
  RenderResult,      // TO REMOVE
  QuillmarkEngine,   // TO REMOVE
} from './types';

// Loaders
export const loaders = {
  fromZip: _fromZip  // KEEP
};

// Exporters
export const exporters = {  // REMOVE ENTIRELY
  render: render_,
  toBlob: toBlob_,
  toDataUrl: toDataUrl_,
  toString: toString_,
  toElement: toElement_,
  download: download_
};

// Utils
export const utils = {
  detectBinaryFile,  // KEEP
  debounce           // KEEP
};
```

## Desired State (Phase 2)

```typescript
export type {
  QuillJson,
  FileTree,
  FileNode,
  QuillMetadata,
} from './types';

export const loaders = {
  fromZip: _fromZip
};

export const utils = {
  detectBinaryFile,
  debounce
};
```

## Implementation Phases

### Phase 2.1: Remove Exporters Module

**File: `src/lib/index.ts`**

- [ ] Remove all imports from `./exporters`
- [ ] Remove `exporters` object export
- [ ] Remove rendering-related type exports

**Changes:**
```diff
- import {
-   render as render_,
-   toBlob as toBlob_,
-   toDataUrl as toDataUrl_,
-   toElement as toElement_,
-   download as download_,
-   toString as toString_
- } from './exporters';
  import { fromZip as _fromZip } from './loaders';
  import { detectBinaryFile, debounce } from './utils';

  export type {
    QuillJson,
    FileTree,
    FileNode,
    QuillMetadata,
-   RenderFormat,
-   RenderOptions,
-   ParsedDocument,
-   QuillInfo,
-   Artifact,
-   RenderResult,
-   QuillmarkEngine,
  } from './types';

  export const loaders = {
    fromZip: _fromZip
  };

- export const exporters = {
-   render: render_,
-   toBlob: toBlob_,
-   toDataUrl: toDataUrl_,
-   toString: toString_,
-   toElement: toElement_,
-   download: download_
- };

  export const utils = {
    detectBinaryFile,
    debounce
  };
```

### Phase 2.2: Remove Types

**File: `src/lib/types.ts`**

- [ ] Remove `ParsedDocument` interface
- [ ] Remove `RenderFormat` type
- [ ] Remove `QuillInfo` interface
- [ ] Remove `Artifact` interface
- [ ] Remove `RenderResult` interface
- [ ] Remove `RenderOptions` interface
- [ ] Remove `QuillmarkEngine` interface

**Keep:**
```typescript
export interface QuillJson {
  files: FileTree;
  metadata?: QuillMetadata;
}

export interface FileTree {
  [key: string]: FileNode | FileTree;
}

export interface FileNode {
  contents: string | number[];
}

export interface QuillMetadata {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
}
```

### Phase 2.3: Delete Exporters File

**File: `src/lib/exporters.ts`**

- [ ] Delete the entire file (no longer needed)

### Phase 2.4: Update Playground

**File: `src/main.ts`**

- [ ] Remove `exporters` import
- [ ] Update rendering logic to use WASM directly
- [ ] Implement download functionality inline

### Phase 2.5: Update Tests

**File: `basic.test.js` and other test files**

- [ ] Remove tests for `exporters` module
- [ ] Verify remaining tests pass

### Phase 2.6: Update Documentation

**File: `README.md`**

- [ ] Update API documentation to reflect new scope
- [ ] Remove `exporters` documentation
- [ ] Update examples to show WASM direct usage
- [ ] Add migration notes for Phase 2

### Phase 2.7: Update Package Configuration

**File: `package.json`**

- [ ] Consider removing `@quillmark-test/wasm` from peerDependencies (now optional since loaders don't need it)
- [ ] Update version if needed

**Note:** Since `loaders.fromZip()` only uses `fflate` and doesn't depend on WASM, the peer dependency on `@quillmark-test/wasm` is now truly optional. It's only needed if consumers want to use the `QuillJson` type returned by `fromZip()` with the WASM engine. Consider whether to keep it as a peer dependency or remove it entirely.

## Testing Strategy

1. **Unit Tests**: Verify `loaders.fromZip()` works correctly
2. **Unit Tests**: Verify `utils.detectBinaryFile()` works correctly
3. **Unit Tests**: Verify `utils.debounce()` works correctly
4. **Integration Tests**: Verify playground works with WASM direct usage
5. **Type Checking**: Ensure TypeScript compilation succeeds
6. **Build Verification**: Library builds successfully

```bash
npm run build:lib    # Library builds
npm run build        # Full build including playground
npm test            # All tests pass
```

## Success Criteria

- [ ] No `exporters` in index.ts exports
- [ ] No rendering-related types exported
- [ ] `src/lib/exporters.ts` deleted
- [ ] `loaders.fromZip()` works correctly
- [ ] `utils.detectBinaryFile()` and `utils.debounce()` work correctly
- [ ] All remaining tests pass
- [ ] Library builds successfully
- [ ] Playground works with updated implementation
- [ ] README updated with new API surface

## File Summary

| File | Action |
|------|--------|
| `src/lib/index.ts` | Modify - remove exporters, update type exports |
| `src/lib/types.ts` | Modify - remove rendering types |
| `src/lib/exporters.ts` | Delete |
| `src/lib/loaders.ts` | No change |
| `src/lib/utils.ts` | No change |
| `src/main.ts` | Modify - update for direct WASM usage |
| `basic.test.js` | Modify - remove exporter tests |
| `README.md` | Modify - update API documentation |
| `package.json` | Review - consider peerDependencies |

## Dependencies

This work depends on Phase 1 (peer dependency rework) being completed.

## Related Documents

- Design: [`peer-dependency-rework.md`](../designs/peer-dependency-rework.md)
- Phase 1 Implementation: [`completed/peer-dependency-rework-implementation.md`](./completed/peer-dependency-rework-implementation.md)
