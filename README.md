# Quillmark Web Rendering Playground

A web-based playground for rendering Quillmark templates using `@quillmark-test/fixtures` and `@quillmark-test/wasm`.

## Features

- 🖋️ Interactive markdown editor
- 📄 Real-time rendering to PDF and SVG formats
- 🎯 Pre-loaded with USAF memo template from fixtures
- 🚀 Built with Vite and TypeScript
- 📦 Uses the official Quillmark JSON contract for loading templates
- ✨ Includes `@quillmark-test/web` - a new utility package that minimizes boilerplate for loading Quills

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## How It Works

The playground demonstrates loading the `usaf_memo` Quill template from `@quillmark-test/fixtures` using the new `@quillmark-test/web` utility package:

1. **Loading the Quill**: Uses the `@quillmark-test/web` package's `QuillLoader` to load templates with minimal boilerplate - just 3 lines of code instead of ~70 lines!

2. **Creating the Engine**: Uses `QuillmarkEngine.create()` to initialize the WASM rendering engine.

3. **Registering the Template**: The Quill is registered with the engine via `engine.registerQuill(quill)`.

4. **Rendering**: Users can edit markdown in the editor and click "Render" to generate PDF or SVG output using the USAF memo template.

### Code Example

```typescript
import { createQuillLoader } from '@quillmark-test/web';

// Simple 3-line loading!
const loader = createQuillLoader();
const quill = await loader.loadFromFixtures('usaf_memo');
engine.registerQuill(quill);
```

See [`lib/README.md`](lib/README.md) for full `@quillmark-test/web` documentation.

## JSON Contract

The playground follows the canonical Quill JSON contract for loading templates. The contract specifies:

- Root object with a `name` field
- File entries with `contents` field (string for text files, number array for binary files)
- Nested directory structure mirroring the file tree

Example structure:
```javascript
{
  name: 'usaf_memo',
  'Quill.toml': { contents: '...' },
  'glue.typ': { contents: '...' },
  'assets': {
    'font.otf': { contents: [137, 80, 78, 71, ...] }
  }
}
```

## Technologies

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **@quillmark-test/wasm** - WebAssembly bindings for Quillmark
- **@quillmark-test/web** - New utility package for easy Quill loading (see [`lib/`](lib/))
- **@quillmark-test/fixtures** - Sample Quill templates and test fixtures
- **vite-plugin-wasm** - WASM support for Vite

## Screenshots

### PDF Rendering
![PDF Rendering](https://github.com/user-attachments/assets/50981065-18bc-4f36-b5ae-4522e3e04643)

### SVG Rendering
![SVG Rendering](https://github.com/user-attachments/assets/c7648623-0056-457d-b52e-ca12c89ed571)

## License

ISC
