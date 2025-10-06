# @quillmark-test/web

Web utilities for easily loading Quills with `@quillmark-test/wasm`.

## Overview

This package minimizes the boilerplate required to load Quill templates in web applications. It provides a simple API for loading Quills from various sources while handling the complexity of:

- Fetching and parsing manifest files
- Loading text and binary files
- Building the Quill JSON contract structure
- Converting files to the correct format

## Installation

```bash
npm install @quillmark-test/web @quillmark-test/wasm
```

## Quick Start

### Loading from Fixtures

The simplest way to load a Quill from `@quillmark-test/fixtures`:

```typescript
import { QuillmarkEngine } from '@quillmark-test/wasm';
import { createQuillLoader } from '@quillmark-test/web';

// Create a loader
const loader = createQuillLoader();

// Load a fixture Quill
const quill = await loader.loadFromFixtures('usaf_memo');

// Use with engine
const engine = QuillmarkEngine.create({});
engine.registerQuill(quill);
```

### Loading from Custom Files

Load a Quill from your own files:

```typescript
import { createQuillLoader } from '@quillmark-test/web';

const loader = createQuillLoader();

const quill = await loader.loadFromFiles('my-template', {
  'Quill.toml': `[Quill]
name = "my-template"
backend = "typst"
glue = "glue.typ"`,
  'glue.typ': '= Template\n\n{{ body }}',
  'assets/logo.png': new Uint8Array([137, 80, 78, 71, ...])
});
```

### Loading from JSON Object

If you already have a Quill JSON object:

```typescript
import { createQuillLoader } from '@quillmark-test/web';

const loader = createQuillLoader();

const quillObj = {
  name: 'my-quill',
  'Quill.toml': { contents: '...' },
  'glue.typ': { contents: '...' }
};

const quill = loader.loadFromJson(quillObj);
```

## API Reference

### `createQuillLoader(options?: QuillLoaderOptions): QuillLoader`

Creates a new QuillLoader instance with optional configuration.

**Options:**
- `baseUrl` - Base URL for fetching files (default: `/node_modules/@quillmark-test/fixtures/resources/`)
- `manifestUrl` - URL for the fixtures manifest file (default: `/fixtures-manifest.json`)
- `binaryExtensions` - Set of file extensions to treat as binary (default: `.otf`, `.ttf`, `.gif`, `.png`, `.jpg`, `.jpeg`)

### `QuillLoader`

#### `loadFromFixtures(setName: string): Promise<Quill>`

Loads a Quill from a named fixture set (requires a fixtures manifest).

**Parameters:**
- `setName` - Name of the fixture set (e.g., 'usaf_memo')

**Returns:** Promise that resolves to a Quill instance

#### `loadFromFiles(name: string, files: Record<string, string | Uint8Array>): Promise<Quill>`

Loads a Quill from a custom set of files.

**Parameters:**
- `name` - Name for the Quill
- `files` - Object mapping file paths to their contents (string for text, Uint8Array for binary)

**Returns:** Promise that resolves to a Quill instance

#### `loadFromJson(quillObj: QuillJsonObject): Quill`

Loads a Quill from a pre-built JSON object conforming to the Quill JSON contract.

**Parameters:**
- `quillObj` - Object following the Quill JSON contract specification

**Returns:** A Quill instance

## Before and After

### Before (without @quillmark-test/web)

```typescript
// Lots of boilerplate...
async function loadUsafMemoQuill(): Promise<Quill> {
  const resp = await fetch('/fixtures-manifest.json');
  const manifest = await resp.json();
  const setName = 'usaf_memo';
  const entries = manifest[setName];
  
  function insertPath(root: any, parts: string[], value: any) {
    // Complex path insertion logic...
  }
  
  const quillObj: any = { name: setName };
  const binaryExt = new Set(['.otf', '.ttf', '.gif', '.png', '.jpg', '.jpeg']);
  
  for (const relPath of entries) {
    const fullPath = `${setName}/${relPath}`;
    const parts = relPath.split('/');
    const fileName = parts[parts.length - 1];
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
    
    if (binaryExt.has(ext)) {
      const response = await fetch(`/node_modules/@quillmark-test/fixtures/resources/${fullPath}`);
      const ab = await response.arrayBuffer();
      insertPath(quillObj, parts, { contents: Array.from(new Uint8Array(ab)) });
    } else {
      const response = await fetch(`/node_modules/@quillmark-test/fixtures/resources/${fullPath}`);
      const text = await response.text();
      insertPath(quillObj, parts, { contents: text });
    }
  }
  
  return Quill.fromJson(JSON.stringify(quillObj));
}
```

### After (with @quillmark-test/web)

```typescript
import { createQuillLoader } from '@quillmark-test/web';

const loader = createQuillLoader();
const quill = await loader.loadFromFixtures('usaf_memo');
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All APIs are fully typed for the best developer experience.

## Quill JSON Contract

This package follows the canonical [Quill JSON Contract](../docs/QUILL_JSON.md). The loader automatically handles:

- Building the correct nested structure
- Converting binary files to number arrays
- Setting the `name` field
- Creating proper `contents` objects for all files

## License

ISC
