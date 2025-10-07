# @quillmark-test/web Library Design

## Overview

`@quillmark-test/web` is a high-level, opinionated TypeScript library that wraps `@quillmark-test/wasm` with clean, frontend-friendly APIs. It handles common tasks like loading Quill templates from various sources (directories, .zip files, JSON), normalizing artifacts, and providing ergonomic utilities for web developers.

## Design Goals

1. **Developer Experience First**: Provide intuitive, TypeScript-friendly APIs that feel natural in modern web applications
2. **Handle Common Tasks**: Abstract away boilerplate for loading templates, converting formats, and processing artifacts
3. **Minimal Dependencies**: Keep the library lightweight with minimal external dependencies
4. **Browser & Node Compatible**: Work seamlessly in both browser and Node.js environments
5. **Type Safety**: Leverage TypeScript for excellent IDE support and compile-time safety
6. **Error Handling**: Provide clear, actionable error messages

## Core API Surface

### QuillLoader Class

High-level utilities for loading Quill templates from various sources.

```typescript
class QuillLoader {
  /**
   * Load a Quill from a directory structure (browser: via fetch, Node: via fs)
   * @param baseUrl - Base URL or path to the Quill directory
   * @param options - Optional configuration
   * @returns Quill instance ready for registration
   */
  static async fromDirectory(
    baseUrl: string,
    options?: {
      files?: string[]; // Explicit file list (auto-discover if omitted)
      name?: string;    // Override Quill name
      fetchOptions?: RequestInit; // Additional fetch options
    }
  ): Promise<Quill>;

  /**
   * Load a Quill from a .zip file
   * @param source - Blob, ArrayBuffer, or URL to .zip file
   * @param options - Optional configuration
   * @returns Quill instance ready for registration
   */
  static async fromZip(
    source: Blob | ArrayBuffer | string,
    options?: {
      name?: string; // Override Quill name
      extractPath?: string; // Root path within zip
    }
  ): Promise<Quill>;

  /**
   * Load a Quill from a JSON object (Quill JSON contract)
   * @param json - JSON object or string following Quill JSON contract
   * @returns Quill instance ready for registration
   */
  static fromJson(json: QuillJsonContract | string): Quill;

  /**
   * Convert a Quill to JSON object (Quill JSON contract)
   * @param quill - Quill instance to serialize
   * @returns JSON object following Quill JSON contract
   */
  static toJson(quill: Quill): QuillJsonContract;
}
```

### QuillJsonContract Type

TypeScript types for the Quill JSON contract.

```typescript
/**
 * Quill JSON contract structure
 */
interface QuillJsonContract {
  /** Optional name (default used if Quill.toml doesn't provide one) */
  name?: string;
  
  /** Optional base path (deprecated for client payloads) */
  base_path?: string;
  
  /** Files and directories - keys are paths */
  [path: string]: 
    | QuillFileNode 
    | QuillDirectoryNode 
    | string 
    | undefined;
}

/**
 * File node with contents
 */
interface QuillFileNode {
  /** File contents as UTF-8 string or binary byte array */
  contents: string | number[];
}

/**
 * Directory node with nested files
 */
interface QuillDirectoryNode {
  /** Explicit files map */
  files?: Record<string, QuillFileNode | QuillDirectoryNode>;
  
  /** Shorthand: nested objects are treated as directories */
  [key: string]: any;
}
```

### QuillEngine Class

Ergonomic wrapper around QuillmarkEngine with convenience methods.

```typescript
class QuillEngine {
  /**
   * Create a new Quillmark rendering engine
   * @param options - Engine configuration
   */
  constructor(options?: {
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
    enableCache?: boolean;
  });

  /**
   * Register a Quill template
   * @param quill - Quill instance to register
   * @returns The engine instance for chaining
   */
  register(quill: Quill): this;

  /**
   * Load and register a Quill from a directory
   * @param baseUrl - Base URL or path to the Quill directory
   * @param options - Optional configuration
   * @returns The engine instance for chaining
   */
  async loadFromDirectory(baseUrl: string, options?: Parameters<typeof QuillLoader.fromDirectory>[1]): Promise<this>;

  /**
   * Load and register a Quill from a .zip file
   * @param source - Blob, ArrayBuffer, or URL to .zip file
   * @param options - Optional configuration
   * @returns The engine instance for chaining
   */
  async loadFromZip(source: Blob | ArrayBuffer | string, options?: Parameters<typeof QuillLoader.fromZip>[1]): Promise<this>;

  /**
   * Render markdown to specified format
   * @param quillName - Name of the registered Quill template
   * @param markdown - Markdown source to render
   * @param options - Render options
   * @returns Rendered artifact as Uint8Array
   */
  async render(
    quillName: string,
    markdown: string,
    options?: {
      format?: 'pdf' | 'svg';
      processGlue?: boolean; // Default: true
    }
  ): Promise<Uint8Array>;

  /**
   * Render and download as file
   * @param quillName - Name of the registered Quill template
   * @param markdown - Markdown source to render
   * @param options - Render and download options
   */
  async renderAndDownload(
    quillName: string,
    markdown: string,
    options?: {
      format?: 'pdf' | 'svg';
      filename?: string;
      processGlue?: boolean;
    }
  ): Promise<void>;

  /**
   * Get workflow for advanced usage
   * @param quillName - Name of the registered Quill template
   * @returns Workflow instance from underlying WASM engine
   */
  getWorkflow(quillName: string): QuillmarkWorkflow;
}
```

