# @quillmark/web-utils - Frontend Utilities

> Opinionated, convenient utilities for working with Quillmark in the browser.

This library wraps `@quillmark/wasm` with high-level helpers for common frontend tasks while maintaining full access to the underlying WASM API.

## Features

✅ **Opinionated Quill Loading**: All Quills loaded from .zip files for consistency  
✅ **Functional API**: Clean, grouped exports for `loaders`, `exporters`, and `utils`  
✅ **Full WASM Access**: Direct re-export of all low-level APIs  
✅ **Type Safety**: Complete TypeScript definitions  
✅ **Small Footprint**: ~28KB total with zip support  
✅ **Framework Agnostic**: Works with vanilla JS, React, Vue, Svelte, etc.

## Installation

```bash
npm install @quillmark/wasm @quillmark/web-utils
```

## Philosophy: Zip-Only Loading

This library takes an opinionated approach: **all Quills must be loaded from .zip files**. This ensures:

- 📦 **Portability**: Quills are self-contained and easy to distribute
- 🔒 **Security**: No directory traversal or file system concerns
- 🎯 **Simplicity**: One clear way to load templates
- ✅ **Validation**: Zip files are validated and must contain `Quill.toml`

## Quick Start

### Load and Render a Quill (New API)

```typescript
import { Quillmark, loaders, exporters } from '@quillmark/web-utils';

async function renderDocument() {
  // Load Quill from server
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  // Create engine and register template
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  // Render markdown
  const markdown = '# Hello World\n\nMy first document!';
  const result = exporters.render(engine, markdown, { format: 'pdf' });
  
  // Download the rendered document
  exporters.download(result, 'output.pdf');
}
```

### Real-time SVG Preview (New API)

```typescript
import { Quillmark, loaders, exporters, utils } from '@quillmark/web-utils';

async function setupEditor() {
  // Load Quill from zip
  const response = await fetch('/quills/letter.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  // Update preview as user types (debounced)
  editor.addEventListener('input', utils.debounce(() => {
    const result = exporters.render(engine, editor.value);
    exporters.toElement(result, preview);
  }, 300));
}
```

### Render Once, Export Many Times

```typescript
import { Quillmark, loaders, exporters } from '@quillmark/web-utils';

async function exportMultipleFormats() {
  const response = await fetch('/quills/letter.zip');
  const quillJson = await loaders.fromZip(await response.blob());
  
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  const markdown = '# My Document\n\nContent here.';
  
  // Render once
  const result = exporters.render(engine, markdown, { format: 'svg' });
  
  // Export to multiple formats efficiently
  const blob = exporters.toBlob(result);
  const dataUrl = await exporters.toDataUrl(result);
  const preview = document.querySelector('#preview');
  exporters.toElement(result, preview);
  exporters.download(result, 'document.svg');
}
```

## API Reference

### Quillmark Class

The `Quillmark` class is re-exported directly from `@quillmark/wasm`. Use `new Quillmark()` to create instances:

```typescript
import { Quillmark } from '@quillmark/web-utils';

const engine = new Quillmark();
```

All WASM methods are available: `registerQuill()`, `render()`, etc.

### Grouped Exports

#### `loaders`

```typescript
import { loaders } from '@quillmark/web-utils';

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

The exporters provide a clean, composable API for rendering and exporting documents:

```typescript
import { exporters } from '@quillmark/web-utils';

// 1. Render markdown to get a result
const result = exporters.render(engine, markdown, { format: 'pdf' });

// 2. Convert result to various formats
const blob = exporters.toBlob(result);
const dataUrl = await exporters.toDataUrl(result);
exporters.toElement(result, previewElement);
exporters.download(result, 'output.pdf');
```

**Key Functions:**

- **`render(engine, markdown, options?): RenderResult`** - Core rendering function. Parses markdown and renders it using the engine.
- **`toBlob(result): Blob`** - Convert a render result to a Blob.
- **`toDataUrl(result): Promise<string>`** - Convert a render result to a data URL.
- **`toElement(result, element)`** - Display a render result in a DOM element (intelligently handles SVG, PDF, and text).
- **`download(result, filename)`** - Trigger a browser download with the appropriate MIME type.

**Benefits:**
- Single `render()` function is the clear entry point
- Render once, export many times (more efficient)
- Pure conversion functions are easier to test and compose
- Consistent naming and parameter ordering
- Better separation of concerns

#### `utils`

```typescript
import { utils } from '@quillmark/web-utils';

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

This library follows the validated testing patterns from `quillmark-wasm` end-to-end tests.

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
