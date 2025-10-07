# Quillmark Web Library Design - Frontend Developer Experience

> **Status**: Design Document
>
> This document defines the `@quillmark-test/web` package, which provides opinionated, clean utilities for frontend developers working with Quillmark. It wraps `@quillmark-test/wasm@v0.0.35` with convenience functions for common tasks.

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
│  │  Quill Loaders                 │  │
│  │  - fromZip()                   │  │
│  │  - fromFiles()                 │  │
│  │  - fromDirectory()             │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Rendering Helpers             │  │
│  │  - renderToBlob()              │  │
│  │  - renderToDataUrl()           │  │
│  │  - renderToElement()           │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Re-Exports                    │  │
│  │  - Quillmark (WASM class)      │  │
│  │  - All types & interfaces      │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────────────────┐
│    @quillmark-test/wasm@v0.0.35      │
│         (Low-level WASM API)          │
└──────────────────────────────────────┘
```

---

## Core Utilities

### 1. Quill Loaders

These utilities convert various input formats into the Quill JSON contract that WASM expects.

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
 * const input = document.querySelector('input[type="file"]');
 * const zipFile = input.files[0];
 * const quillJson = await QuillmarkWeb.fromZip(zipFile);
 * 
 * const engine = Quillmark.create();
 * engine.registerQuill('my-template', quillJson);
 */
async function fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>
```

**Implementation approach:**
- Use a lightweight zip library like `fflate` (pure JS, fast)
- Detect binary vs text files by extension
- Build nested JSON structure matching WASM contract
- Validate that `Quill.toml` exists

#### `fromFiles(files: FileList | File[]): Promise<QuillJson>`

Converts uploaded files (via `<input type="file" webkitdirectory>`) to Quill JSON.

```typescript
/**
 * Load a Quill template from uploaded files/directories
 * 
 * @param files - FileList or File array from file input
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if no Quill.toml found
 * 
 * @example
 * const input = document.querySelector('input[type="file"]');
 * input.setAttribute('webkitdirectory', '');
 * input.addEventListener('change', async (e) => {
 *   const quillJson = await QuillmarkWeb.fromFiles(e.target.files);
 *   engine.registerQuill('uploaded', quillJson);
 * });
 */
async function fromFiles(files: FileList | File[]): Promise<QuillJson>
```

**Implementation approach:**
- Parse `file.webkitRelativePath` to build directory structure
- Detect binary files by extension (same as fromZip)
- Handle both file uploads and directory uploads
- Auto-detect Quill name from root directory or Quill.toml

#### `fromDirectory(baseUrl: string, manifestPath?: string): Promise<QuillJson>`

Fetches a Quill template from a remote directory (requires manifest file or known structure).

```typescript
/**
 * Load a Quill template from a remote directory via fetch
 * 
 * @param baseUrl - Base URL of the Quill directory
 * @param manifestPath - Optional path to file listing (e.g., 'files.json')
 * @returns Quill JSON object ready for registerQuill()
 * 
 * @example
 * // With manifest file listing all paths
 * const quillJson = await QuillmarkWeb.fromDirectory(
 *   '/templates/usaf-memo',
 *   'files.json'  // contains: ["Quill.toml", "glue.typ", "assets/logo.png"]
 * );
 * 
 * // With predefined file list
 * const quillJson = await QuillmarkWeb.fromDirectory('/templates/usaf-memo', [
 *   'Quill.toml',
 *   'glue.typ',
 *   'assets/logo.png'
 * ]);
 */
async function fromDirectory(
  baseUrl: string, 
  manifestPath?: string | string[]
): Promise<QuillJson>
```

**Implementation approach:**
- If manifest provided, fetch it and parse file list
- Fetch each file (text or binary based on extension)
- Build JSON contract structure
- This is essentially what the current demo does—extract it into a reusable function

### 2. Rendering Helpers

These utilities wrap the WASM `render()` method with convenient output formats.

#### `renderToBlob(engine, quillName, markdown, options?): Promise<Blob>`

Renders to a Blob for download or preview.

```typescript
/**
 * Render markdown to a Blob
 * 
 * @example
 * const blob = await QuillmarkWeb.renderToBlob(engine, 'my-quill', markdown);
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 */
async function renderToBlob(
  engine: Quillmark,
  quillName: string,
  markdown: string,
  options?: RenderOptions
): Promise<Blob>
```

#### `renderToDataUrl(engine, quillName, markdown, options?): Promise<string>`

Renders to a data URL for inline embedding.

```typescript
/**
 * Render markdown to a data URL
 * 
 * @example
 * const dataUrl = await QuillmarkWeb.renderToDataUrl(engine, 'my-quill', markdown, { format: 'svg' });
 * imgElement.src = dataUrl;
 */
async function renderToDataUrl(
  engine: Quillmark,
  quillName: string,
  markdown: string,
  options?: RenderOptions
): Promise<string>
```