### Utility Functions

Helper functions for common operations.

```typescript
/**
 * Convert various artifact formats to Uint8Array
 * Handles: Uint8Array, ArrayBuffer, number[], base64 strings, { bytes: ... } wrappers
 */
export function normalizeArtifact(artifact: unknown): Uint8Array;

/**
 * Create a download for binary data
 * @param data - Binary data to download
 * @param filename - Download filename
 * @param mimeType - MIME type (auto-detected from extension if omitted)
 */
export function downloadBlob(
  data: Uint8Array | Blob,
  filename: string,
  mimeType?: string
): void;

/**
 * Detect file extension and determine if it's binary
 * @param filename - Filename to check
 * @returns true if file is binary, false if text
 */
export function isBinaryFile(filename: string): boolean;

/**
 * Compute SHA-256 hash of binary data
 * @param data - Data to hash
 * @returns Hex string of SHA-256 hash
 */
export async function sha256(data: Uint8Array | ArrayBuffer): Promise<string>;

/**
 * Build a Quill JSON object from file entries
 * @param files - Record of file paths to contents
 * @param options - Optional metadata
 * @returns Quill JSON contract object
 */
export function buildQuillJson(
  files: Record<string, string | Uint8Array | number[]>,
  options?: {
    name?: string;
    base_path?: string;
  }
): QuillJsonContract;
```

### Error Classes

Specific error types for better error handling.

```typescript
/**
 * Base error class for Quillmark Web library
 */
export class QuillmarkWebError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'QuillmarkWebError';
  }
}

/**
 * Error during Quill loading
 */
export class QuillLoadError extends QuillmarkWebError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'QuillLoadError';
  }
}

/**
 * Error during rendering
 */
export class QuillRenderError extends QuillmarkWebError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'QuillRenderError';
  }
}

/**
 * Invalid Quill JSON contract
 */
export class QuillJsonError extends QuillmarkWebError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'QuillJsonError';
  }
}
```

## Implementation Details

### ZIP File Support

The `.zip` support is a key differentiator, making it easy to distribute and load Quill templates.

**Implementation approach:**
- Use [`jszip`](https://www.npmjs.com/package/jszip) library for parsing .zip files
- Extract all files and convert to Quill JSON contract
- Detect binary vs. text files by extension
- Maintain directory structure in the JSON object

**Example usage:**
```typescript
// Load from a .zip file
const engine = new QuillEngine();
await engine.loadFromZip('https://example.com/templates/memo.zip');

// Or from a File input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await engine.loadFromZip(file, { name: 'uploaded_template' });
});
```

### Directory Loading

For browser environments, directory loading relies on an explicit file list (auto-discovery isn't possible without server support). For Node.js, use `fs` to walk the directory.

**Browser implementation:**
```typescript
async function fromDirectoryBrowser(
  baseUrl: string,
  files: string[]
): Promise<Quill> {
  const quillObj: QuillJsonContract = {};
  
  for (const relPath of files) {
    const url = `${baseUrl}/${relPath}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new QuillLoadError(`Failed to load ${url}: ${response.statusText}`);
    }
    
    const isBinary = isBinaryFile(relPath);
    const contents = isBinary
      ? Array.from(new Uint8Array(await response.arrayBuffer()))
      : await response.text();
    
    insertPath(quillObj, relPath.split('/'), { contents });
  }
  
  return Quill.fromJson(JSON.stringify(quillObj));
}
```

**Node.js implementation:**
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

async function fromDirectoryNode(basePath: string): Promise<Quill> {
  const quillObj: QuillJsonContract = {};
  
  async function walk(dir: string, prefix: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else {
        const isBinary = isBinaryFile(entry.name);
        const contents = isBinary
          ? Array.from(await fs.readFile(fullPath))
          : await fs.readFile(fullPath, 'utf-8');
        
        insertPath(quillObj, relPath.split('/'), { contents });
      }
    }
  }
  
  await walk(basePath);
  return Quill.fromJson(JSON.stringify(quillObj));
}
```

