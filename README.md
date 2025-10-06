# Quillmark Web Rendering Playground

A web-based playground for rendering Quillmark templates using `@quillmark-test/fixtures` and `@quillmark-test/wasm`.

## Features

- 🖋️ Interactive markdown editor
- 📄 Real-time rendering to PDF and SVG formats
- 🎯 Pre-loaded with USAF memo template from fixtures
- 🚀 Built with Vite and TypeScript
- 📦 Uses the official Quillmark JSON contract for loading templates

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

The playground demonstrates loading the `usaf_memo` Quill template from `@quillmark-test/fixtures` using the JSON contract format:

1. **Loading the Quill**: The application reads all files from the `usaf_memo` fixture directory (including Quill.toml, glue.typ, assets, and packages) and constructs a JSON object following the Quillmark JSON contract specification.

2. **Creating the Engine**: Uses `QuillmarkEngine.create()` to initialize the WASM rendering engine.

3. **Registering the Template**: The Quill is registered with the engine via `engine.registerQuill(quill)`.

4. **Rendering**: Users can edit markdown in the editor and click "Render" to generate PDF or SVG output using the USAF memo template.

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
- **@quillmark-test/fixtures** - Sample Quill templates and test fixtures
- **vite-plugin-wasm** - WASM support for Vite

## Screenshots

### PDF Rendering
![PDF Rendering](https://github.com/user-attachments/assets/50981065-18bc-4f36-b5ae-4522e3e04643)

### SVG Rendering
![SVG Rendering](https://github.com/user-attachments/assets/c7648623-0056-457d-b52e-ca12c89ed571)

## License

ISC