#### `renderToElement(engine, quillName, markdown, element, options?): Promise<void>`

Renders directly into a DOM element (SVG or iframe for PDF).

```typescript
/**
 * Render markdown directly into a DOM element
 * 
 * For SVG: Injects SVG markup directly
 * For PDF: Creates an iframe or embed element
 * 
 * @example
 * const preview = document.getElementById('preview');
 * await QuillmarkWeb.renderToElement(engine, 'my-quill', markdown, preview, { format: 'svg' });
 */
async function renderToElement(
  engine: Quillmark,
  quillName: string,
  markdown: string,
  element: HTMLElement,
  options?: RenderOptions
): Promise<void>
```

#### `downloadArtifact(blob, filename): void`

Triggers a browser download.

```typescript
/**
 * Trigger browser download of a rendered artifact
 * 
 * @example
 * const blob = await QuillmarkWeb.renderToBlob(engine, 'my-quill', markdown);
 * QuillmarkWeb.downloadArtifact(blob, 'output.pdf');
 */
function downloadArtifact(blob: Blob, filename: string): void
```

### 3. Utility Functions

#### `detectBinaryFile(filename: string): boolean`

Determines if a file should be treated as binary based on extension.

```typescript
/**
 * Check if a filename indicates a binary file
 * 
 * @example
 * QuillmarkWeb.detectBinaryFile('logo.png')  // true
 * QuillmarkWeb.detectBinaryFile('glue.typ')  // false
 */
function detectBinaryFile(filename: string): boolean
```

**Default binary extensions:**
`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.ico`, 
`.pdf`, `.ttf`, `.otf`, `.woff`, `.woff2`, 
`.zip`, `.tar`, `.gz`

#### `buildQuillJson(files, metadata?): QuillJson`

Low-level builder for constructing Quill JSON manually.

```typescript
/**
 * Manually construct Quill JSON from file entries
 * 
 * @example
 * const quillJson = QuillmarkWeb.buildQuillJson({
 *   'Quill.toml': { contents: '...' },
 *   'glue.typ': { contents: '...' }
 * }, { name: 'my-quill' });
 */
function buildQuillJson(
  files: Record<string, FileNode>,
  metadata?: QuillMetadata
): QuillJson
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

### Example 1: Load Quill from Zip File

```typescript
import { Quillmark, fromZip, renderToBlob, downloadArtifact } from '@quillmark-test/web';

// User uploads a .zip file
const fileInput = document.querySelector<HTMLInputElement>('#quill-upload');
fileInput?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    // Load Quill from zip
    const quillJson = await fromZip(file);
    
    // Register with engine
    const engine = Quillmark.create();
    engine.registerQuill('uploaded-template', quillJson);
    
    // Render markdown
    const markdown = '# Hello World\n\nMy first document!';
    const blob = await renderToBlob(engine, 'uploaded-template', markdown, { format: 'pdf' });
    
    // Download
    downloadArtifact(blob, 'output.pdf');
  } catch (error) {
    console.error('Failed to load Quill:', error);
  }
});
```

### Example 2: Real-time SVG Preview

```typescript
import { Quillmark, fromDirectory, renderToElement } from '@quillmark-test/web';

async function setupEditor() {
  // Load Quill from server
  const quillJson = await fromDirectory('/templates/letter', [
    'Quill.toml',
    'glue.typ',
    'assets/logo.png'
  ]);
  
  const engine = Quillmark.create();
  engine.registerQuill('letter', quillJson);
  
  // Setup editor with live preview
  const editor = document.querySelector<HTMLTextAreaElement>('#editor');
  const preview = document.querySelector<HTMLDivElement>('#preview');
  
  editor?.addEventListener('input', debounce(async () => {
    try {
      await renderToElement(
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

// Helper: Simple debounce
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), ms);
  };
}
```

### Example 3: Directory Upload

```typescript
import { Quillmark, fromFiles } from '@quillmark-test/web';

const dirInput = document.querySelector<HTMLInputElement>('#directory-upload');
dirInput?.setAttribute('webkitdirectory', '');

dirInput?.addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;

  const quillJson = await fromFiles(files);
  
  const engine = Quillmark.create();
  engine.registerQuill('user-template', quillJson);
  
  console.log('Template loaded:', engine.listQuills());
});
```

### Example 4: Drop Down to WASM API

```typescript
import { Quillmark, renderToBlob } from '@quillmark-test/web';

// Use helper for common case
const blob = await renderToBlob(engine, 'my-quill', markdown);

// Drop down to WASM API for advanced use
const result = engine.render('my-quill', markdown, {
  format: 'pdf',
  assets: {
    'custom-font.ttf': new Uint8Array([...])
  }
});