### Artifact Normalization

Rendering artifacts can come in various shapes from the WASM layer. The `normalizeArtifact` function provides consistent handling:

```typescript
export function normalizeArtifact(artifact: unknown): Uint8Array {
  if (artifact == null) {
    return new Uint8Array();
  }
  
  // Unwrap { bytes: ... } wrapper
  if (typeof artifact === 'object' && 'bytes' in artifact) {
    return normalizeArtifact((artifact as any).bytes);
  }
  
  // Already a Uint8Array
  if (artifact instanceof Uint8Array) {
    return artifact;
  }
  
  // ArrayBuffer
  if (artifact instanceof ArrayBuffer) {
    return new Uint8Array(artifact);
  }
  
  // Number array (JSON-encoded binary)
  if (Array.isArray(artifact)) {
    return new Uint8Array(artifact);
  }
  
  // String (base64 or UTF-8)
  if (typeof artifact === 'string') {
    // Try base64 decode
    const compact = artifact.replace(/\s+/g, '');
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length % 4 === 0;
    
    if (isBase64) {
      const binary = atob(compact);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    
    // Treat as UTF-8
    return new TextEncoder().encode(artifact);
  }
  
  // Try Array.from() as last resort
  try {
    return new Uint8Array(Array.from(artifact as any));
  } catch {
    throw new QuillmarkWebError(
      `Unsupported artifact type: ${Object.prototype.toString.call(artifact)}`
    );
  }
}
```

### QuillEngine Render Flow

The render method orchestrates the full workflow:

1. Get the workflow from the underlying WASM engine
2. Optionally process markdown through glue layer
3. Render to specified format
4. Extract and normalize artifacts
5. Return consistent Uint8Array

```typescript
async render(
  quillName: string,
  markdown: string,
  options: RenderOptions = {}
): Promise<Uint8Array> {
  const { format = 'pdf', processGlue = true } = options;
  
  try {
    const workflow = this.engine.loadWorkflow(quillName);
    
    // Process glue if enabled
    let source: unknown = markdown;
    if (processGlue) {
      try {
        source = workflow.processGlue(markdown);
      } catch (err) {
        console.warn('Glue processing failed, using raw markdown:', err);
        source = markdown;
      }
    }
    
    // Render
    const result = workflow.renderSource(source, { format });
    
    // Extract artifact
    let artifact: unknown = result.artifacts;
    if (Array.isArray(result.artifacts)) {
      artifact = result.artifacts[0];
    } else if (result.artifacts && typeof result.artifacts === 'object' && 'main' in result.artifacts) {
      artifact = result.artifacts.main;
    }
    
    // Normalize and return
    return normalizeArtifact(artifact);
  } catch (err) {
    throw new QuillRenderError(
      `Failed to render with Quill '${quillName}'`,
      err
    );
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { QuillEngine } from '@quillmark-test/web';

// Create engine and load a template
const engine = new QuillEngine();
await engine.loadFromDirectory('/templates/usaf_memo', {
  files: ['Quill.toml', 'glue.typ', 'assets/seal.png', ...]
});

// Render markdown to PDF
const markdown = `
---
memo for: ORG/SYMBOL
memo from: ORG/SYMBOL
subject: Test Memo
---

This is the memo body.
`;

const pdf = await engine.render('usaf_memo', markdown, { format: 'pdf' });

// Download the PDF
import { downloadBlob } from '@quillmark-test/web';
downloadBlob(pdf, 'memo.pdf');
```

### Loading from ZIP

```typescript
import { QuillEngine } from '@quillmark-test/web';

const engine = new QuillEngine();

// From URL
await engine.loadFromZip('https://example.com/templates/memo.zip');

// From File input
document.querySelector('#upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await engine.loadFromZip(file, { name: 'uploaded_template' });
  console.log('Template loaded!');
});

// From ArrayBuffer
const response = await fetch('/template.zip');
const buffer = await response.arrayBuffer();
await engine.loadFromZip(buffer);
```

### Advanced Workflow Access

```typescript
import { QuillEngine } from '@quillmark-test/web';

const engine = new QuillEngine();
await engine.loadFromDirectory('/templates/memo');

// Get workflow for advanced usage
const workflow = engine.getWorkflow('memo');

// Process glue separately
const glueOutput = workflow.processGlue(markdown);
console.log('Glue output:', glueOutput);

// Render with custom options
const result = workflow.renderSource(glueOutput, {
  format: 'svg',
  // additional options...
});
```

### Using QuillLoader Directly

```typescript
import { QuillLoader, QuillmarkEngine } from '@quillmark-test/web';

// Load Quill separately
const quill = await QuillLoader.fromZip('/template.zip');

// Register with underlying WASM engine
const wasmEngine = QuillmarkEngine.create({});
wasmEngine.registerQuill(quill);

// Or use high-level QuillEngine
const engine = new QuillEngine();
engine.register(quill);
```

