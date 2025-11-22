# Simplification Cascades - Quillmark Web

> **Date:** 2025-11-21 (Updated)
> **Status:** In Progress - 3 of 5 cascades completed
> **Impact:** High - These cascades could eliminate significant complexity

## Overview

This document identifies 5 major simplification cascades in the quillmark-web codebase - places where one insight can eliminate multiple components, special cases, or duplicate implementations.

---

## Cascade 1: Artifact Type Juggling 🔥 HIGHEST IMPACT

> **✅ COMPLETED** - 2025-11-21 (Commit: fcfdab4)

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

> **✅ COMPLETED** - 2025-11-21

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

> **✅ COMPLETED** - 2025-11-21 (Commit: 1bf3edc)

**Locations:**
- `scripts/package-quills.js` - Was using inline directory reading
- `src/lib/quillLoader.js` - Was using inline directory reading
- `src/lib/fileSources.js` - New shared implementation

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

**Insight:** "Separate file reading from tree building, share both"

```javascript
// Actual implementation in fileSources.js

// Step 1: Read files into a Map (sync or async)
function readDirectorySync(dirPath, fs, path): Map<string, Uint8Array> { ... }
async function readDirectoryAsync(dirPath, fs, path): Promise<Map<string, Uint8Array>> { ... }

// Step 2: Convert Map to desired tree format
function buildFileTree(fileMap, options): Record<string, any> {
  // Options: format (flat/nested), wrapContents, detectBinary, rawBuffers
  // Single implementation that works for any file source
}

// Usage examples
// scripts/package-quills.js
const fileMap = await readDirectoryAsync(quillDir, fs, path);
const files = buildFileTree(fileMap, { format: 'flat', rawBuffers: true });

// src/lib/quillLoader.js
const fileMap = readDirectorySync(quillPath, fs, path);
const files = buildFileTree(fileMap, { format: 'nested', wrapContents: true, detectBinary: true });
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

**Location:** `src/main.ts:79-84` and `110-115`

### The Variations

Identical logic repeated twice to find the main markdown file:

```typescript
// First occurrence (lines 79-84)
const initialName = initial.replace(/\.zip$/i, '');
const candidateKeys = Object.keys(initialQuill.files || {});
const preferred = `${initialName}.md`;
const mdKey = (initialQuill.files && initialQuill.files[preferred])
  ? preferred
  : candidateKeys.find((k: string) => k.toLowerCase().endsWith('.md'));

// Second occurrence (lines 110-115) - EXACT SAME PATTERN
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

> **✅ PARTIALLY COMPLETED** - 2025-11-21

**Locations:**
- `src/lib/exporters.ts:217-219` - `toBlob()` uses FORMAT_CONFIG
- `src/lib/exporters.ts:276-301` - `toElement()` uses FORMAT_CONFIG but rendering logic not fully abstracted

### The Variations

Format-to-MIME type mapping was repeated in multiple places. This has been partially addressed:

**✅ Completed:**
```typescript
// FORMAT_CONFIG now centralizes MIME types and extensions
const FORMAT_CONFIG: Record<RenderFormat, FormatConfig> = {
  pdf: { mimeType: 'application/pdf', extension: '.pdf' },
  svg: { mimeType: 'image/svg+xml', extension: '.svg' }
};

// toBlob() uses config
const config = FORMAT_CONFIG[result.outputFormat];
return new Blob([result.artifacts.main], { type: config.mimeType });
```

