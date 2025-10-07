# @quillmark-test/web - Frontend Utilities

> Opinionated, convenient utilities for working with Quillmark in the browser.

This library wraps `@quillmark-test/wasm` with high-level helpers for common frontend tasks while maintaining full access to the underlying WASM API.

## Features

✅ **Opinionated Quill Loading**: All Quills loaded from .zip files for consistency  
✅ **Easy Rendering**: `renderToBlob()`, `renderToDataUrl()`, `renderToElement()`  
✅ **Full WASM Access**: Re-exports all low-level APIs  
✅ **Type Safety**: Complete TypeScript definitions  
✅ **Small Footprint**: ~28KB total with zip support  
✅ **Framework Agnostic**: Works with vanilla JS, React, Vue, Svelte, etc.

## Installation

```bash
npm install @quillmark-test/wasm @quillmark-test/web
```

## Philosophy: Zip-Only Loading

This library takes an opinionated approach: **all Quills must be loaded from .zip files**. This ensures:

- 📦 **Portability**: Quills are self-contained and easy to distribute
- 🔒 **Security**: No directory traversal or file system concerns
- 🎯 **Simplicity**: One clear way to load templates
- ✅ **Validation**: Zip files are validated and must contain `Quill.toml`

## Quick Start

### Load and Render a Quill

```typescript
import { Quillmark, Quill, fromZip, renderToBlob, downloadArtifact } from './lib';

async function renderDocument() {
  // Load Quill from server
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await fromZip(zipBlob);
  
  // Create engine and register
  const engine = Quillmark.create();
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
  
  // Render to PDF
  const markdown = '# Hello World\n\nMy first document!';
  const blob = await renderToBlob(engine, 'my-template', markdown, { format: 'pdf' });
  
  // Download
  downloadArtifact(blob, 'output.pdf');
}
```

### Real-time SVG Preview

```typescript
import { Quillmark, Quill, fromZip, renderToElement, debounce } from './lib';

async function setupEditor() {
  // Load Quill from zip
  const response = await fetch('/quills/letter.zip');
  const zipBlob = await response.blob();
  const quillJson = await fromZip(zipBlob);
  
  const engine = Quillmark.create();
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
  
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  editor.addEventListener('input', debounce(async () => {
    await renderToElement(engine, 'letter', editor.value, preview, { format: 'svg' });
  }, 300));
}
```

### User Upload

```typescript
import { fromZip } from './lib';

const fileInput = document.querySelector('input[type="file"]');
fileInput.accept = '.zip';
fileInput.addEventListener('change', async (e) => {
  const zipFile = e.target.files[0];
  const quillJson = await fromZip(zipFile);
  
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
});
```

## API Reference

### Loaders

#### `fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>`

Load a Quill from a .zip file. This is the **only** supported loading method.

**Why zip-only?**
- Ensures all Quills are packaged consistently
- Simplifies distribution and sharing
- Provides built-in validation (must contain Quill.toml)
- Eliminates security concerns with directory traversal

### Renderers

#### `renderToBlob(engine, quillName, markdown, options?): Promise<Blob>`

Render markdown to a Blob for download or preview.

#### `renderToDataUrl(engine, quillName, markdown, options?): Promise<string>`

Render markdown to a data URL for inline embedding.

#### `renderToElement(engine, quillName, markdown, element, options?): Promise<void>`

Render markdown directly into a DOM element.

#### `downloadArtifact(blob: Blob, filename: string): void`

Trigger browser download of a rendered artifact.

### Utilities

#### `debounce(fn, wait): Function`

Simple debounce function for event handlers.

#### `detectBinaryFile(filename: string): boolean`

Determine if a file should be treated as binary.

## Creating Quill Zip Files

To create a compatible Quill zip file:

```bash
cd your-quill-directory
zip -r my-quill.zip . -x '*.git*' -x '.quillignore'
```

The zip file must contain `Quill.toml` at the root level.

## License

ISC
