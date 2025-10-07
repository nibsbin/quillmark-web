# Quillmark Web Library Design - Frontend Developer Experience

> **Status**: Implemented
>
> This document defines the `@quillmark-test/web` package, which provides opinionated, clean utilities for frontend developers working with Quillmark. It wraps `@quillmark-test/wasm@v0.0.38` with convenience functions for common tasks.
>
> **Note**: This library uses a functional API with grouped exports (loaders, exporters, utils). All backwards compatibility has been removed.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Package Goals](#package-goals)
3. [Architecture Overview](#architecture-overview)
4. [Core Utilities](#core-utilities)
5. [Type Definitions](#type-definitions)
6. [Usage Examples](#usage-examples)
7. [Re-Export Strategy](#re-export-strategy)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Design Principles

1. **Opinionated Convenience**: Provide batteries-included helpers for common frontend workflows
2. **Zero Breaking Changes**: Re-export the full WASM API unchanged—users can drop down to low-level APIs anytime
3. **Progressive Enhancement**: Simple tasks are simple, complex tasks remain possible
4. **Framework Agnostic**: Works with vanilla JS, React, Vue, Svelte, etc.
5. **Type-Safe**: Full TypeScript support with rich type inference
6. **Minimal Dependencies**: Only depends on `@quillmark-test/wasm` and browser APIs

---

## Package Goals

The `@quillmark-test/web` package aims to:

- **Simplify Quill Loading**: Handle .zip files, file uploads, and fetched directories automatically
- **Streamline Rendering**: Provide one-line render-to-preview helpers
- **Abstract Complexity**: Hide boilerplate like JSON construction, binary conversion, and error handling
- **Maintain Flexibility**: Never prevent access to underlying WASM APIs
- **Improve DX**: Reduce time-to-first-render for new developers

### What This Package Does NOT Do

- Server-side rendering (use `@quillmark-test/wasm` directly in Node.js)
- State management (let frameworks handle that)
- UI components (this is a logic library, not a component library)
- Custom file system abstractions (leverages browser File API)

---

## Architecture Overview

```
┌──────────────────────────────────────┐
│     Frontend Application              │
│  (React, Vue, Vanilla JS, etc.)       │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│    @quillmark-test/web               │
│  ┌────────────────────────────────┐  │
│  │  Re-exported Quillmark Class   │  │
│  │  - new()             [WASM]    │  │
│  │  - registerQuill()   [WASM]    │  │
│  │  - render()          [WASM]    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Grouped Utilities             │  │
│  │                                 │  │
│  │  loaders:                      │  │
│  │    - fromZip()                 │  │
│  │                                 │  │
│  │  exporters:                    │  │
│  │    - toBlob()                  │  │
│  │    - toDataUrl()               │  │
│  │    - toElement()               │  │
│  │    - download()                │  │
│  │                                 │  │
│  │  utils:                        │  │
│  │    - detectBinaryFile()        │  │
│  │    - debounce()                │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│    @quillmark-test/wasm@v0.0.38      │
│         (Low-level WASM API)          │
└──────────────────────────────────────┘
```

---

## Core Utilities

### 1. Quill Loaders

The opinionated approach: **all Quills must be loaded from .zip files**.

#### `fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>`

Extracts a .zip file and converts it to the Quill JSON contract format.

```typescript
/**
 * Load a Quill template from a .zip file
 * 
 * @param zipFile - Zip file containing Quill template (must include Quill.toml at root)
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if zip is invalid or missing Quill.toml
 * 
 * @example
 * import { loaders } from '@quillmark-test/web';
 * 
 * const response = await fetch('/quills/my-template.zip');
 * const zipBlob = await response.blob();
 * const quillJson = await loaders.fromZip(zipBlob);
 * 
 * const engine = Quillmark.create();
 * engine.registerQuill('my-template', quillJson);
 */
async function fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>
```

**Implementation approach:**
- Use `fflate` library for zip extraction
- Detect binary vs text files by extension
- Build nested JSON structure matching WASM contract
- Validate that `Quill.toml` exists

**Why zip-only?**
- Ensures all Quills are packaged consistently
- Simplifies distribution and sharing
- Provides built-in validation (must contain Quill.toml)
- Eliminates security concerns with directory traversal

### 2. Export Helpers

These utilities wrap the WASM `render()` method with convenient browser-friendly output formats.

> **Note**: These are available both as standalone functions (`exporters.toBlob()`) and as instance methods on the enhanced `Quillmark` class (`engine.exportToBlob()`).

#### `exportToBlob(engine, quillName, markdown, options?): Promise<Blob>`

Export rendered markdown to a Blob for download or preview.

```typescript
/**
 * Export rendered markdown to a Blob
 * 
 * @example
 * // Functional API
 * import { exporters } from '@quillmark-test/web';
 * const blob = await exporters.toBlob(engine, 'my-quill', markdown, { format: 'pdf' });
 * 
 * // OOP API (recommended)
 * const blob = await engine.exportToBlob('my-quill', markdown, { format: 'pdf' });
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 */
async function exportToBlob(
  engine: Quillmark,
  quillName: string,
  markdown: string,
  options?: RenderOptions
): Promise<Blob>
```

#### `exportToDataUrl(engine, quillName, markdown, options?): Promise<string>`

Export rendered markdown to a data URL for inline embedding.

```typescript
/**
 * Export rendered markdown to a data URL
 * 
 * @example
 * // Functional API
 * const dataUrl = await exporters.toDataUrl(engine, 'my-quill', markdown, { format: 'svg' });
 * 
 * // OOP API (recommended)
 * const dataUrl = await engine.exportToDataUrl('my-quill', markdown, { format: 'svg' });
 * imgElement.src = dataUrl;
 */
async function exportToDataUrl(
  engine: Quillmark,
  quillName: string,
  markdown: string,
  options?: RenderOptions
): Promise<string>
```

#### `exportToElement(engine, quillName, markdown, element, options?): Promise<void>`

Export rendered markdown directly into a DOM element (SVG injected directly, PDF as embed).

```typescript
/**
 * Export rendered markdown directly into a DOM element
 * 
 * For SVG: Injects SVG markup directly
 * For PDF: Creates an embed element
 * 
 * @example
 * // Functional API
 * await exporters.toElement(engine, 'my-quill', markdown, preview, { format: 'svg' });
 * 
 * // OOP API (recommended)
 * const preview = document.getElementById('preview');
 * await engine.exportToElement('my-quill', markdown, preview, { format: 'svg' });
 */
async function exportToElement(
  engine: Quillmark,
  quillName: string,
  markdown: string,
  element: HTMLElement,
  options?: RenderOptions
): Promise<void>
```

#### `download(blob, filename): void` or `engine.download(quillName, markdown, filename, options?): Promise<void>`

Trigger a browser download.

```typescript
/**
 * Trigger browser download of a blob
 * 
 * @example
 * // Functional API
 * const blob = await exporters.toBlob(engine, 'my-quill', markdown);
 * exporters.download(blob, 'output.pdf');
 * 
 * // OOP API (recommended) - combines export and download
 * await engine.download('my-quill', markdown, 'output.pdf', { format: 'pdf' });
 */
function download(blob: Blob, filename: string): void
```

### 3. Utility Functions

#### `detectBinaryFile(filename: string): boolean`

Determines if a file should be treated as binary based on extension.

```typescript
/**
 * Check if a filename indicates a binary file
 * 
 * @example
 * import { utils } from '@quillmark-test/web';
 * utils.detectBinaryFile('logo.png')  // true
 * utils.detectBinaryFile('glue.typ')  // false
 */
function detectBinaryFile(filename: string): boolean
```

**Default binary extensions:**
`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.ico`, 
`.pdf`, `.ttf`, `.otf`, `.woff`, `.woff2`, 
`.zip`, `.tar`, `.gz`

#### `debounce<T>(fn: T, ms: number): Function`

Simple debounce utility for event handlers.

```typescript
/**
 * Debounce a function call
 * 
 * @example
 * import { utils } from '@quillmark-test/web';
 * 
 * const debouncedHandler = utils.debounce(() => {
 *   // expensive operation
 * }, 300);
 * 
 * element.addEventListener('input', debouncedHandler);
 */
function debounce<T extends (...args: any[]) => void>(
  fn: T, 
  ms: number
): (...args: Parameters<T>) => void
```

### 4. Grouped Exports

The library provides utilities organized into three main groups:

```typescript
import { Quillmark, loaders, exporters, utils } from '@quillmark-test/web';

// Create Quillmark instance using new() API
const engine = new Quillmark();

// Loaders
const quillJson = await loaders.fromZip(zipBlob);
engine.registerQuill('my-template', quillJson);

// Exporters (functional API - the only way to export)
const blob = await exporters.toBlob(engine, 'my-quill', markdown, { format: 'pdf' });
const dataUrl = await exporters.toDataUrl(engine, 'my-quill', markdown, { format: 'svg' });
await exporters.toElement(engine, 'my-quill', markdown, element, { format: 'svg' });
exporters.download(blob, 'output.pdf');

// Utilities
utils.detectBinaryFile('file.png');
utils.debounce(handler, 300);
```

**Example usage:**
```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

// Create engine using new() API from @quillmark-test/wasm@v0.0.38
const engine = new Quillmark();

// Load and register Quill
const quillJson = await loaders.fromZip(zipBlob);
engine.registerQuill('my-template', quillJson);

// Use functional exporters API
const blob = await exporters.toBlob(engine, 'my-template', markdown, { format: 'pdf' });
exporters.download(blob, 'output.pdf');
```

---

## Type Definitions

All WASM types are re-exported. Additional types for web utilities:

```typescript
// Re-exports from @quillmark-test/wasm
export { 
  Quillmark,
  RenderOptions,
  RenderResult,
  Artifact,
  Diagnostic,
  Location,
  QuillmarkError
} from '@quillmark-test/wasm';

// Web-specific types

/**
 * Quill JSON contract format
 */
export interface QuillJson {
  files: FileTree;
  metadata?: QuillMetadata;
}

/**
 * File tree structure (nested directories and files)
 */
export interface FileTree {
  [key: string]: FileNode | FileTree;
}

/**
 * Individual file entry
 */
export interface FileNode {
  contents: string | number[];  // text or binary
}

/**
 * Optional metadata override
 */
export interface QuillMetadata {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
}

/**
 * Options for directory fetching
 */
export interface FetchDirectoryOptions {
  /** Base URL for fetching files */
  baseUrl: string;
  
  /** File paths to fetch (or path to manifest JSON) */
  files: string[] | string;
  
  /** Whether to automatically detect binary files */
  detectBinary?: boolean;
  
  /** Custom binary file extensions */
  binaryExtensions?: string[];
}
```

---

## Usage Examples

### Example 1: Load Quill from Zip File (OOP API - Recommended)

```typescript
import { Quillmark, loaders } from '@quillmark-test/web';

// User uploads a .zip file
const fileInput = document.querySelector<HTMLInputElement>('#quill-upload');
fileInput?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    // Load Quill from zip using grouped loaders
### Example 1: Load Quill from Zip File

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

// User uploads a .zip file
const fileInput = document.querySelector<HTMLInputElement>('#quill-upload');
fileInput?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    // Load Quill from zip using grouped loaders
    const quillJson = await loaders.fromZip(file);
    
    // Register with engine using new() API
    const engine = new Quillmark();
    engine.registerQuill('uploaded-template', quillJson);
    
    // Export and download using functional exporters API
    const markdown = '# Hello World\n\nMy first document!';
    const blob = await exporters.toBlob(engine, 'uploaded-template', markdown, { format: 'pdf' });
    exporters.download(blob, 'output.pdf');
  } catch (error) {
    console.error('Failed to load Quill:', error);
  }
});
```

### Example 2: Real-time SVG Preview

```typescript
import { Quillmark, loaders, exporters, utils } from '@quillmark-test/web';

async function setupEditor() {
  // Load Quill from server
  const response = await fetch('/quills/letter.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = new Quillmark();
  engine.registerQuill('letter', quillJson);
  
  // Setup editor with live preview
  const editor = document.querySelector<HTMLTextAreaElement>('#editor');
  const preview = document.querySelector<HTMLDivElement>('#preview');
  
  // Use grouped utils for debounce and exporters for rendering
  editor?.addEventListener('input', utils.debounce(async () => {
    try {
      await exporters.toElement(
        engine,
        'letter',
        editor.value,
        preview!,
        { format: 'svg' }
      );
    } catch (error) {
      console.error('Render failed:', error);
    }
  }, 300));
}
```

### Example 3: Drop Down to WASM API

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

const response = await fetch('/quills/my-template.zip');
const zipBlob = await response.blob();
const quillJson = await loaders.fromZip(zipBlob);

const engine = new Quillmark();
engine.registerQuill('my-template', quillJson);

// Use exporters for common case
const blob = await exporters.toBlob(engine, 'my-template', markdown, { format: 'pdf' });
exporters.download(blob, 'output.pdf');

// Drop down to WASM API for advanced use
const result = engine.render('my-template', markdown, {
  format: 'pdf',
  assets: {
    'custom-font.ttf': new Uint8Array([...])
  }
});

// Access detailed diagnostics
for (const warning of result.warnings) {
  console.warn(`[${warning.severity}] ${warning.message}`);
}
```

### Example 5: Current Demo Simplified

The playground demo (`src/main.ts`) now uses the improved API:

**Current implementation (using new OOP API):**
```typescript
### Example 4: Current Demo Implementation

The playground demo (`src/main.ts`) uses the new functional API:

**Current implementation:**
```typescript
import { Quillmark, loaders, exporters, utils } from './lib';

async function init() {
  // Load Quill from zip using grouped loaders
  const response = await fetch('/quills/usaf_memo.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = new Quillmark();
  engine.registerQuill('usaf_memo', quillJson);
  
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  // Live preview using exporters.toElement
  editor.addEventListener('input', utils.debounce(async () => {
    await exporters.toElement(engine, 'usaf_memo', editor.value, preview, { format: 'svg' });
  }, 50));
  
  // Download using exporters.toBlob and exporters.download
  downloadBtn.addEventListener('click', async () => {
    const blob = await exporters.toBlob(engine, 'usaf_memo', editor.value, { format: 'pdf' });
    exporters.download(blob, 'output.pdf');
  });
}
```

**Benefits of the functional API:**
- ✅ Clean functional programming style
- ✅ Explicit dependencies - clear what each function needs
- ✅ Grouped utilities - clear organization with `loaders`, `exporters`, `utils`
- ✅ No magic - straightforward function calls
  });
}
```

---

## Re-Export Strategy

The package extends and re-exports the WASM API to maintain full compatibility while adding web-specific enhancements:

```typescript
// Enhanced Quillmark class (extends WASM Quillmark)
import { Quillmark as WasmQuillmark, Quill } from '@quillmark-test/wasm';
import { exportToBlob, exportToDataUrl, exportToElement, download } from './exporters';

class Quillmark extends WasmQuillmark {
  async exportToBlob(quillName: string, markdown: string, options?: RenderOptions): Promise<Blob> { ... }
  async exportToDataUrl(quillName: string, markdown: string, options?: RenderOptions): Promise<string> { ... }
  async exportToElement(quillName: string, markdown: string, element: HTMLElement, options?: RenderOptions): Promise<void> { ... }
  async download(quillName: string, markdown: string, filename: string, options?: RenderOptions): Promise<void> { ... }
}

export { Quillmark, Quill };

// Export loaders
export { fromZip } from './loaders';

// Export exporters (new names + backward compatible aliases)
export { 
  exportToBlob, 
  exportToDataUrl, 
  exportToElement,
  download,
  // Backward compatibility
  exportToBlob as renderToBlob,
  exportToDataUrl as renderToDataUrl,
  exportToElement as renderToElement,
  download as downloadArtifact
} from './exporters';

// Export utilities
export { detectBinaryFile, debounce } from './utils';

// Grouped exports for better discoverability
export const loaders = { fromZip };
export const exporters = { toBlob: exportToBlob, toDataUrl: exportToDataUrl, toElement: exportToElement, download };
export const utils = { detectBinaryFile, debounce };

## Re-Export Strategy

The package re-exports the WASM API and provides grouped utilities:

```typescript
// Re-export WASM classes directly
import { Quillmark, Quill } from '@quillmark-test/wasm';
export { Quillmark, Quill };

// Grouped exports for utilities
import { fromZip as _fromZip } from './loaders';
import { exportToBlob, exportToDataUrl, exportToElement, download } from './exporters';
import { detectBinaryFile, debounce } from './utils';

export const loaders = { fromZip: _fromZip };
export const exporters = { 
  toBlob: exportToBlob, 
  toDataUrl: exportToDataUrl, 
  toElement: exportToElement, 
  download 
};
export const utils = { detectBinaryFile, debounce };

// Export types
export type { QuillJson, FileTree, FileNode, QuillMetadata, RenderOptions } from './types';
```

**Benefits of this approach:**
- Users import one package: `@quillmark-test/web`
- Direct WASM re-export - no wrapper needed
- Grouped exports for better discoverability (`loaders`, `exporters`, `utils`)
- No backwards compatibility bloat
- Can use helpers or drop down to WASM anytime
- No version mismatches between packages
- Tree-shaking works correctly

---

## Implementation Guidelines

### Minimal Dependencies

The implementation minimizes external dependencies:

**Required:**
- `@quillmark-test/wasm@^0.0.38` - Peer dependency

**Included:**
- `fflate@^0.8.2` (~20KB) - Pure JS zip extraction, faster than jszip

**Avoided:**
- Large libraries like jszip (slower, heavier)
- Framework-specific dependencies
- Polyfills (assume modern browser)

### Error Handling

All utilities provide clear, actionable errors:

```typescript
// ✅ Good
throw new Error('Quill.toml not found in zip file. Make sure it exists at the root of the archive.');

// ❌ Bad
throw new Error('Invalid file');
```

### Browser Compatibility

Target modern browsers with native support for:
- `File` API
- `fetch` API  
- `Blob` API
- `URL.createObjectURL`
- `async/await`

No IE11 support needed.

### TypeScript

Full TypeScript implementation with strict mode:
- No `any` types in public APIs
- Comprehensive JSDoc comments
- Inferred return types where possible
- Exported type definitions for all public APIs

### Testing

Unit tests for each utility:
- Quill loaders with mock zip/file data
- Rendering helpers with mock WASM engine
- Edge cases (missing files, invalid formats, etc.)

### Bundle Size

Target bundle size (minified + gzipped):
- Core utilities: <10KB
- With zip support (fflate): <30KB
- Total overhead: <35KB

**Actual implementation:** ~28KB total with zip support ✅

---

## Distribution

### Package Structure

```
@quillmark-test/web/
├── dist/
│   ├── index.js           # ESM build
│   ├── index.d.ts         # TypeScript definitions
│   └── index.cjs          # CommonJS (optional)
├── src/
│   ├── index.ts           # Main entry with enhanced Quillmark class
│   ├── loaders.ts         # Quill loading utilities (fromZip)
│   ├── exporters.ts       # Export helpers (was renderers.ts)
│   ├── utils.ts           # Shared utilities
│   └── types.ts           # Type definitions
├── package.json
├── README.md
└── LICENSE
```

### Package.json

```json
{
  "name": "@quillmark-test/web",
  "version": "0.1.0",
  "description": "Opinionated frontend utilities for Quillmark WASM",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "@quillmark-test/wasm": "^0.0.35"
  },
  "dependencies": {
    "fflate": "^0.8.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## Future Enhancements

Potential additions for future versions:

1. **React Hooks**: `useQuillmark()`, `useRender()`, etc.
2. **Vue Composables**: Similar patterns for Vue 3
3. **Streaming Rendering**: For very large documents
4. **Caching Layer**: Cache parsed Quills in IndexedDB
5. **Web Worker Support**: Offload WASM to background thread
6. **Progress Callbacks**: For long-running renders
7. **Batch Rendering**: Render multiple documents efficiently

These should be separate packages (e.g., `@quillmark-test/react`) to keep core library framework-agnostic.

---

## Summary

The `@quillmark-test/web` package provides:

✅ **Opinionated Quill Loading**: `loaders.fromZip()` for consistent packaging  
✅ **Grouped Utilities**: `loaders`, `exporters`, `utils` for clear organization  
✅ **Functional API**: Clean, explicit function calls for all operations  
✅ **Full WASM Access**: Direct re-export of `Quillmark` and `Quill` classes  
✅ **Type Safety**: Complete TypeScript definitions  
✅ **Small Footprint**: ~28KB total with zip support  
✅ **Framework Agnostic**: Works with vanilla JS, React, Vue, Svelte, etc.  
✅ **No Backwards Compatibility**: Clean API without legacy aliases

**Key Changes from Previous Versions:**
- Uses `@quillmark-test/wasm@v0.0.38` with `new Quillmark()` instead of `Quillmark.create()`
- Removed all instance methods from Quillmark (exportToBlob, exportToDataUrl, etc.)
- Removed all global function exports (only grouped exports remain)
- Removed all backwards compatibility aliases (renderToBlob, downloadArtifact, etc.)
- Clean, functional programming style throughout

This design prioritizes simplicity and explicitness while maintaining the flexibility and power of the underlying WASM API.