**❌ Not yet abstracted:**
```typescript
// In toElement() - rendering logic still inline
if (result.outputFormat === 'svg') {
  element.innerHTML = new TextDecoder().decode(bytes);
} else {
  const blob = new Blob([bytes], { type: config.mimeType });
  // ... iframe creation
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

**Already Eliminated:**
- ✅ Repeated MIME type strings (now in FORMAT_CONFIG)
- ✅ Inline extension mapping (now in FORMAT_CONFIG)

**Remaining to Eliminate:**
- ❌ Rendering logic still has if/else branches in toElement()
- ❌ Could add render() method to FormatConfig as proposed

**Current Impact:** MIME types and extensions centralized, partial improvement
**Full Impact:** Would eliminate all format-specific branching, making new formats trivial to add

---

## Summary & Prioritization

| Cascade | Impact | Effort | Priority | Status | Eliminates |
|---------|--------|--------|----------|--------|------------|
| 1. Artifact Type Juggling | 🔥 High | Medium | **P0** | ✅ Complete | 10+ cases, 60 lines |
| 2. Binary Detection | Medium | Low | **P1** | ✅ Complete | 1 impl, divergence risk |
| 3. Directory Loading | Medium | Medium | **P2** | ✅ Complete | 2 impls, 40 lines |
| 4. Markdown Extraction | Low | Low | **P2** | Pending | 1 impl, 9 lines |
| 5. Format Configuration | Medium | Low | **P1** | 🔄 Partial | MIME/ext centralized, render logic remains |

### Recommended Order

1. **✅ P0 - Artifact Type Juggling:** Completed - Standardized RenderResult type eliminates 10+ type conversion paths
2. **✅ P1 - Binary Detection:** Completed - Single source of truth for binary file detection
3. **✅ P2 - Directory Loading:** Completed - Unified file tree construction via fileSources.js
4. **🔄 P1 - Format Configuration:** Partially complete - MIME/extension mapping centralized, render abstraction remains
5. **P2 - Markdown Extraction:** Minor improvement, low risk, quick implementation

### Additional Cascades (Medium Priority)

6. **Config File Proliferation:** Two vitest configs (`.js` and `.ts`) - consolidate to one
7. **Path Prefix Logic:** Simplify zip wrapper directory handling (62-84 in loaders.ts)
8. **Environment Detection:** Commit to browser-only or add proper Node.js testing

---

## Next Steps

1. ✅ ~~Review and validate these findings with the team~~
2. ✅ ~~Create issues for P0 and P1 cascades~~
3. ✅ ~~Implement Cascade 1: Artifact Type Juggling~~
4. ✅ ~~Implement Cascade 2: Binary Detection~~
5. ✅ ~~Implement Cascade 3: Directory Loading~~
6. **Current:** Complete Cascade 5: Add render() method to FORMAT_CONFIG to eliminate remaining if/else
7. Implement Cascade 4: Markdown Extraction (quick win)
8. Measure cumulative impact of completed cascades

---

## Implementation Notes

### Cascade 1: Artifact Type Juggling (Completed 2025-11-21)

**Commit:** fcfdab4 - "Implement Cascade 1: Eliminate artifact type juggling (#34)"

**Changes Made:**
- Standardized `RenderResult` interface with consistent `artifacts.main` structure
- Eliminated `toArrayBuffer()` type juggling (7+ input type variations)
- Simplified `extractArtifact()` from multiple structural paths to single access pattern
- Updated all exporters to work with standardized result type
- Removed base64 detection, recursive unwrapping, and defensive type conversions

**Impact:**
- Reduced exporter complexity by ~60 lines
- Eliminated 10+ different artifact input/output paths
- Type safety improved throughout the codebase
- Cleaner API surface for future enhancements

**Files Modified:**
- `src/lib/exporters.ts` - Core simplification
- `src/lib/types.ts` - Standardized RenderResult interface
- `src/lib/exporters.test.ts` - Updated tests
- `README.md` - Updated documentation

### Cascade 2: Binary File Detection Duplication (Completed 2025-11-21)

**Changes Made:**
- Exported `BINARY_EXTENSIONS` constant from `src/lib/utils.ts` for reusability
- Replaced regex-based binary detection in `src/lib/quillLoader.js` with import of `detectBinaryFile()`
- Eliminated duplicate implementation and ensured single source of truth
- Unified extension list now includes all formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.pdf`, `.ttf`, `.otf`, `.woff`, `.woff2`, `.zip`, `.tar`, `.gz`

**Impact:**
- Eliminated 1 duplicate implementation (regex vs Set-based)
- Prevented future extension list divergence
- Improved maintainability - all binary detection now happens in one place
- Enhanced extension coverage (quillLoader.js now supports `.webp`, `.bmp`, `.ico`, `.zip`, `.tar`, `.gz`)

