# Simplification Cascades - Quillmark Web

> **Date:** 2025-11-15
> **Status:** Identified
> **Impact:** High - These cascades could eliminate significant complexity

## Overview

This document identifies 5 major simplification cascades in the quillmark-web codebase - places where one insight can eliminate multiple components, special cases, or duplicate implementations.

---

## Cascade 1: Artifact Type Juggling 🔥 HIGHEST IMPACT

**Location:** `src/lib/exporters.ts:19-70`

### The Variations

The `toArrayBuffer()` function handles **7+ different input types**:

1. `null/undefined` → empty buffer
2. `{ bytes: ... }` wrapper objects
3. `ArrayBuffer` instances
4. `Uint8Array` with special copy semantics
5. Plain arrays
6. Strings (with base64 detection!)
7. Iterable objects via `Array.from()`

Plus `extractArtifact()` adds 3 more structural variations:
- Array format: `result.artifacts[0]`
- Object format: `result.artifacts.main`
- Direct format: `result.artifacts`

**Total: 10+ different input paths!**

### The Essence

**All artifacts are just bytes from WASM.** The complexity exists because the data contract evolved over time without standardization.

### The Abstraction

**Insight:** "If WASM always returns a standard `RenderResult`, we don't need type juggling"

```typescript
// Proposed standard contract
interface RenderResult {
  artifacts: {
    main: Uint8Array;  // Always Uint8Array, never wrapped/nested
    [key: string]: Uint8Array;  // Named artifacts if needed
  };
  metadata?: {
    format: 'pdf' | 'svg' | 'txt';
    // ... other metadata
  };
}

// Simplified extractor (replaces 70 lines with ~5)
function extractArtifact(result: RenderResult): ArrayBuffer {
  return result.artifacts.main.buffer;
}
```

### The Test

Does every current use case fit?
- ✅ PDF rendering → `main` artifact
- ✅ SVG rendering → `main` artifact
- ✅ Multi-artifact documents → named keys
- ✅ Error cases → throw before creating result

### The Cascade

**Eliminates:**
- 7 type conversion branches
- 3 structural extraction paths
- Base64 detection logic
- Recursive unwrapping
- ~60 lines of defensive code

**Impact:** Reduces `toArrayBuffer()` + `extractArtifact()` from ~70 lines to ~5 lines

---

## Cascade 2: Binary File Detection Duplication

**Locations:**
- `src/lib/utils.ts:5-26` (Set-based)
- `src/lib/quillLoader.js:25` (Regex-based)

### The Variations

Two different implementations detecting binary files:

```typescript
// utils.ts - Set-based approach
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.pdf', '.ttf', '.otf', '.woff', '.woff2',
  '.zip', '.tar', '.gz'
]);

export function isBinaryFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

// quillLoader.js - Regex approach
const isBinary = /\.(png|jpg|jpeg|gif|pdf|woff|woff2|ttf|otf)$/i.test(entry.name);
```

**Problems:**
- Different extension lists (utils.ts has more)
- Different detection methods
- Risk of divergence over time

### The Essence

**All file type detection is extension-based.** Both are doing the same thing with slightly different lists.

### The Abstraction

**Insight:** "One canonical binary extension list, one detection method"

```typescript
// utils.ts - Single source of truth
export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.pdf', '.ttf', '.otf', '.woff', '.woff2',
  '.zip', '.tar', '.gz', '.7z'
]);

export function isBinaryFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

// quillLoader.js - Import and use
import { isBinaryFile } from './utils.ts';
const isBinary = isBinaryFile(entry.name);
```

### The Test

Does it handle all cases?
- ✅ Image files (png, jpg, gif, webp, bmp, ico)
- ✅ Font files (ttf, otf, woff, woff2)
- ✅ Documents (pdf)
- ✅ Archives (zip, tar, gz)

### The Cascade

**Eliminates:**
- 1 duplicate implementation
- Regex maintenance
- Extension list divergence risk

**Impact:** Single source of truth for binary detection across codebase

---

## Cascade 3: Directory Loading Logic Duplication

