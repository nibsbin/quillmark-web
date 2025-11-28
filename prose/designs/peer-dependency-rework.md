# Peer Dependency Rework for @quillmark-test/wasm

## Overview

This design document describes a major breaking change (v2.0.0) to decouple `@quillmark/web-utils` from its dependency on `@quillmark-test/wasm` by making it a peer dependency instead of a direct dependency. This allows consumers to manage their own WASM version and prevents re-exporting of WASM types.

> **Update (Phase 2 Scope Reduction)**: The library is now focused on utilities only. Rendering functionality has been removed. See [Scope Reduction](#scope-reduction-phase-2) for details.

## Problem Statement

The current implementation has several issues:

1. **Tight Coupling**: `@quillmark/web-utils` re-exports `Quillmark` from `@quillmark-test/wasm`, creating a tight coupling between the libraries.

2. **Version Lock-in**: Consumers are locked to the specific WASM version bundled with `@quillmark/web-utils`, preventing them from:
   - Using newer WASM features before a web library release
   - Pinning to older WASM versions for stability
   - Managing WASM versions across multiple projects consistently

3. **Type Leakage**: Re-exporting the `Quillmark` class exposes internal WASM types as part of the web library's public API surface.

4. **Duplicate Installations**: Projects using both libraries directly may end up with multiple WASM installations.

## Current State

### Package Configuration
```json
{
  "dependencies": {
    "@quillmark-test/wasm": "^0.6.12",
    "fflate": "^0.8.2"
  }
}
```

### Export Structure
```typescript
// src/lib/index.ts
export { Quillmark } from '@quillmark-test/wasm';
```

### Internal Usage
```typescript
// src/lib/exporters.ts
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

### Consumer Usage
```typescript
import { Quillmark, loaders, exporters } from '@quillmark/web-utils';
const engine = new Quillmark();
```

## Proposed Design

### Package Configuration

Move `@quillmark-test/wasm` to `peerDependencies`:

```json
{
  "peerDependencies": {
    "@quillmark-test/wasm": ">=0.6.12"
  },
  "dependencies": {
    "fflate": "^0.8.2"
  }
}
```

### New Interface Abstraction

Define a `QuillmarkEngine` interface that describes the required engine behavior without depending on the concrete `Quillmark` class:

```typescript
// src/lib/types.ts

/**
 * Interface describing the Quillmark engine API consumed by this library.
 * 
 * This abstraction allows @quillmark/web-utils to accept any compatible engine
 * implementation without directly depending on @quillmark-test/wasm types.
 */
export interface QuillmarkEngine {
  /** Register a quill template with the engine */
  registerQuill(quill: QuillJson): void;
  
  /** Get information about a registered quill */
  getQuillInfo(quillName: string): QuillInfo;
  
  /** Render a parsed document */
  render(parsed: ParsedDocument, options: { format: RenderFormat } & Record<string, unknown>): unknown;
}

```

### Updated Export Structure

Remove the `Quillmark` re-export:

```typescript
// src/lib/index.ts

// REMOVED: export { Quillmark } from '@quillmark-test/wasm';

export type {
  QuillJson,
  FileTree,
  FileNode,
  QuillMetadata,
  RenderFormat,
  RenderOptions,
  ParsedDocument,
  QuillInfo,
  Artifact,
  RenderResult,
  QuillmarkEngine,   // NEW
} from './types';

export const loaders = { fromZip: _fromZip };
export const exporters = { render: render_, /* ... */ };
export const utils = { detectBinaryFile, debounce };
```

### Updated Function Signatures

Two approaches were considered for updating the `render()` function:

#### Option A: Pass Static Parser (Rejected)

This approach would require consumers to pass the `parseMarkdown` function:

```typescript
// NOT RECOMMENDED - adds complexity
export function render(
  engine: QuillmarkEngine,
  markdown: string,
  options?: RenderOptions & { parseMarkdown: (md: string) => ParsedDocument }
): RenderResult
```

This was rejected because:
- Awkward API requiring static method to be passed
- Consumers have to remember an extra required option
- No clear benefit over pre-parsing

#### Option B: Accept Pre-parsed Document (Recommended)

Instead of requiring a parser function, accept `ParsedDocument` directly:

```typescript
// Alternative: Consumer pre-parses the markdown
export function render(
  engine: QuillmarkEngine,
  parsed: ParsedDocument,
  options?: RenderOptions
): RenderResult {
  const quillName = options?.quillName || parsed.quillTag;
  const format = options?.format || getPreferredPreviewFormat(engine, quillName);
  const rawResult = engine.render(parsed, { format, ...options });
  return normalizeWasmResult(rawResult);
}
```

This approach:
- Eliminates the need to pass a static function
- Makes the pre-parsing step explicit
- Keeps the library free of any WASM imports

### Consumer Usage (After Change)

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, exporters } from '@quillmark/web-utils';

// Setup
const quill = await loaders.fromZip(await fetch('/templates/letter.zip').then(r => r.blob()));
const engine = new Quillmark();
engine.registerQuill(quill);

// Pre-parse markdown, then render
const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, { format: 'pdf' });

exporters.download(result, 'output.pdf');
```

## Design Decision

**Chosen: Pre-parsed Document Approach**

Rationale:
1. **Cleaner API**: No need to pass static methods around
2. **Explicit Parsing**: Consumer controls when parsing happens
3. **Better Caching**: Consumer can cache parsed documents for re-rendering
4. **Zero WASM Imports**: The web library has no WASM imports at all
5. **Type Safety**: `ParsedDocument` is a plain interface, fully under our control

## Breaking Changes Summary

| Change | v1.x | v2.0.0 |
|--------|------|--------|
| Package type | Direct dependency | Peer dependency |
| `Quillmark` export | Re-exported | Removed |
| `render()` first param | `engine: Quillmark` | `engine: QuillmarkEngine` |
| `render()` second param | `markdown: string` | `parsed: ParsedDocument` |
| Consumer imports | Single package | Two packages |

## Migration Guide

### Step 1: Install Peer Dependency

```bash
npm install @quillmark-test/wasm
```

### Step 2: Update Imports

```diff
- import { Quillmark, loaders, exporters } from '@quillmark/web-utils';
+ import { Quillmark } from '@quillmark-test/wasm';
+ import { loaders, exporters } from '@quillmark/web-utils';
```

### Step 3: Update Render Calls

```diff
- const result = exporters.render(engine, markdown, { format: 'pdf' });
+ const parsed = Quillmark.parseMarkdown(markdown);
+ const result = exporters.render(engine, parsed, { format: 'pdf' });
```

## Type Compatibility Considerations

The `QuillmarkEngine` interface must remain compatible with the `Quillmark` class from `@quillmark-test/wasm`. TypeScript's structural typing ensures this works as long as the class implements the required methods.

If the WASM library changes its API in a way that breaks the interface:
- `@quillmark/web-utils` would need a corresponding update
- The `peerDependencies` version constraint would need to be updated

## Versioning

This is a **major breaking change** requiring a version bump to **v2.0.0**.

The semver guarantees:
- v1.x consumers can continue using v1.x
- v2.x consumers must update their code per the migration guide

---

## Scope Reduction (Phase 2)

### Rationale

After implementing Phase 1 (peer dependency rework), a strategic decision was made to further simplify the library. The `exporters` module, while useful, creates a thin wrapper over WASM functionality that:

1. **Adds maintenance burden**: Changes to WASM output formats require updates to the web library
2. **Limits flexibility**: Consumers are constrained to the abstraction layer's interpretation of WASM results
3. **Duplicates effort**: Most consumers will import WASM directly anyway for `parseMarkdown()` and rendering

### New Library Focus: Utilities Only

The library will focus exclusively on utilities that are genuinely independent of WASM:

| Module | Purpose | WASM Dependency |
|--------|---------|-----------------|
| `loaders.fromZip()` | Load Quill templates from zip files | None (uses fflate) |
| `utils.detectBinaryFile()` | Check if filename indicates binary content | None |
| `utils.debounce()` | Generic debounce utility | None |

### What to Remove

| Component | Reason for Removal |
|-----------|-------------------|
| `exporters.render()` | Consumers should use WASM directly |
| `exporters.toBlob()` | Works with RenderResult from render() |
| `exporters.toDataUrl()` | Works with RenderResult from render() |
| `exporters.toString()` | Works with RenderResult from render() |
| `exporters.toElement()` | Works with RenderResult from render() |
| `exporters.download()` | Works with RenderResult from render() |
| `QuillmarkEngine` interface | No longer needed without render() |
| `RenderFormat` type | Rendering-specific |
| `RenderOptions` type | Rendering-specific |
| `ParsedDocument` type | Rendering-specific |
| `QuillInfo` type | Rendering-specific |
| `Artifact` type | Rendering-specific |
| `RenderResult` type | Rendering-specific |

### What to Keep

**Types for Loaders:**
- `QuillJson` - Return type of `fromZip()`
- `FileTree` - Structure within QuillJson
- `FileNode` - Individual file entries
- `QuillMetadata` - Optional metadata in QuillJson

### New API Surface (Phase 2)

```typescript
// src/lib/index.ts

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

### Updated Consumer Usage (Phase 2)

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, utils } from '@quillmark/web-utils';

// Load a quill template (utility from @quillmark/web-utils)
const quill = await loaders.fromZip(await fetch('/templates/letter.zip').then(r => r.blob()));

// Setup engine (WASM directly)
const engine = new Quillmark();
engine.registerQuill(quill);

// Parse and render (WASM directly)
const parsed = Quillmark.parseMarkdown(markdown);
const result = engine.render(parsed, { format: 'pdf' });

// Handle result (consumer's responsibility)
const blob = new Blob([result.artifacts], { type: 'application/pdf' });
```

### Benefits of Scope Reduction

1. **Simpler maintenance**: Fewer moving parts, less coupling to WASM changes
2. **Clearer responsibility**: Library does one thing well (utilities)
3. **Consumer flexibility**: Full control over rendering workflow
4. **Smaller bundle**: Remove rendering abstraction layer
5. **Future-proof**: WASM API changes don't require web library updates

### Phase 2 Migration Guide

For consumers using Phase 1 API (with exporters):

```diff
  import { Quillmark } from '@quillmark-test/wasm';
- import { loaders, exporters } from '@quillmark/web-utils';
+ import { loaders } from '@quillmark/web-utils';

  const quill = await loaders.fromZip(zipFile);
  const engine = new Quillmark();
  engine.registerQuill(quill);

  const parsed = Quillmark.parseMarkdown(markdown);
- const result = exporters.render(engine, parsed, { format: 'pdf' });
- exporters.download(result, 'document.pdf');
+ const result = engine.render(parsed, { format: 'pdf' });
+ // Handle download manually
+ const blob = new Blob([result.artifacts], { type: 'application/pdf' });
+ const url = URL.createObjectURL(blob);
+ const a = document.createElement('a');
+ a.href = url;
+ a.download = 'document.pdf';
+ a.click();
+ URL.revokeObjectURL(url);
```

### Standalone Converter Utilities Decision

**Question**: Should we keep any converter functions (toBlob, toDataUrl, etc.) as standalone utilities that work with `Uint8Array`?

**Decision**: No. These functions are simple enough that consumers can implement them inline or use standard browser APIs:

- `toBlob(bytes, mimeType)` → `new Blob([bytes], { type: mimeType })`
- `toDataUrl(blob)` → `FileReader.readAsDataURL()` or `URL.createObjectURL()`
- `download(blob, filename)` → Standard anchor tag download pattern

Keeping these would add little value while increasing the API surface to maintain.
