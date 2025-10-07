# @quillmark-test/web - Frontend Utilities

> Opinionated, convenient utilities for working with Quillmark in the browser.

This library wraps `@quillmark-test/wasm` with high-level helpers for common frontend tasks while maintaining full access to the underlying WASM API.

## Features

✅ **Simple Quill Loading**: `fromZip()`, `fromFiles()`, `fromDirectory()`  
✅ **Easy Rendering**: `renderToBlob()`, `renderToDataUrl()`, `renderToElement()`  
✅ **Full WASM Access**: Re-exports all low-level APIs  
✅ **Type Safety**: Complete TypeScript definitions  
✅ **Small Footprint**: ~35KB total with zip support  
✅ **Framework Agnostic**: Works with vanilla JS, React, Vue, Svelte, etc.

## Installation

```bash
npm install @quillmark-test/wasm @quillmark-test/web
```

## Quick Start

### Load and Render a Quill

```typescript
import { QuillmarkEngine, Quill, fromDirectory, renderToBlob, downloadArtifact } from './lib';

async function renderDocument() {
  // Load Quill from server directory
  const quillJson = await fromDirectory('/templates/usaf-memo', [
    'Quill.toml',
    'glue.typ',
    'assets/logo.png'
  ]);
  
  // Create engine and register
  const engine = QuillmarkEngine.create({});
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
  
  // Render to PDF
  const markdown = '# Hello World\n\nMy first document!';
  const blob = await renderToBlob(engine, 'usaf-memo', markdown, { format: 'pdf' });
  
  // Download
  downloadArtifact(blob, 'output.pdf');
}
```

### Real-time SVG Preview

```typescript
import { QuillmarkEngine, Quill, fromDirectory, renderToElement, debounce } from './lib';

async function setupEditor() {
  const quillJson = await fromDirectory('/templates/letter', [
    'Quill.toml', 'glue.typ', 'assets/logo.png'
  ]);
  
  const engine = QuillmarkEngine.create({});
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
  
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  editor.addEventListener('input', debounce(async () => {
    await renderToElement(engine, 'letter', editor.value, preview, { format: 'svg' });
  }, 300));
}
```

### Load from Zip File

```typescript
import { fromZip } from './lib';

const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const zipFile = e.target.files[0];
  const quillJson = await fromZip(zipFile);
  
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
});
```

### Load from Directory Upload

```typescript
import { fromFiles } from './lib';

const dirInput = document.querySelector('input[type="file"]');
dirInput.setAttribute('webkitdirectory', '');

dirInput.addEventListener('change', async (e) => {
  const quillJson = await fromFiles(e.target.files);
  const quill = Quill.fromJson(JSON.stringify(quillJson));
  engine.registerQuill(quill);
});
```

## API Reference

### Loaders

#### `fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>`

Load a Quill from a .zip file.

#### `fromDirectory(baseUrl: string, files: string[]): Promise<QuillJson>`

Load a Quill by fetching files from a directory.

#### `fromFiles(files: FileList | File[]): Promise<QuillJson>`

Load a Quill from uploaded files (supports directory uploads).

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

## License

ISC