**Locations:**
- `scripts/package-quills.js:27-44` - `readDirectoryRecursive()`
- `src/lib/quillLoader.js:13-44` - `loadDirectory()`

### The Variations

Two nearly identical functions that recursively traverse directories:

```javascript
// Both create the same nested structure:
// {
//   'file.txt': { contents: '...' },
//   'dir': {
//     'nested.txt': { contents: '...' }
//   }
// }
```

### The Essence

**All Quill loading is file tree construction.** The source (filesystem, zip, network) differs, but the output structure is identical.

### The Abstraction

**Insight:** "File tree construction is source-agnostic"

```typescript
// Proposed abstraction
interface FileSource {
  list(): Promise<string[]>;
  read(path: string): Promise<Uint8Array | string>;
  isDirectory(path: string): Promise<boolean>;
}

async function buildFileTree(source: FileSource, root: string): Promise<QuillFiles> {
  // Single implementation that works for any source
}

// Implementations
class FilesystemSource implements FileSource { ... }
class ZipSource implements FileSource { ... }
class NetworkSource implements FileSource { ... }
```

### The Test

Can all current sources use this?
- ✅ Node.js filesystem (scripts/package-quills.js)
- ✅ Browser zip files (src/lib/loaders.ts)
- ✅ Future: Network fetching
- ✅ Future: In-memory testing

### The Cascade

**Eliminates:**
- 2 duplicate recursive implementations
- Source-specific tree building logic
- ~40 lines of duplicate code

**Impact:** Unified file tree construction, easier to add new sources

---

## Cascade 4: Markdown File Extraction Duplication

**Location:** `src/main.ts:78-87` and `106-118`

### The Variations

Identical logic repeated twice to find the main markdown file:

```typescript
// First occurrence (lines 78-87)
const initialName = initial.replace(/\.zip$/i, '');
const candidateKeys = Object.keys(initialQuill.files || {});
const preferred = `${initialName}.md`;
const mdKey = (initialQuill.files && initialQuill.files[preferred])
  ? preferred
  : candidateKeys.find((k: string) => k.toLowerCase().endsWith('.md'));

// Second occurrence (lines 110-118) - EXACT SAME PATTERN
const name = sel.replace(/\.zip$/i, '');
const candidateKeys = Object.keys(quillJson.files || {});
const preferred = `${name}.md`;
const mdKey = (quillJson.files && quillJson.files[preferred])
  ? preferred
  : candidateKeys.find((k: string) => k.toLowerCase().endsWith('.md'));
```

### The Essence

**Finding the main markdown file has a clear priority:** preferred name > any .md file

### The Abstraction

**Insight:** "Extract to a utility function"

```typescript
// utils.ts
export function findMainMarkdown(
  quill: { files?: Record<string, any> },
  quillName: string
): string | undefined {
  const baseName = quillName.replace(/\.zip$/i, '');
  const files = quill.files || {};
  const candidateKeys = Object.keys(files);
  const preferred = `${baseName}.md`;

  // Prefer exact match, fall back to any .md file
  return files[preferred]
    ? preferred
    : candidateKeys.find(k => k.toLowerCase().endsWith('.md'));
}

// main.ts - usage
const mdKey = findMainMarkdown(initialQuill, initial);
const mdKey = findMainMarkdown(quillJson, sel);
```

### The Test

Does it handle all cases?
- ✅ Exact name match (myquill.zip → myquill.md)
- ✅ Fallback to any .md file
- ✅ No markdown files → returns undefined
- ✅ Case-insensitive .md detection

### The Cascade

**Eliminates:**
- 1 duplicate implementation
- 9 lines of repeated logic
- Potential for future divergence

**Impact:** DRY principle, clearer intent

---

## Cascade 5: Format Configuration Duplication

**Locations:**
- `src/lib/exporters.ts:174-176` in `toBlob()`
- `src/lib/exporters.ts:247-268` in `toElement()`

### The Variations

Format-to-MIME type mapping repeated in multiple places:

