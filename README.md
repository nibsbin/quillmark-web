# @quillmark-test/web

> Frontend utilities for rendering Quillmark documents in the browser

Clean, type-safe API for loading Quillmark templates and rendering to PDF/SVG.

## Installation

```bash
npm install @quillmark-test/web @quillmark-test/wasm
```

> **Note:** `@quillmark-test/wasm` is a peer dependency and must be installed alongside this package.

## Quick Start

### Render to PDF

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, exporters } from '@quillmark-test/web';

// Load template
const response = await fetch('/templates/letter.zip');
const quill = await loaders.fromZip(await response.blob());

// Setup engine
const engine = new Quillmark();
engine.registerQuill(quill);

// Parse and render
const markdown = '# Hello World\n\nMy first document!';
const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, { format: 'pdf' });
exporters.download(result, 'output.pdf');
```

### Get SVG String (Primary Use Case)

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, exporters } from '@quillmark-test/web';

// Setup
const quill = await loaders.fromZip(await fetch('/templates/letter.zip').then(r => r.blob()));
const engine = new Quillmark();
engine.registerQuill(quill);

// Parse markdown and render to SVG
const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed);  // Defaults to SVG
const svgString = new TextDecoder().decode(result.artifacts as Uint8Array);

// Use in your application
myCustomWidget.innerHTML = svgString;
document.getElementById('preview').innerHTML = svgString;
```

### Live Preview with toElement()

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { exporters } from '@quillmark-test/web';

// Alternative: Use toElement() for quick demos/playgrounds
const editor = document.querySelector('#editor');
const preview = document.querySelector('#preview');

editor.addEventListener('input', () => {
  const parsed = Quillmark.parseMarkdown(editor.value);
  const result = exporters.render(engine, parsed);
  exporters.toElement(result, preview);  // Handles SVG/PDF automatically
});
```

## API

### `loaders.fromZip(blob: Blob)`

Load a Quill template from a zip file.

```typescript
const quill = await loaders.fromZip(zipBlob);
engine.registerQuill(quill);
```

### `exporters.render(engine, parsed, options?)`

Render a pre-parsed document to a standardized result.

```typescript
import { Quillmark } from '@quillmark-test/wasm';

const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, {
  format: 'pdf',      // 'pdf' | 'svg' (defaults to svg)
  quillName: 'letter' // optional: override detected quill
});
```

**Returns:** `RenderResult` with standardized format
```typescript
{
  artifacts: Uint8Array | Uint8Array[] | Record<string, Uint8Array>,
  outputFormat: 'pdf' | 'svg'
}
```

For single-page documents, `artifacts` is a `Uint8Array`. For multi-page documents, it's `Uint8Array[]`. For documents with named artifacts, it's `Record<string, Uint8Array>`.

### Export Functions

All export functions accept `RenderResult` from `render()`:

```typescript
// Get SVG string (primary use case - direct access)
const svgString = new TextDecoder().decode(result.artifacts as Uint8Array);
myWidget.innerHTML = svgString;

// Get Blob (for upload, storage, etc.)
const blob = exporters.toBlob(result);

// Get data URL
const dataUrl = await exporters.toDataUrl(result);

// Inject into DOM element (convenience for demos)
exporters.toElement(result, containerElement);

// Download as file
exporters.download(result, 'document.pdf');
```

## Pattern: Render Once, Export Many

```typescript
const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, { format: 'pdf' });

// Export to multiple formats without re-rendering
const blob = exporters.toBlob(result);
const dataUrl = await exporters.toDataUrl(result);
exporters.download(result, 'document.pdf');
```

## Utilities

```typescript
import { utils } from '@quillmark-test/web';

// Debounce for live preview
editor.addEventListener('input', utils.debounce(() => {
  const parsed = Quillmark.parseMarkdown(editor.value);
  const result = exporters.render(engine, parsed);
  exporters.toElement(result, preview);
}, 300));

// Detect binary files (for custom loaders)
if (utils.detectBinaryFile('image.png')) {
  // Handle as binary
}
```

## TypeScript

Full type definitions included:

```typescript
import type {
  RenderResult,
  RenderOptions,
  RenderFormat,
  QuillJson,
  QuillInfo,
  QuillmarkEngine,
  ParsedDocument
} from '@quillmark-test/web';
```

## Migration from v1.x to v2.0.0

### Breaking Changes

1. **`@quillmark-test/wasm` is now a peer dependency** - You must install it separately:
   ```bash
   npm install @quillmark-test/web @quillmark-test/wasm
   ```

2. **`Quillmark` is no longer re-exported** - Import it directly from `@quillmark-test/wasm`:
   ```typescript
   // Before (v1.x)
   import { Quillmark, exporters } from '@quillmark-test/web';
   
   // After (v2.0.0)
   import { Quillmark } from '@quillmark-test/wasm';
   import { exporters } from '@quillmark-test/web';
   ```

3. **`render()` signature changed** - It now accepts `ParsedDocument` instead of `string`:
   ```typescript
   // Before (v1.x)
   const result = exporters.render(engine, markdown, { format: 'pdf' });
   
   // After (v2.0.0)
   const parsed = Quillmark.parseMarkdown(markdown);
   const result = exporters.render(engine, parsed, { format: 'pdf' });
   ```

### Migration Steps

1. Update package.json to include both packages
2. Update imports to source `Quillmark` from `@quillmark-test/wasm`
3. Pre-parse markdown before calling `render()`

### Full Migration Example

```typescript
// Before (v1.x)
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

const engine = new Quillmark();
engine.registerQuill(quill);
const result = exporters.render(engine, markdown, { format: 'pdf' });
exporters.download(result, 'output.pdf');

// After (v2.0.0)
import { Quillmark } from '@quillmark-test/wasm';
import { loaders, exporters } from '@quillmark-test/web';

const engine = new Quillmark();
engine.registerQuill(quill);
const parsed = Quillmark.parseMarkdown(markdown);
const result = exporters.render(engine, parsed, { format: 'pdf' });
exporters.download(result, 'output.pdf');
```

## Quill Template Format

Templates are zip files containing:
- `Quill.toml` - Template configuration
- `glue.typ` - Typst template
- `assets/` - Fonts, images, etc.
- `packages/` - Typst packages

When loaded via `fromZip()`, they become `QuillJson`:
```typescript
{
  files: {
    'Quill.toml': { contents: '...' },
    'glue.typ': { contents: '...' },
    'assets': {
      'font.otf': { contents: [137, 80, ...] }  // Binary as number array
    }
  }
}
```

## Browser Support

- Modern browsers with WebAssembly support
- ES2020+
- No polyfills required

## Playground

This repository also includes an interactive playground:

```bash
git clone https://github.com/nibsbin/quillmark-web.git
cd quillmark-web
npm install
npm run dev
```

Visit http://localhost:5173 for a live editor with template selection and real-time preview.

## Version

**v2.0.0** - Breaking change: peer dependency model with `QuillmarkEngine` interface

## License

Apache-2.0
