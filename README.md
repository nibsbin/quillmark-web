# @quillmark-test/web

> Frontend utilities for rendering Quillmark documents in the browser

Clean, type-safe API for loading Quillmark templates and rendering to PDF/SVG.

## Installation

```bash
npm install @quillmark-test/web
```

## Quick Start

### Render to PDF

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

// Load template
const response = await fetch('/templates/letter.zip');
const quill = await loaders.fromZip(await response.blob());

// Setup engine
const engine = new Quillmark();
engine.registerQuill(quill);

// Render and download
const markdown = '# Hello World\n\nMy first document!';
const result = exporters.render(engine, markdown, { format: 'pdf' });
exporters.download(result, 'output.pdf');
```

### Live SVG Preview

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

// Setup
const quill = await loaders.fromZip(await fetch('/templates/letter.zip').then(r => r.blob()));
const engine = new Quillmark();
engine.registerQuill(quill);

// Real-time preview
const editor = document.querySelector('#editor');
const preview = document.querySelector('#preview');

editor.addEventListener('input', () => {
  const result = exporters.render(engine, editor.value);  // Auto-detects SVG
  exporters.toElement(result, preview);
});
```

## API

### `loaders.fromZip(blob: Blob)`

Load a Quill template from a zip file.

```typescript
const quill = await loaders.fromZip(zipBlob);
engine.registerQuill(quill);
```

### `exporters.render(engine, markdown, options?)`

Render markdown to a standardized result.

```typescript
const result = exporters.render(engine, markdown, {
  format: 'pdf',      // 'pdf' | 'svg' (defaults to svg)
  quillName: 'letter' // optional: override detected quill
});
```

**Returns:** `RenderResult` with standardized format
```typescript
{
  artifacts: { main: Uint8Array },
  outputFormat: 'pdf' | 'svg'
}
```

### Export Functions

All export functions accept `RenderResult` from `render()`:

```typescript
// Download as file
exporters.download(result, 'document.pdf');

// Get Blob (for upload, etc.)
const blob = exporters.toBlob(result);

// Get data URL
const dataUrl = await exporters.toDataUrl(result);

// Inject into DOM element
exporters.toElement(result, containerElement);
```

## Pattern: Render Once, Export Many

```typescript
const result = exporters.render(engine, markdown, { format: 'pdf' });

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
  const result = exporters.render(engine, editor.value);
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
  QuillInfo
} from '@quillmark-test/web';
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

**v1.0.0** - Stable API with simplified architecture

## License

Apache-2.0
