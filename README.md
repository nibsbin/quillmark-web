# Quillmark Web

A web-based playground and utility library for rendering Quillmark templates using `@quillmark-test/wasm`.

This repository contains:
- 🎮 **Interactive Playground** - A demo application for testing Quillmark templates
- 📦 **@quillmark-test/web Library** - Opinionated frontend utilities for integrating Quillmark into your projects

## Features

### Playground Demo
- 🖋️ Interactive markdown editor with live preview
- 📄 Real-time rendering to PDF and SVG formats
- 🎯 Pre-loaded USAF memo template for testing
- 🚀 Fast development with Vite and TypeScript

### Library (`src/lib/`)
- ✅ Opinionated Quill loading from `.zip` files
- ✅ Easy rendering: `renderToBlob()`, `renderToDataUrl()`, `renderToElement()`
- ✅ Full WASM access - re-exports all low-level APIs
- ✅ Type-safe with complete TypeScript definitions
- ✅ Framework agnostic - works with vanilla JS, React, Vue, Svelte, etc.

## Prerequisites

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 10.0.0 or higher

## Quick Start

### Installing the Library

```bash
npm install @quillmark-test/web @quillmark-test/wasm
```

> **Note:** This package is currently in development. For now, you can use it directly from this repository by building it locally.

#### Building Locally

```bash
# Clone the repository
git clone https://github.com/nibsbin/quillmark-web.git
cd quillmark-web

# Install dependencies
npm install

# Build the library
npm run build:lib
```

The built library will be in the `dist/` directory with ESM (`index.js`), CommonJS (`index.cjs`), and TypeScript declarations (`index.d.ts`).

### Basic Usage

```typescript
import { Quillmark, fromZip, renderToBlob, downloadArtifact } from '@quillmark-test/web';

async function renderDocument() {
  // 1. Load a Quill template from a .zip file
  const response = await fetch('/path/to/template.zip');
  const zipBlob = await response.blob();
  const quillJson = await fromZip(zipBlob);
  
  // 2. Create engine and register the template
  const engine = Quillmark.create();
  engine.registerQuill('my-template', quillJson);
  
  // 3. Render markdown to PDF
  const markdown = '# Hello World\n\nMy first document!';
  const pdfBlob = await renderToBlob(
    engine, 
    'my-template', 
    markdown, 
    { format: 'pdf' }
  );
  
  // 4. Download the PDF
  downloadArtifact(pdfBlob, 'output.pdf');
}
```

### Live Preview Example

```typescript
import { Quillmark, fromZip, renderToElement, debounce } from '@quillmark-test/web';

async function setupLivePreview() {
  // Load and register template
  const response = await fetch('/template.zip');
  const quillJson = await fromZip(await response.blob());
  
  const engine = Quillmark.create();
  engine.registerQuill('my-template', quillJson);
  
  // Get DOM elements
  const editor = document.querySelector('#editor');
  const preview = document.querySelector('#preview');
  
  // Render with debouncing for performance
  const render = debounce(async () => {
    await renderToElement(
      engine, 
      'my-template', 
      editor.value, 
      preview, 
      { format: 'svg' }
    );
  }, 300);
  
  editor.addEventListener('input', render);
}
```

See the [`examples/`](./examples/) directory for complete working examples.

### Running the Playground Demo

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

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

## API Reference

### Core Functions

#### `fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson>`

Load a Quill template from a `.zip` file. The zip must contain a `Quill.toml` file at the root.

```typescript
const response = await fetch('/template.zip');
const quillJson = await fromZip(await response.blob());
```

#### `renderToBlob(engine, quillName, markdown, options?): Promise<Blob>`

Render markdown to a Blob (PDF, SVG, or text).

```typescript
const pdfBlob = await renderToBlob(engine, 'my-template', markdown, { 
  format: 'pdf' 
});
```

#### `renderToDataUrl(engine, quillName, markdown, options?): Promise<string>`

Render markdown to a data URL for use in `<img>` tags or iframes.

```typescript
const dataUrl = await renderToDataUrl(engine, 'my-template', markdown, { 
  format: 'svg' 
});
imgElement.src = dataUrl;
```

#### `renderToElement(engine, quillName, markdown, element, options?): Promise<void>`

Render markdown directly into a DOM element.

```typescript
await renderToElement(engine, 'my-template', markdown, previewDiv, { 
  format: 'svg' 
});
```

#### `downloadArtifact(blob: Blob, filename: string): void`

Trigger a browser download of a blob.

```typescript
downloadArtifact(pdfBlob, 'my-document.pdf');
```

### Utility Functions

#### `debounce<T>(fn: T, wait?: number): T`

Create a debounced version of a function (default wait: 250ms).

```typescript
const debouncedRender = debounce(renderPreview, 300);
editor.addEventListener('input', debouncedRender);
```

#### `detectBinaryFile(filename: string): boolean`

Check if a filename indicates a binary file.

```typescript
if (detectBinaryFile('logo.png')) {
  // Handle as binary
}
```

For complete API documentation, see [`src/lib/README.md`](src/lib/README.md).

## Using the Library in Your Project

The library is framework-agnostic and works with vanilla JavaScript, React, Vue, Svelte, and other frameworks.

## Using the Library in Your Project

The library is framework-agnostic and works with vanilla JavaScript, React, Vue, Svelte, and other frameworks.

See [`examples/`](./examples/) for complete working examples including:
- Vanilla JavaScript integration
- Live markdown preview
- PDF generation and download
- Error handling

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
│       ├── *.test.ts        # Unit tests
│       └── README.md        # Library documentation
├── examples/
│   ├── vanilla-js/          # Vanilla JavaScript example
│   └── README.md            # Examples documentation
├── public/
│   └── quills/              # Quill template .zip files
├── dist/                    # Build output (git-ignored)
│   ├── index.js             # ESM library build
│   ├── index.cjs            # CommonJS library build
│   ├── index.d.ts           # TypeScript declarations
│   └── playground/          # Playground build
├── designs/                 # Design documents
├── vite.config.ts           # Vite config (playground)
├── vite.config.lib.ts       # Vite config (library)
├── vitest.config.ts         # Vitest config
├── tsconfig.json            # TypeScript config (playground)
└── tsconfig.lib.json        # TypeScript config (library)
```

## How It Works

The playground demonstrates the complete Quillmark workflow:

1. **Load Quill Template**: Uses `fromZip()` to load the USAF memo template from `/public/quills/usaf_memo.zip`

2. **Initialize Engine**: Creates a Quillmark WASM engine instance with `Quillmark.create()`

3. **Register Template**: Registers the Quill with `engine.registerQuill(name, quillJson)`

4. **Render Content**: 
   - Real-time SVG preview using `renderToElement()`
   - PDF download using `renderToBlob()` + `downloadArtifact()`

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

### Build Library

```bash
npm run build:lib
```

Outputs to `dist/`:
- `index.js` - ESM format
- `index.cjs` - CommonJS format
- `index.d.ts` - TypeScript declarations
- Source maps for all outputs

### Build Playground

```bash
npm run build:playground
```

Outputs to `dist/playground/` and can be deployed to any static hosting service.

### Build Everything

```bash
npm run build
```

Builds both the library and the playground.

### Preview Production Build

```bash
npm run preview
```

## Testing

The library includes a comprehensive test suite using Vitest.

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Screenshots

### PDF Rendering
![PDF Rendering](https://github.com/user-attachments/assets/50981065-18bc-4f36-b5ae-4522e3e04643)

### SVG Rendering
![SVG Rendering](https://github.com/user-attachments/assets/c7648623-0056-457d-b52e-ca12c89ed571)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.