### Building Quill JSON Programmatically

```typescript
import { buildQuillJson, QuillLoader } from '@quillmark-test/web';

const files = {
  'Quill.toml': `
[Quill]
name = "my-template"
backend = "typst"
glue = "glue.typ"
  `,
  'glue.typ': '= Template\n\n{{ body }}',
  'assets/logo.png': new Uint8Array([137, 80, 78, 71, ...])
};

const json = buildQuillJson(files, { name: 'my-template' });
const quill = QuillLoader.fromJson(json);
```

### React Integration

```typescript
import { QuillEngine } from '@quillmark-test/web';
import { useState, useEffect } from 'react';

function QuillmarkRenderer() {
  const [engine, setEngine] = useState<QuillEngine | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [svg, setSvg] = useState('');

  useEffect(() => {
    const init = async () => {
      const eng = new QuillEngine();
      await eng.loadFromDirectory('/templates/memo', { ... });
      setEngine(eng);
    };
    init();
  }, []);

  const handleRender = async () => {
    if (!engine) return;
    const artifact = await engine.render('memo', markdown, { format: 'svg' });
    const svgText = new TextDecoder().decode(artifact);
    setSvg(svgText);
  };

  return (
    <div>
      <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
      <button onClick={handleRender}>Render</button>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
```

## Bundle Size Considerations

The library should remain lightweight:

- **Core library** (without dependencies): ~15-20 KB minified + gzipped
- **With jszip** (for .zip support): +25 KB minified + gzipped
- **Total**: ~40-45 KB minified + gzipped

Tree-shaking support ensures users only bundle what they use.

## Testing Strategy

1. **Unit tests**: Test individual functions (normalizeArtifact, buildQuillJson, etc.)
2. **Integration tests**: Test QuillLoader with mock Quill templates
3. **E2E tests**: Test full rendering pipeline with real WASM engine
4. **Browser tests**: Use Playwright/Puppeteer for browser-specific features
5. **Node tests**: Test Node.js-specific features (fs-based directory loading)

## Documentation

- Comprehensive JSDoc comments for all public APIs
- Type definitions for excellent IDE support
- README with quick start guide
- API reference (auto-generated from JSDoc)
- Migration guide from direct WASM usage
- Example projects (React, Vue, Vanilla JS)

## Versioning & Compatibility

- Follow semantic versioning (semver)
- Maintain compatibility with `@quillmark-test/wasm` version ranges
- Clear upgrade guides for breaking changes
- Deprecation warnings before removing features

## Future Enhancements

1. **Template Registry**: Central repository for discovering and loading templates
2. **Caching Layer**: Cache rendered artifacts for improved performance
3. **Streaming Rendering**: Support for incremental rendering of large documents
4. **Worker Support**: Offload rendering to Web Workers for better performance
5. **Framework Integrations**: Official React, Vue, Svelte component libraries
6. **Dev Tools**: Browser extension for debugging Quill templates
7. **Asset Optimization**: Automatic font subsetting and image optimization
8. **Template Composition**: Merge multiple Quill templates

## Relationship to @quillmark-test/wasm

`@quillmark-test/web` is a thin, opinionated wrapper that:

- Re-exports all types and classes from `@quillmark-test/wasm`
- Adds convenience methods and utilities
- Provides better defaults for web usage
- Handles common tasks that every web app needs

Users can mix and match:
```typescript
import { QuillmarkEngine as WasmEngine, Quill } from '@quillmark-test/wasm';
import { QuillLoader, normalizeArtifact } from '@quillmark-test/web';

// Use WASM engine directly
const wasmEngine = WasmEngine.create({});

// Use web utilities
const quill = await QuillLoader.fromZip('/template.zip');
wasmEngine.registerQuill(quill);

const workflow = wasmEngine.loadWorkflow('template');
const result = workflow.renderSource(markdown, { format: 'pdf' });

// Use web utilities for artifact handling
const pdf = normalizeArtifact(result.artifacts);
```

## Summary

`@quillmark-test/web` provides a polished, developer-friendly API for working with Quillmark in web applications. It handles the common pain points (loading templates from various sources, normalizing artifacts, downloading results) while maintaining full compatibility with the underlying WASM API for advanced use cases.

The library prioritizes:
- **Simplicity**: Common tasks should be one-liners
- **Type Safety**: Full TypeScript support with comprehensive types
- **Flexibility**: Advanced users can drop down to WASM API when needed
- **Performance**: Minimal overhead over direct WASM usage
- **Developer Experience**: Clear errors, good docs, great tooling support
