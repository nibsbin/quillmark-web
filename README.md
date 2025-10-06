# Quillmark Web - USAF Memo Playground

A web-based playground for editing and rendering documents using Quillmark templates, including USAF memos.

![Playground Screenshot](https://github.com/user-attachments/assets/2e718b12-6506-4d53-b2b2-504efc690d76)

## Features

- **Live Markdown Editor**: Edit your document content with a clean, distraction-free interface
- **Real-time SVG Preview**: See your rendered document instantly
- **Multiple Templates**: 
  - **Taro Template**: Simple demo template for testing (fully functional)
  - **USAF Memo**: Official USAF memorandum template (structure loaded, rendering has known issues)
- **Modern UI**: Split-pane layout with responsive design
- **Template Switching**: Easily switch between different templates using the dropdown selector

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Then open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. Open the playground in your browser
2. Select a template from the dropdown (Taro is default and fully working)
3. Edit the markdown content in the left panel
4. Click "Render SVG" or press Ctrl+Enter (Cmd+Enter on Mac) to render
5. View the rendered SVG in the right panel

## Technology Stack

- **[Vite](https://vitejs.dev/)**: Fast build tool and dev server
- **[@quillmark-test/wasm](https://www.npmjs.com/package/@quillmark-test/wasm)**: WebAssembly bindings for Quillmark rendering engine
- **[@quillmark-test/fixtures](https://www.npmjs.com/package/@quillmark-test/fixtures)**: Sample templates including USAF memo and Taro
- **[vite-plugin-wasm](https://github.com/Menci/vite-plugin-wasm)**: WASM support for Vite
- **[vite-plugin-top-level-await](https://github.com/Menci/vite-plugin-top-level-await)**: Top-level await support for Vite

## Current Status

### ✅ Working Features
- Project setup and dependencies
- Vite configuration with WASM support
- UI layout with editor and preview panels
- Template file loading from fixtures package
- Quillmark engine initialization
- **Taro template**: Fully functional with SVG rendering
- Error handling and diagnostics display
- Template switching
- Keyboard shortcuts (Ctrl/Cmd+Enter to render)

### ⚠️ Known Issues
- **USAF Memo Template**: The USAF memo template uses an external Typst package (`@preview/tonguetoquill-usaf-memo`) which is not currently resolving correctly in the WASM environment. This appears to be a limitation in how the WASM layer handles Typst package paths. The template files load correctly, but the Typst compiler cannot find the package manifest during rendering.

### 🔧 Technical Details

The playground successfully:
- Loads all template files (17 files for USAF memo including fonts and package files)
- Initializes the Quillmark WASM engine
- Creates and registers Quill templates
- Loads workflows for rendering
- Handles both simple templates (Taro) and complex templates (USAF memo structure)

The USAF memo package files are loaded with the correct `@preview/tonguetoquill-usaf-memo/0.1.1/` path structure as expected by Typst, but the Typst compiler in the WASM environment reports "file not found (searched at typst.toml)" when trying to resolve the package import. This suggests a potential issue with how the WASM Typst backend handles package resolution from in-memory file systems.

## Workaround

Use the **Taro template** to demonstrate full functionality of the playground. This template doesn't require external packages and successfully renders to SVG.

## Future Improvements

- Fix Typst package resolution for USAF memo template
- Add PDF export option
- Add more templates
- Add syntax highlighting in the editor
- Add live preview mode (render as you type with debouncing)
- Add example gallery

## License

Apache-2.0

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
