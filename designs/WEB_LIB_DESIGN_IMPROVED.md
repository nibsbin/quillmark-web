# Quillmark Web Library Design - Improved API

> **Status**: Design Proposal
>
> This document proposes improvements to the `@quillmark-test/web` package API design for better discoverability, cleaner method organization, and more intuitive naming.

---

## Table of Contents

1. [Motivation](#motivation)
2. [Proposed Changes](#proposed-changes)
3. [Architecture Overview](#architecture-overview)
4. [Improved API Surface](#improved-api-surface)
5. [Usage Examples](#usage-examples)
6. [Migration Guide](#migration-guide)
7. [Benefits](#benefits)

---

## Motivation

The current `@quillmark-test/web` design (documented in `WEB_LIB_DESIGN.md`) has the following areas for improvement:

### 1. Unclear Terminology: "Renderers"

The term "renderers" is ambiguous in the Quillmark context:
- **Rendering** typically refers to the core Quillmark operation: converting markdown to artifacts (PDF, SVG, etc.)
- **Exporting** better describes the web utilities: converting rendered artifacts into browser-friendly formats (Blobs, data URLs, DOM elements)

**Current confusion:**
```typescript
// Is this rendering markdown or exporting an artifact?
renderToBlob(engine, 'my-quill', markdown)
```

**Proposed clarity:**
```typescript
// Clear: this exports a rendered artifact to a blob
exportToBlob(engine, 'my-quill', markdown)
```

### 2. Scattered API Surface

Rendering methods exist as standalone functions, requiring users to import and manage multiple pieces:

**Current approach:**
```typescript
import { Quillmark, renderToBlob, renderToElement } from '@quillmark-test/web';

const engine = Quillmark.create();
// ... register quill ...

// Methods are scattered - not discoverable via engine object
await renderToBlob(engine, 'my-quill', markdown);
await renderToElement(engine, 'my-quill', markdown, element);
```

**Proposed approach:**
```typescript
import { Quillmark } from '@quillmark-test/web';

const engine = Quillmark.create();
// ... register quill ...

// Methods are attached to engine - discoverable via IDE autocomplete
await engine.exportToBlob('my-quill', markdown);
await engine.exportToElement('my-quill', markdown, element);
```

### 3. Poor Discoverability

The current flat export structure makes it hard to discover related utilities:

**Current structure:**
```typescript
export { 
  Quillmark,
  fromZip,
  renderToBlob,
  renderToDataUrl,
  renderToElement,
  downloadArtifact,
  detectBinaryFile,
  debounce
}
```

Users must know exact function names. There's no clear grouping of loaders vs exporters vs utilities.

**Proposed structure:**
```typescript
export { 
  Quillmark,          // Enhanced with export methods
  loaders,            // { fromZip }
  exporters,          // { toBlob, toDataUrl, toElement, download }
  utils               // { detectBinaryFile, debounce }
}
```

---

## Proposed Changes

### Change 1: Rename "Renderers" to "Exporters"

**Rationale:** 
- "Render" is the core WASM operation (`engine.render()`)
- "Export" describes converting rendered artifacts to browser formats
- Avoids confusion between `engine.render()` and `renderToBlob()`

**Changes:**
- `src/lib/renderers.ts` → `src/lib/exporters.ts`
- `renderToBlob()` → `exportToBlob()`
- `renderToDataUrl()` → `exportToDataUrl()`
- `renderToElement()` → `exportToElement()`
- `downloadArtifact()` → `download()` (cleaner, still clear in context)

### Change 2: Move Export Methods to Quillmark Class

**Rationale:**
- Better discoverability via IDE autocomplete
- More object-oriented, less functional
- Reduces imports (one import instead of many)
- Follows convention of other libraries (e.g., `canvas.toBlob()`, `canvas.toDataURL()`)

**Changes:**
- Add methods to `Quillmark` class (extended in web package):
  - `Quillmark.prototype.exportToBlob(quillName, markdown, options?)`
  - `Quillmark.prototype.exportToDataUrl(quillName, markdown, options?)`
  - `Quillmark.prototype.exportToElement(quillName, markdown, element, options?)`
  - `Quillmark.prototype.download(quillName, markdown, filename, options?)`

**Implementation approach:**
Since we can't modify the WASM class directly, we extend it in the web package:

```typescript
// src/lib/index.ts
import { Quillmark as WasmQuillmark } from '@quillmark-test/wasm';
import { exportToBlob, exportToDataUrl, exportToElement, download } from './exporters';

// Extend Quillmark with web utilities
class Quillmark extends WasmQuillmark {
  async exportToBlob(quillName: string, markdown: string, options?: RenderOptions): Promise<Blob> {
    return exportToBlob(this, quillName, markdown, options);
  }
  
  async exportToDataUrl(quillName: string, markdown: string, options?: RenderOptions): Promise<string> {
    return exportToDataUrl(this, quillName, markdown, options);
  }
  
  async exportToElement(quillName: string, markdown: string, element: HTMLElement, options?: RenderOptions): Promise<void> {
    return exportToElement(this, quillName, markdown, element, options);
  }
  
  async download(quillName: string, markdown: string, filename: string, options?: RenderOptions): Promise<void> {
    const blob = await exportToBlob(this, quillName, markdown, options);
    download(blob, filename);
  }
}

export { Quillmark };
```

### Change 3: Provide Grouped Exports

**Rationale:**
- Improves discoverability
- Makes API surface clear at a glance
- Allows for targeted imports (`import { loaders } from '@quillmark-test/web'`)

**Changes:**

```typescript
// src/lib/index.ts

// Individual exports (backward compatible)
export { Quillmark, Quill } from './quillmark';
export { fromZip } from './loaders';
export { exportToBlob, exportToDataUrl, exportToElement, download } from './exporters';
export { detectBinaryFile, debounce } from './utils';

// Grouped exports (new)
export const loaders = {
  fromZip
};

export const exporters = {
  toBlob: exportToBlob,
  toDataUrl: exportToDataUrl,
  toElement: exportToElement,
  download
};

export const utils = {
  detectBinaryFile,
  debounce
};
```

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
│                                       │
│  ┌────────────────────────────────┐  │
│  │  Enhanced Quillmark Class      │  │
│  │  - create()                    │  │
│  │  - registerQuill()             │  │
│  │  - render()          [WASM]    │  │
│  │  - exportToBlob()    [Web]     │  │
│  │  - exportToDataUrl() [Web]     │  │
│  │  - exportToElement() [Web]     │  │
│  │  - download()        [Web]     │  │
│  └────────────────────────────────┘  │
│                                       │
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
│    @quillmark-test/wasm@v0.0.35      │
│         (Low-level WASM API)          │
└──────────────────────────────────────┘
```

---

## Improved API Surface

### Enhanced Quillmark Class

```typescript
class Quillmark {
  // ========================================
  // WASM Core Methods (from @quillmark-test/wasm)
  // ========================================
  
  static create(): Quillmark;
  registerQuill(name: string, quillJson: string | object): void;
  render(quillName: string, markdown: string, options?: RenderOptions): RenderResult;
  renderGlue(quillName: string, markdown: string): string;
  listQuills(): string[];
  unregisterQuill(name: string): void;
  
  // ========================================
  // Web Export Methods (from @quillmark-test/web)
  // ========================================
  
  /**
   * Export rendered markdown to a Blob
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param options - Render options (format, assets, etc.)
   * @returns Blob containing the rendered artifact
   * 
   * @example
   * const blob = await engine.exportToBlob('my-quill', markdown, { format: 'pdf' });
   * const url = URL.createObjectURL(blob);
   * window.open(url);
   */
  exportToBlob(
    quillName: string,
    markdown: string,
    options?: RenderOptions
  ): Promise<Blob>;
  
  /**
   * Export rendered markdown to a data URL
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param options - Render options (format, assets, etc.)
   * @returns Data URL string
   * 
   * @example
   * const dataUrl = await engine.exportToDataUrl('my-quill', markdown, { format: 'svg' });
   * imgElement.src = dataUrl;
   */
  exportToDataUrl(
    quillName: string,
    markdown: string,
    options?: RenderOptions
  ): Promise<string>;
  
  /**
   * Export rendered markdown directly into a DOM element
   * 
   * For SVG: Injects SVG markup directly
   * For PDF: Creates an embed or iframe element
   * For TXT: Displays as pre-formatted text
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param element - Target HTML element
   * @param options - Render options (format, assets, etc.)
   * 
   * @example
   * const preview = document.getElementById('preview');
   * await engine.exportToElement('my-quill', markdown, preview, { format: 'svg' });
   */
  exportToElement(
    quillName: string,
    markdown: string,
    element: HTMLElement,
    options?: RenderOptions
  ): Promise<void>;
  
  /**
   * Render markdown and download the artifact
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param filename - Name for the downloaded file
   * @param options - Render options (format, assets, etc.)
   * 
   * @example
   * await engine.download('my-quill', markdown, 'output.pdf', { format: 'pdf' });
   */
  download(
    quillName: string,
    markdown: string,
    filename: string,
    options?: RenderOptions
  ): Promise<void>;
}
```

### Grouped Utilities

```typescript
// Loaders
export const loaders = {
  /**
   * Load a Quill template from a .zip file
   * 
   * @param zipFile - Zip file containing Quill template (must include Quill.toml at root)
   * @returns Quill JSON object ready for registerQuill()
   * @throws Error if zip is invalid or missing Quill.toml
   */
  fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>
};

// Exporters (standalone functions, also available as Quillmark methods)
export const exporters = {
  /**
   * Export rendered markdown to a Blob
   */
  toBlob(
    engine: Quillmark,
    quillName: string,
    markdown: string,
    options?: RenderOptions
  ): Promise<Blob>,
  
  /**
   * Export rendered markdown to a data URL
   */
  toDataUrl(
    engine: Quillmark,
    quillName: string,
    markdown: string,
    options?: RenderOptions
  ): Promise<string>,
  
  /**
   * Export rendered markdown directly into a DOM element
   */
  toElement(
    engine: Quillmark,
    quillName: string,
    markdown: string,
    element: HTMLElement,
    options?: RenderOptions
  ): Promise<void>,
  
  /**
   * Trigger browser download of a blob
   */
  download(blob: Blob, filename: string): void
};

// Utilities
export const utils = {
  /**
   * Check if a filename indicates a binary file
   */
  detectBinaryFile(filename: string): boolean,
  
  /**
   * Debounce a function call
   */
  debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void
};
```

---

## Usage Examples

### Example 1: Object-Oriented API (Recommended)

```typescript
import { Quillmark, loaders } from '@quillmark-test/web';

async function renderDocument() {
  // Load Quill
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  // Create engine and register
  const engine = Quillmark.create();
  engine.registerQuill('my-template', quillJson);
  
  // Export to various formats using clean method calls
  const markdown = '# Hello World\n\nMy first document!';
  
  // Export to blob
  const blob = await engine.exportToBlob('my-template', markdown, { format: 'pdf' });
  
  // Export to data URL
  const dataUrl = await engine.exportToDataUrl('my-template', markdown, { format: 'svg' });
  
  // Export to element
  const preview = document.getElementById('preview');
  await engine.exportToElement('my-template', markdown, preview, { format: 'svg' });
  
  // Download
  await engine.download('my-template', markdown, 'output.pdf', { format: 'pdf' });
}
```

### Example 2: Functional API (Still Supported)

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

async function renderDocument() {
  // Load Quill
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  // Create engine and register
  const engine = Quillmark.create();
  engine.registerQuill('my-template', quillJson);
  
  const markdown = '# Hello World\n\nMy first document!';
  
  // Use standalone functions from grouped exports
  const blob = await exporters.toBlob(engine, 'my-template', markdown, { format: 'pdf' });
  const dataUrl = await exporters.toDataUrl(engine, 'my-template', markdown, { format: 'svg' });
  
  const preview = document.getElementById('preview');
  await exporters.toElement(engine, 'my-template', markdown, preview, { format: 'svg' });
  
  exporters.download(blob, 'output.pdf');
}
```

### Example 3: Real-time Preview with Enhanced API

```typescript
import { Quillmark, loaders, utils } from '@quillmark-test/web';

async function setupEditor() {
  // Load Quill from server
  const response = await fetch('/templates/letter.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = Quillmark.create();
  engine.registerQuill('letter', quillJson);
  
  // Setup editor with live preview
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  // Clean, discoverable API
  editor.addEventListener('input', utils.debounce(async () => {
    try {
      await engine.exportToElement('letter', editor.value, preview, { format: 'svg' });
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, 300));
  
  // Download button
  document.querySelector('#download-btn').addEventListener('click', async () => {
    await engine.download('letter', editor.value, 'letter.pdf', { format: 'pdf' });
  });
}
```

### Example 4: Discovering API via IDE

With the improved API, developers can discover methods via autocomplete:

```typescript
import { Quillmark } from '@quillmark-test/web';

const engine = Quillmark.create();

// Type "engine." and IDE shows:
// - registerQuill()
// - render()
// - renderGlue()
// - exportToBlob()        ← New! Discoverable
// - exportToDataUrl()     ← New! Discoverable
// - exportToElement()     ← New! Discoverable
// - download()            ← New! Discoverable
// - listQuills()
// - unregisterQuill()
```

---

## Migration Guide

### From Current API to Improved API

#### Renaming

| **Current**                  | **Improved**                      | **Notes**                             |
|------------------------------|-----------------------------------|---------------------------------------|
| `renderToBlob()`             | `exportToBlob()` or `engine.exportToBlob()` | Renamed for clarity    |
| `renderToDataUrl()`          | `exportToDataUrl()` or `engine.exportToDataUrl()` | Renamed for clarity |
| `renderToElement()`          | `exportToElement()` or `engine.exportToElement()` | Renamed for clarity |
| `downloadArtifact()`         | `download()` or `exporters.download()` | Renamed for brevity       |

#### Method Attachment

**Before:**
```typescript
import { Quillmark, renderToBlob } from '@quillmark-test/web';

const engine = Quillmark.create();
const blob = await renderToBlob(engine, 'my-quill', markdown);
```

**After (Option 1 - OOP):**
```typescript
import { Quillmark } from '@quillmark-test/web';

const engine = Quillmark.create();
const blob = await engine.exportToBlob('my-quill', markdown);
```

**After (Option 2 - Functional):**
```typescript
import { Quillmark, exporters } from '@quillmark-test/web';

const engine = Quillmark.create();
const blob = await exporters.toBlob(engine, 'my-quill', markdown);
```

#### Grouped Imports

**Before:**
```typescript
import { 
  Quillmark, 
  fromZip, 
  renderToBlob, 
  renderToElement, 
  downloadArtifact,
  detectBinaryFile,
  debounce
} from '@quillmark-test/web';
```

**After:**
```typescript
import { Quillmark, loaders, exporters, utils } from '@quillmark-test/web';

// Use as:
loaders.fromZip(...)
exporters.toBlob(...)
exporters.download(...)
utils.detectBinaryFile(...)
utils.debounce(...)
```

---

## Benefits

### 1. Clearer Terminology

- **"Export"** clearly indicates conversion to browser formats
- **"Render"** is reserved for the core WASM operation
- Reduces confusion between `engine.render()` and `renderToBlob()`

### 2. Better Discoverability

- Methods attached to `Quillmark` class are discoverable via IDE autocomplete
- Grouped exports (`loaders`, `exporters`, `utils`) provide clear categorization
- New developers can explore the API surface more easily

### 3. Improved Developer Experience

- **Less to import**: One import for `Quillmark` gets you most functionality
- **Intuitive method calls**: `engine.exportToBlob()` reads naturally
- **Consistent with browser APIs**: Similar to `canvas.toBlob()`, `canvas.toDataURL()`

### 4. Backward Compatible Path

- Standalone functions still available (`exportToBlob()`, etc.)
- Grouped exports are additive, not breaking
- Migration can be gradual

### 5. Framework-Agnostic Design

- Object-oriented API works well with frameworks (React, Vue, Svelte)
- Functional API still available for those who prefer it
- No framework-specific dependencies

### 6. Cleaner Code

**Before:**
```typescript
import { Quillmark, renderToBlob, renderToElement, downloadArtifact } from '@quillmark-test/web';

const engine = Quillmark.create();
await renderToElement(engine, 'my-quill', markdown, preview, { format: 'svg' });
const blob = await renderToBlob(engine, 'my-quill', markdown, { format: 'pdf' });
downloadArtifact(blob, 'output.pdf');
```

**After:**
```typescript
import { Quillmark } from '@quillmark-test/web';

const engine = Quillmark.create();
await engine.exportToElement('my-quill', markdown, preview, { format: 'svg' });
await engine.download('my-quill', markdown, 'output.pdf', { format: 'pdf' });
```

---

## Implementation Notes

### File Structure Changes

```diff
  src/lib/
  ├── index.ts              # Enhanced with Quillmark extension and grouped exports
  ├── loaders.ts            # Unchanged
- ├── renderers.ts          # Removed
+ ├── exporters.ts          # Renamed from renderers.ts
  ├── utils.ts              # Unchanged
  ├── types.ts              # Unchanged
  └── README.md             # Updated
```

### Type Safety

All methods maintain full type safety:

```typescript
// TypeScript knows the return type
const blob: Blob = await engine.exportToBlob('my-quill', markdown);

// Autocomplete for options
await engine.exportToElement('my-quill', markdown, element, {
  format: 'svg' | 'pdf' | 'txt'  // ← IDE autocomplete
});
```

### Tree-Shaking

The improved design maintains tree-shaking compatibility:

```typescript
// Only imports Quillmark and exportToBlob
import { Quillmark } from '@quillmark-test/web';
const blob = await engine.exportToBlob(...);

// Only imports loaders.fromZip
import { loaders } from '@quillmark-test/web';
const quillJson = await loaders.fromZip(...);
```

---

## Summary

The improved `@quillmark-test/web` design provides:

✅ **Clearer Terminology**: "Exporters" instead of "Renderers"  
✅ **Better Discoverability**: Methods attached to `Quillmark` class  
✅ **Grouped Utilities**: `loaders`, `exporters`, `utils` for clear organization  
✅ **Improved DX**: Less to import, more intuitive method calls  
✅ **Backward Compatible**: Functional API still supported  
✅ **Framework Agnostic**: Works everywhere  
✅ **Type Safe**: Full TypeScript support

This design maintains the flexibility and power of the original while significantly improving the developer experience through better organization, clearer naming, and improved discoverability.
