# @quillmark-test/web - Frontend Utilities

> Opinionated, convenient utilities for working with Quillmark in the browser.

This library wraps `@quillmark-test/wasm` with high-level helpers for common frontend tasks while maintaining full access to the underlying WASM API.

## Features

✅ **Opinionated Quill Loading**: All Quills loaded from .zip files for consistency  
✅ **Functional API**: Clean, grouped exports for `loaders`, `exporters`, and `utils`  
✅ **Full WASM Access**: Direct re-export of all low-level APIs  
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
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

async function renderDocument() {
  // Load Quill from server using grouped loaders
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  // Create engine and register using new() API
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  // Render and download PDF directly
  const markdown = '# Hello World\n\nMy first document!';
  await exporters.downloadDocument(engine, markdown, 'output.pdf', { format: 'pdf' });
}
```

#### Working with Blobs

If you need more control, you can use `toBlob()` or `toDataUrl()`:

```typescript
// Get blob for custom handling
const blob = await exporters.toBlob(engine, markdown, { format: 'pdf' });
const url = URL.createObjectURL(blob);
window.open(url);

// Or get data URL
const dataUrl = await exporters.toDataUrl(engine, markdown, { format: 'svg' });
imgElement.src = dataUrl;
```

### Real-time SVG Preview

```typescript
import { Quillmark, loaders, exporters, utils } from '@quillmark-test/web';

async function setupEditor() {
  // Load Quill from zip
  const response = await fetch('/quills/letter.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  // Use grouped utils for debounce
  editor.addEventListener('input', utils.debounce(async () => {
    await exporters.preview(engine, editor.value, preview, { format: 'svg' });
  }, 300));
}
```

### User Upload

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

const fileInput = document.querySelector('input[type="file"]');
fileInput.accept = '.zip';
fileInput.addEventListener('change', async (e) => {
  const zipFile = e.target.files[0];
  const quillJson = await loaders.fromZip(zipFile);
  
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  // Render and download
  const markdown = '# My Document';
  await exporters.downloadDocument(engine, markdown, 'output.pdf', { format: 'pdf' });
});
```

## API Reference

### Quillmark Class

The `Quillmark` class is re-exported directly from `@quillmark-test/wasm`. Use `new Quillmark()` to create instances:

```typescript
import { Quillmark } from '@quillmark-test/web';

const engine = new Quillmark();
```

All WASM methods are available: `registerQuill()`, `render()`, etc.

### Grouped Exports

#### `loaders`

```typescript
import { loaders } from '@quillmark-test/web';

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

Standalone functions for exporting rendered content:

```typescript
import { exporters } from '@quillmark-test/web';

// exporters.toBlob(engine, markdown, options?): Promise<Blob>
const blob = await exporters.toBlob(engine, markdown, { format: 'pdf' });

// exporters.toDataUrl(engine, markdown, options?): Promise<string>
const dataUrl = await exporters.toDataUrl(engine, markdown, { format: 'svg' });

// exporters.preview(engine, markdown, element, options?): Promise<void>
await exporters.preview(engine, markdown, previewElement, { format: 'svg' });

// exporters.exportPreview(engine, markdown, options?): Promise<RenderResult>
const result = await exporters.exportPreview(engine, markdown);

// exporters.downloadDocument(engine, markdown, filename, options?): Promise<void>
await exporters.downloadDocument(engine, markdown, 'document.pdf', { format: 'pdf' });
```

#### `utils`

```typescript
import { utils } from '@quillmark-test/web';

// utils.debounce(fn, wait): Function
const debouncedHandler = utils.debounce(() => { /* ... */ }, 300);

// utils.detectBinaryFile(filename: string): boolean
const isBinary = utils.detectBinaryFile('logo.png'); // true
```

## Creating Quill Zip Files

To create a compatible Quill zip file:

```bash
cd your-quill-directory
zip -r my-quill.zip . -x '*.git*' -x '.quillignore'
```

The zip file must contain `Quill.toml` at the root level.

## Testing

This library follows the validated testing patterns from `quillmark-wasm` end-to-end tests. See [TESTING_DIFFERENCES.md](/docs/TESTING_DIFFERENCES.md) for a detailed comparison of testing approaches.

### Test Structure

- **Unit Tests**: Test utility functions with mocks (loaders, exporters, utils)
- **Workflow Documentation**: Document expected end-to-end patterns from quillmark-wasm
- **Type Validation**: Ensure WASM returns plain objects (not Maps)

### Running Tests

```bash
npm test
```

The test suite validates:
- ✅ Zip file loading and validation
- ✅ Binary file detection
- ✅ Export functions (with mocked engines)
- ✅ Utility functions (debounce, etc.)
- 📋 Documented workflow patterns from quillmark-wasm

Note: Integration tests with actual WASM are documented but skipped in jsdom environment. They can be run in browser test environments or with proper WASM configuration.

## License

ISC