// Mix and match as needed
for (const warning of result.warnings) {
  console.warn(`[${warning.severity}] ${warning.message}`);
}
```

### Example 5: Current Demo Simplified

Here's how the existing demo (`src/main.ts`) would look with the web library:

**Before (current `src/main.ts` - ~250 lines):**
```typescript
// Manually construct file list
const USAF_MEMO_FILES = [/* 20+ file paths */];

// Helper functions for reading files
async function readTextFile(path: string): Promise<string> { /* ... */ }
async function readBinaryFile(path: string): Promise<number[]> { /* ... */ }
function insertPath(root: any, parts: string[], value: any) { /* ... */ }

// Manually build Quill JSON
async function loadUsafMemoQuill(): Promise<Quill> {
  const quillObj: any = { name: 'usaf_memo' };
  for (const relPath of USAF_MEMO_FILES) {
    // 20+ lines of path parsing, file reading, structure building
  }
  return Quill.fromJson(JSON.stringify(quillObj));
}

// Manual rendering with artifact extraction
const result = workflow.renderSource(glueResult, { format: 'svg' });
let artifactCandidate: any = result.artifacts;
if (Array.isArray(result.artifacts)) artifactCandidate = result.artifacts[0];
const normalized = toUint8ArrayFromArtifactBytes(artifactCandidate);
const svgText = new TextDecoder().decode(normalized);
preview.innerHTML = svgText;
```

**After (with `@quillmark-test/web`):**
```typescript
import { Quillmark, fromDirectory, renderToElement, renderToBlob, downloadArtifact } from '@quillmark-test/web';

async function init() {
  const editor = document.querySelector('#markdown-input');
  const preview = document.querySelector('#preview');
  
  // Load Quill (3 lines instead of 30+)
  const quillJson = await fromDirectory('/usaf_memo', [
    'Quill.toml', 'glue.typ', 'usaf_memo.md',
    'assets/CopperplateCC-Heavy.otf', /* ... other files */
  ]);
  
  const engine = Quillmark.create();
  engine.registerQuill('usaf_memo', quillJson);
  
  // Real-time SVG preview (1 line instead of 15+)
  editor.addEventListener('input', debounce(async () => {
    await renderToElement(engine, 'usaf_memo', editor.value, preview, { format: 'svg' });
  }, 300));
  
  // PDF download (3 lines instead of 25+)
  document.querySelector('#download-pdf-btn').addEventListener('click', async () => {
    const blob = await renderToBlob(engine, 'usaf_memo', editor.value, { format: 'pdf' });
    downloadArtifact(blob, 'output.pdf');
  });
}
```

---

## Re-Export Strategy

The package re-exports all WASM APIs to maintain full compatibility:

```typescript
// Re-export WASM core
export { Quillmark } from '@quillmark-test/wasm';

// Re-export WASM types
export type {
  RenderOptions,
  RenderResult,
  Artifact,
  Diagnostic,
  Location,
  QuillmarkError
} from '@quillmark-test/wasm';

// Export web utilities
export { fromZip, fromFiles, fromDirectory } from './loaders';
export { 
  renderToBlob, 
  renderToDataUrl, 
  renderToElement,
  downloadArtifact 
} from './renderers';
export { detectBinaryFile, buildQuillJson } from './utils';

// Export web types
export type { QuillJson, FileTree, FileNode, QuillMetadata } from './types';
```

**Benefits of this approach:**
- Users import one package: `@quillmark-test/web`
- Can use helpers or drop down to WASM anytime
- No version mismatches between packages
- Tree-shaking works correctly

---

## Implementation Guidelines

### Minimal Dependencies

The implementation should minimize external dependencies:

**Required:**
- `@quillmark-test/wasm@^0.0.35` - Peer dependency

**Recommended (for zip support):**
- `fflate` (~20KB) - Pure JS zip extraction, faster than jszip

**Avoid:**
- Large libraries like jszip (slower, heavier)
- Framework-specific dependencies
- Polyfills (assume modern browser)

### Error Handling

All utilities should provide clear, actionable errors:

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
│   ├── index.ts           # Main entry
│   ├── loaders.ts         # Quill loading utilities
│   ├── renderers.ts       # Rendering helpers
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

✅ **Simple Quill Loading**: `fromZip()`, `fromFiles()`, `fromDirectory()`  
✅ **Easy Rendering**: `renderToBlob()`, `renderToDataUrl()`, `renderToElement()`  
✅ **Full WASM Access**: Re-exports all low-level APIs  
✅ **Type Safety**: Complete TypeScript definitions  
✅ **Small Footprint**: <35KB total  
✅ **Framework Agnostic**: Works everywhere  

This design prioritizes developer experience while maintaining the flexibility and power of the underlying WASM API.
