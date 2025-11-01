# Quillmark Web

A web-based playground and utility library for rendering Quillmark templates using `@quillmark-test/wasm`.

This repository contains:
- 🎮 **Interactive Playground** - A demo application for testing Quillmark templates
- 📦 **@quillmark-test/web Library** - Opinionated frontend utilities for integrating Quillmark into your projects

## Features

### Playground Demo
- 🖋️ Interactive markdown editor with live preview
- 📄 Real-time rendering to PDF and SVG formats
- 🎯 Pre-loaded templates (USAF Memo, Taro) from tonguetoquill-collection
- 🚀 Fast development with Vite and TypeScript

### Library (`src/lib/`)
- ✅ Opinionated Quill loading from `.zip` files
- ✅ Easy rendering: `exporters.toBlob()`, `exporters.toDataUrl()`, `exporters.toElement()`
- ✅ Full WASM access - re-exports all low-level APIs
- ✅ Type-safe with complete TypeScript definitions
- ✅ Framework agnostic - works with vanilla JS, React, Vue, Svelte, etc.

## Prerequisites

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 10.0.0 or higher

## Quick Start

### Running the Playground Demo

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to http://localhost:5173

4. **Try it out:**
   - Edit the markdown in the left panel
   - See real-time SVG preview on the right
   - Click "Download PDF" to get a PDF version

### Using the Library in Your Project

The `@quillmark-test/web` library (in `src/lib/`) provides convenient utilities for working with Quillmark in browser applications.

#### Basic Example: Render to PDF

```typescript
import { Quillmark, loaders, exporters } from '@quillmark-test/web';

async function renderDocument() {
  // Load Quill template from zip file
  const response = await fetch('/quills/my-template.zip');
  const zipBlob = await response.blob();
  const quillJson = await loaders.fromZip(zipBlob);
  
  // Create engine and register template
  const engine = new Quillmark();
  engine.registerQuill(quillJson);
  
  // Render markdown
  const markdown = '# Hello World\n\nMy first document!';
  const result = exporters.render(engine, markdown, { format: 'pdf' });
  
  // Download the PDF
  exporters.download(result, 'output.pdf');
}
```

#### Real-time SVG Preview

```typescript
import { Quillmark, loaders, exporters, utils } from '@quillmark-test/web';

async function setupEditor() {
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

See [`src/lib/README.md`](src/lib/README.md) for complete API documentation.

## Project Structure

```
quillmark-web/
├── src/
│   ├── main.ts              # Playground demo entry point
│   └── lib/                 # @quillmark-test/web library
│       ├── index.ts         # Main exports
│       ├── loaders.ts       # Quill loading utilities (fromZip)
│       ├── renderers.ts     # Rendering helpers
│       ├── utils.ts         # Utility functions
│       ├── types.ts         # TypeScript definitions
│       └── README.md        # Library documentation
├── public/
│   ├── quills/              # Quill zip files (generated from tonguetoquill-collection)
│   │   ├── usaf_memo.zip    # USAF memo template
│   │   └── taro.zip         # Taro template
│   └── tonguetoquill-collection/  # Git subtree of quill templates
│       └── quills/          # Source quill templates
├── scripts/                 # Utility scripts
│   ├── package-quills.js   # Packages quills into zip files
│   └── README.md           # Scripts documentation
├── designs/                 # Design documents
│   ├── WEB_LIB_DESIGN.md   # Library architecture
│   └── WASM_DESIGN.md      # WASM API design
├── index.html              # Playground HTML
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies and scripts
```

## How It Works

The playground demonstrates the complete Quillmark workflow:

1. **Load Quill Template**: Uses `fromZip()` to load the USAF memo template from `/public/quills/usaf_memo.zip`

2. **Initialize Engine**: Creates a Quillmark WASM engine instance with `new Quillmark()`

3. **Register Template**: Registers the Quill with `engine.registerQuill(quillJson)`

4. **Render Content**: 
   - Real-time SVG preview using `exporters.toElement()`
   - PDF download using `exporters.toBlob()` + `exporters.download()`

## Quill JSON Contract

Quill templates follow the Quillmark JSON contract format:

```javascript
{
  name: 'usaf_memo',
  'Quill.toml': { contents: '...' },
  'glue.typ': { contents: '...' },
  'assets': {
    'font.otf': { contents: [137, 80, 78, 71, ...] }  // Binary files as number arrays
  },
  'packages': {
    'my-package': {
      'lib.typ': { contents: '...' }
    }
  }
}
```

Key points:
- Root object contains file tree structure
- Text files have `contents` as strings
- Binary files have `contents` as number arrays
- Nested directories are nested objects
- Must contain `Quill.toml` at the root

## Technologies

- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[@quillmark-test/wasm](https://github.com/quillmark)** - WebAssembly bindings for Quillmark
- **[fflate](https://github.com/101arrowz/fflate)** - Fast zip file extraction
- **vite-plugin-wasm** - WASM support for Vite
- **vite-plugin-top-level-await** - Top-level await support

## Building for Production

```bash
# Build the playground
npm run build

