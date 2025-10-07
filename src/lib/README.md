# @quillmark-test/web - Frontend Utilities

> Opinionated, convenient utilities for working with Quillmark in the browser.

This library wraps `@quillmark-test/wasm` with high-level helpers for common frontend tasks while maintaining full access to the underlying WASM API.

## Features

✅ **Opinionated Quill Loading**: All Quills loaded from .zip files for consistency  
✅ **Easy Exporting**: Object-oriented API with `engine.exportToBlob()`, `engine.exportToDataUrl()`, `engine.exportToElement()`  
✅ **Grouped Utilities**: `loaders`, `exporters`, `utils` for clear organization  
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

### Load and Render a Quill (Recommended OOP API)

```typescript
import { Quillmark, loaders } from './lib';

async function renderDocument() {
  // Load Quill from server using grouped loaders
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  // Create engine and register
  const engine = Quillmark.create();
  engine.registerQuill('my-template', quillJson);
  
  // Export to PDF using clean OOP methods
  const markdown = '# Hello World\n\nMy first document!';
  await engine.download('my-template', markdown, 'output.pdf', { format: 'pdf' });
}
```

### Real-time SVG Preview (OOP API)

```typescript
import { Quillmark, loaders, utils } from './lib';

async function setupEditor() {
  // Load Quill from zip
  const response = await fetch('/quills/letter.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = Quillmark.create();
  engine.registerQuill('letter', quillJson);
  
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  // Use grouped utils for debounce
  editor.addEventListener('input', utils.debounce(async () => {
    await engine.exportToElement('letter', editor.value, preview, { format: 'svg' });
  }, 300));
}
```

### Alternative: Functional API

The functional API is still available for those who prefer it:

```typescript
import { Quillmark, loaders, exporters } from './lib';

async function renderDocument() {
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = Quillmark.create();
  engine.registerQuill('my-template', quillJson);
  
  const markdown = '# Hello World\n\nMy first document!';
  const blob = await exporters.toBlob(engine, 'my-template', markdown, { format: 'pdf' });
  exporters.download(blob, 'output.pdf');
}
```

### User Upload

```typescript
import { loaders } from './lib';

const fileInput = document.querySelector('input[type="file"]');
fileInput.accept = '.zip';
fileInput.addEventListener('change', async (e) => {
  const zipFile = e.target.files[0];
  const quillJson = await loaders.fromZip(zipFile);
  
  engine.registerQuill('user-template', quillJson);
});
```

## API Reference

### Enhanced Quillmark Class

The `Quillmark` class from `@quillmark-test/web` extends the WASM `Quillmark` class with convenient export methods:

#### `engine.exportToBlob(quillName, markdown, options?): Promise<Blob>`

Export rendered markdown to a Blob for download or preview.

```typescript
const blob = await engine.exportToBlob('my-quill', markdown, { format: 'pdf' });
const url = URL.createObjectURL(blob);
window.open(url);
```

#### `engine.exportToDataUrl(quillName, markdown, options?): Promise<string>`

Export rendered markdown to a data URL for inline embedding.

```typescript
const dataUrl = await engine.exportToDataUrl('my-quill', markdown, { format: 'svg' });
imgElement.src = dataUrl;
```

#### `engine.exportToElement(quillName, markdown, element, options?): Promise<void>`

Export rendered markdown directly into a DOM element.

```typescript
const preview = document.getElementById('preview');
await engine.exportToElement('my-quill', markdown, preview, { format: 'svg' });
```

#### `engine.download(quillName, markdown, filename, options?): Promise<void>`

Render markdown and trigger browser download.

```typescript
await engine.download('my-quill', markdown, 'output.pdf', { format: 'pdf' });
```

### Grouped Exports

#### `loaders`

```typescript
import { loaders } from './lib';

// loaders.fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>
const quillJson = await loaders.fromZip(zipBlob);
```

Load a Quill from a .zip file. This is the **only** supported loading method.

**Why zip-only?**
- Ensures all Quills are packaged consistently
- Simplifies distribution and sharing
- Provides built-in validation (must contain Quill.toml)
- Eliminates security concerns with directory traversal

#### `exporters`

Standalone functions for the functional API (also available as Quillmark instance methods):

```typescript
import { exporters } from './lib';

// exporters.toBlob(engine, quillName, markdown, options?): Promise<Blob>
const blob = await exporters.toBlob(engine, 'my-quill', markdown, { format: 'pdf' });

// exporters.toDataUrl(engine, quillName, markdown, options?): Promise<string>
const dataUrl = await exporters.toDataUrl(engine, 'my-quill', markdown, { format: 'svg' });

// exporters.toElement(engine, quillName, markdown, element, options?): Promise<void>
await exporters.toElement(engine, 'my-quill', markdown, preview, { format: 'svg' });

// exporters.download(blob, filename): void
exporters.download(blob, 'output.pdf');
```

#### `utils`

```typescript
import { utils } from './lib';

// utils.debounce(fn, wait): Function
const debouncedHandler = utils.debounce(() => { /* ... */ }, 300);

// utils.detectBinaryFile(filename: string): boolean
const isBinary = utils.detectBinaryFile('logo.png'); // true
```

### Backward Compatibility

For backward compatibility, the old function names are still available:

```typescript
import { 
  fromZip,              // same as loaders.fromZip
  renderToBlob,         // alias for exportToBlob
  renderToDataUrl,      // alias for exportToDataUrl
  renderToElement,      // alias for exportToElement
  downloadArtifact,     // alias for download
  debounce              // same as utils.debounce
} from './lib';
```

## Creating Quill Zip Files

To create a compatible Quill zip file:

```bash
cd your-quill-directory
zip -r my-quill.zip . -x '*.git*' -x '.quillignore'
```

The zip file must contain `Quill.toml` at the root level.

## License

ISC