```typescript
// In toBlob()
const mimeType = format === 'pdf' ? 'application/pdf'
  : format === 'svg' ? 'image/svg+xml'
  : 'text/plain';

// In toElement() - different handling per format
if (format === 'svg') {
  container.innerHTML = new TextDecoder().decode(bytes);
} else if (format === 'pdf') {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  iframe.src = URL.createObjectURL(blob);
} else {
  pre.textContent = new TextDecoder().decode(bytes);
}
```

### The Essence

**Each format has consistent properties:** MIME type, rendering method, file extension.

### The Abstraction

**Insight:** "Create a format configuration object"

```typescript
interface FormatConfig {
  mimeType: string;
  extension: string;
  render: (bytes: Uint8Array, container: HTMLElement) => void;
}

const FORMAT_CONFIG: Record<RenderFormat, FormatConfig> = {
  pdf: {
    mimeType: 'application/pdf',
    extension: '.pdf',
    render: (bytes, container) => {
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const iframe = container.querySelector('iframe')!;
      iframe.src = URL.createObjectURL(blob);
    }
  },
  svg: {
    mimeType: 'image/svg+xml',
    extension: '.svg',
    render: (bytes, container) => {
      container.innerHTML = new TextDecoder().decode(bytes);
    }
  },
  txt: {
    mimeType: 'text/plain',
    extension: '.txt',
    render: (bytes, container) => {
      const pre = container.querySelector('pre')!;
      pre.textContent = new TextDecoder().decode(bytes);
    }
  }
};

// Usage
const config = FORMAT_CONFIG[format];
const blob = new Blob([bytes], { type: config.mimeType });
config.render(bytes, container);
```

### The Test

Does it cover all formats?
- ✅ PDF rendering
- ✅ SVG rendering
- ✅ Text rendering
- ✅ Future formats easy to add

### The Cascade

**Eliminates:**
- 3 inline ternary chains
- 2 if/else branches
- Repeated MIME type strings

**Impact:** Centralized format configuration, easier to extend

---

## Summary & Prioritization

| Cascade | Impact | Effort | Priority | Eliminates |
|---------|--------|--------|----------|------------|
| 1. Artifact Type Juggling | 🔥 High | Medium | **P0** | 10+ cases, 60 lines |
| 2. Binary Detection | Medium | Low | **P1** | 1 impl, divergence risk |
| 3. Directory Loading | Medium | Medium | **P2** | 2 impls, 40 lines |
| 4. Markdown Extraction | Low | Low | **P2** | 1 impl, 9 lines |
| 5. Format Configuration | Medium | Low | **P1** | Repeated mappings |

### Recommended Order

1. **P0 - Artifact Type Juggling:** Biggest complexity reduction, but requires WASM contract change
2. **P1 - Binary Detection:** Quick win, prevents future bugs
3. **P1 - Format Configuration:** Quick win, cleaner architecture
4. **P2 - Markdown Extraction:** Minor improvement, low risk
5. **P2 - Directory Loading:** Good refactor, but requires careful testing

### Additional Cascades (Medium Priority)

6. **Config File Proliferation:** Two vitest configs (`.js` and `.ts`) - consolidate to one
7. **Path Prefix Logic:** Simplify zip wrapper directory handling (62-84 in loaders.ts)
8. **Environment Detection:** Commit to browser-only or add proper Node.js testing

---

## Next Steps

1. Review and validate these findings with the team
2. Create issues for P0 and P1 cascades
3. For Cascade 1, coordinate with WASM team on standardizing `RenderResult`
4. Implement quick wins (P1) to build momentum
5. Measure impact after each cascade

---

## Architectural Insight

The codebase recently completed a successful API redesign (see `prose/designs/api-redesign.md`) which simplified the **external API**. However, the **internal implementation** still carries complexity from:

- Supporting multiple artifact formats (WASM evolution)
- Duplicate utilities across scripts and lib code
- Node.js vs Browser dual-targeting (unclear requirement)

**Key Learning:** External API simplicity doesn't guarantee internal simplicity. These cascades represent opportunities to bring the implementation quality up to match the clean API design.