# Preview the production build locally
npm run preview
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.

## Updating Quill Templates

The playground uses quill templates from the [tonguetoquill-collection](https://github.com/nibsbin/tonguetoquill-collection) repository, which is included as a git subtree at `public/tonguetoquill-collection/`.

### Updating Templates from Upstream

To pull the latest templates from the tonguetoquill-collection repository:

```bash
# Pull latest changes from tonguetoquill-collection
git subtree pull --prefix public/tonguetoquill-collection https://github.com/nibsbin/tonguetoquill-collection.git main --squash

# Regenerate zip files
npm run package:quills
```

### Modifying Templates Locally

If you need to modify templates locally:

1. Edit files in `public/tonguetoquill-collection/quills/`
2. Regenerate zip files: `npm run package:quills`
3. Test in the playground: `npm run dev`

Note: Local changes to the subtree should ideally be contributed back to the upstream repository.

## API Migration Guide

### Version 0.4.0 - New Cleaner API

We've introduced a cleaner, more semantically consistent API. The old API is still supported for backward compatibility.

#### Before (Old API)
```typescript
// Multiple entry points with different patterns
const blob = await exporters.exportToBlob(engine, markdown, { format: 'pdf' });
const url = await exporters.exportToDataUrl(engine, markdown, { format: 'svg' });
await exporters.preview(engine, markdown, element, { format: 'svg' });
await exporters.downloadDocument(engine, markdown, 'doc.pdf', { format: 'pdf' });
```

#### After (New API - Recommended)
```typescript
// Single render function, then convert
const result = exporters.render(engine, markdown, { format: 'pdf' });

// Convert to different formats
const blob = exporters.toBlob(result);
const url = await exporters.toDataUrl(result);
exporters.toElement(result, element);
exporters.download(result, 'doc.pdf');

// Benefit: Render once, export many times
const pdfResult = exporters.render(engine, markdown, { format: 'pdf' });
const svgResult = exporters.render(engine, markdown, { format: 'svg' });
exporters.download(pdfResult, 'doc.pdf');
exporters.download(svgResult, 'doc.svg');
```

#### Migration Checklist
- Replace `exportToBlob(engine, markdown, options)` with `render(engine, markdown, options)` + `toBlob(result)`
- Replace `exportToDataUrl(engine, markdown, options)` with `render(engine, markdown, options)` + `toDataUrl(result)`
- Replace `preview(engine, markdown, element, options)` with `render(engine, markdown, options)` + `toElement(result, element)`
- Replace `downloadDocument(engine, markdown, filename, options)` with `render(engine, markdown, options)` + `download(result, filename)`

The new API provides:
- ✅ Better composability (render once, export many times)
- ✅ Consistent naming and parameter ordering
- ✅ Clear separation of concerns
- ✅ Easier to test and maintain

## Screenshots

### PDF Rendering
![PDF Rendering](https://github.com/user-attachments/assets/50981065-18bc-4f36-b5ae-4522e3e04643)

### SVG Rendering
![SVG Rendering](https://github.com/user-attachments/assets/c7648623-0056-457d-b52e-ca12c89ed571)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.
