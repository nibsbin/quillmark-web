# @quillmark-test/web

> Utilities for loading Quillmark templates in the browser

Lightweight utility library for loading Quill templates from zip files. For rendering, use `@quillmark-test/wasm` directly.

## Installation

```bash
npm install @quillmark-test/web
```

> **Note:** `@quillmark-test/wasm` is an optional peer dependency. Install it if you need rendering functionality.

## Quick Start

### Load and Render a Template

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders } from '@quillmark-test/web';

// Load template from zip
const response = await fetch('/templates/letter.zip');
const quill = await loaders.fromZip(await response.blob());

// Setup engine
const engine = new Quillmark();
engine.registerQuill(quill);

// Parse and render directly with WASM
const markdown = '# Hello World\n\nMy first document!';
const parsed = Quillmark.parseMarkdown(markdown);
const result = engine.render(parsed, { format: 'pdf' });

// Download the result
const blob = new Blob([result.artifacts[0].bytes], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'output.pdf';
a.click();
URL.revokeObjectURL(url);
```

### Get SVG String

```typescript
import { Quillmark } from '@quillmark-test/wasm';
import { loaders } from '@quillmark-test/web';

// Setup
const quill = await loaders.fromZip(await fetch('/templates/letter.zip').then(r => r.blob()));
const engine = new Quillmark();
engine.registerQuill(quill);

// Parse and render to SVG
const parsed = Quillmark.parseMarkdown(markdown);
const result = engine.render(parsed, { format: 'svg' });
const svgString = new TextDecoder().decode(result.artifacts[0].bytes);

// Use in your application
document.getElementById('preview').innerHTML = svgString;
```

## API

### `loaders.fromZip(blob: Blob)`

Load a Quill template from a zip file.

```typescript
const quill = await loaders.fromZip(zipBlob);
engine.registerQuill(quill);
```

**Returns:** `QuillJson` - The parsed quill template ready for registration.

### `utils.debounce(fn, delay)`

Create a debounced version of a function.

```typescript
import { utils } from '@quillmark-test/web';

const debouncedRender = utils.debounce(() => {
  const parsed = Quillmark.parseMarkdown(editor.value);
  const result = engine.render(parsed, { format: 'svg' });
  preview.innerHTML = new TextDecoder().decode(result.artifacts[0].bytes);
}, 300);

editor.addEventListener('input', debouncedRender);
```

### `utils.detectBinaryFile(filename)`

Detect if a file should be treated as binary based on its extension.

```typescript
import { utils } from '@quillmark-test/web';

if (utils.detectBinaryFile('image.png')) {
  // Handle as binary
}
```

## TypeScript

Full type definitions included:

```typescript
import type {
  QuillJson,
  FileTree,
  FileNode,
  QuillMetadata
} from '@quillmark-test/web';
```

## Migration from v2.x to v3.0.0

### Breaking Changes

1. **`exporters` module removed** - Rendering helpers have been removed. Use `@quillmark-test/wasm` directly:
   ```typescript
   // Before (v2.x)
   import { Quillmark } from '@quillmark-test/wasm';
   import { exporters } from '@quillmark-test/web';
   
   const parsed = Quillmark.parseMarkdown(markdown);
   const result = exporters.render(engine, parsed, { format: 'pdf' });
   exporters.download(result, 'output.pdf');
   
   // After (v3.0.0)
   import { Quillmark } from '@quillmark-test/wasm';
   
   const parsed = Quillmark.parseMarkdown(markdown);
   const result = engine.render(parsed, { format: 'pdf' });
   
   // Download using standard browser APIs
   const blob = new Blob([result.artifacts[0].bytes], { type: 'application/pdf' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'output.pdf';
   a.click();
   URL.revokeObjectURL(url);
   ```

2. **Rendering types removed** - The following types have been removed:
   - `RenderFormat`
   - `RenderOptions`
   - `RenderResult`
   - `ParsedDocument`
   - `QuillInfo`
   - `Artifact`
   - `QuillmarkEngine`

3. **`@quillmark-test/wasm` is now optional** - The library works standalone for loading templates. Install `@quillmark-test/wasm` only when you need rendering.

### Migration Steps

1. Remove `exporters` imports
2. Call `engine.render()` directly instead of `exporters.render()`
3. Implement download/display logic using standard browser APIs
4. Update type imports to use only `QuillJson`, `FileTree`, `FileNode`, `QuillMetadata`

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

- Modern browsers with ES2020+ support
- No polyfills required
- WebAssembly support needed only for rendering (via `@quillmark-test/wasm`)

## Playground

This repository includes an interactive playground:

```bash
git clone https://github.com/nibsbin/quillmark-web.git
cd quillmark-web
npm install
npm run dev
```

Visit http://localhost:5173 for a live editor with template selection and real-time preview.

## Version

**v3.0.0** - Breaking change: utils-only library (loaders + utils)

## License

Apache-2.0