**Files Modified:**
- `src/lib/utils.ts` - Exported BINARY_EXTENSIONS constant
- `src/lib/quillLoader.js` - Removed inline regex, imported shared function

### Cascade 3: Directory Loading Logic Duplication (Completed 2025-11-21)

**Commit:** 1bf3edc - "Implement Cascade 3: Eliminate directory loading logic duplication (#36)"

**Changes Made:**
- Created `src/lib/fileSources.js` with unified file loading utilities:
  - `readDirectoryAsync()` - async recursive directory reader
  - `readDirectorySync()` - sync recursive directory reader
  - `buildFileTree()` - converts flat file map to nested or flat tree structure
- Updated `scripts/package-quills.js` to use shared `readDirectoryAsync()` and `buildFileTree()`
- Updated `src/lib/quillLoader.js` to use shared `readDirectorySync()` and `buildFileTree()`
- Eliminated ~40 lines of duplicate recursive traversal logic

**Impact:**
- Eliminated 2 duplicate directory traversal implementations
- Single source of truth for file tree construction
- Flexible output formats (nested/flat, with/without binary detection)
- Easier to add new file sources (network, in-memory, etc.)
- Improved maintainability and testability

**Files Modified:**
- `src/lib/fileSources.js` - New shared utilities module
- `scripts/package-quills.js` - Now imports shared functions
- `src/lib/quillLoader.js` - Now imports shared functions

### Cascade 5: Format Configuration Duplication (Partially Completed 2025-11-21)

**Status:** MIME type and extension mapping centralized, rendering logic not yet abstracted

**Changes Made:**
- Created `FORMAT_CONFIG` constant in `src/lib/exporters.ts` (lines 28-37)
- Centralized MIME type mapping: `application/pdf`, `image/svg+xml`
- Centralized file extension mapping: `.pdf`, `.svg`
- `toBlob()` function now uses `FORMAT_CONFIG` to get MIME type
- `toElement()` function uses `FORMAT_CONFIG` but rendering logic still has if/else branches

**Completed:**
- ✅ Eliminated repeated MIME type strings across functions
- ✅ Eliminated repeated extension strings across functions
- ✅ Single source of truth for format metadata

**Remaining Work:**
- ❌ Add `render()` method to `FormatConfig` interface
- ❌ Move rendering logic from `toElement()` into FORMAT_CONFIG
- ❌ Would eliminate remaining if/else branches for format-specific rendering

**Impact:**
- Partial improvement to maintainability and extensibility
- Adding new formats still requires modifying if/else logic in `toElement()`
- Full implementation would make new formats trivial (just add to config object)

**Files Modified:**
- `src/lib/exporters.ts` - Added FORMAT_CONFIG, updated toBlob() and toElement()

---

## Architectural Insight

The codebase recently completed a successful API redesign (see `prose/designs/api-redesign.md`) which simplified the **external API**. With Cascades 1, 2, and 3 complete, the internal implementation quality is catching up to the clean external API. Resolved complexity:

- ✅ ~~Supporting multiple artifact formats (WASM evolution)~~ - **Resolved by Cascade 1**
- ✅ ~~Duplicate binary detection implementations~~ - **Resolved by Cascade 2**
- ✅ ~~Duplicate directory traversal and file tree construction~~ - **Resolved by Cascade 3**

Remaining opportunities:
- Duplicate markdown file extraction logic (Cascade 4) - Low priority, quick fix
- Rendering logic abstraction (Cascade 5) - Partially complete, render method remains
- Node.js vs Browser dual-targeting (unclear requirement)

**Key Learning:** External API simplicity doesn't guarantee internal simplicity. These cascades represent opportunities to bring the implementation quality up to match the clean API design. Cascades 1-3 demonstrate the value of this approach - standardizing contracts, eliminating duplication, and sharing utilities reduces complexity and maintenance burden while improving code reliability and making future enhancements easier.
