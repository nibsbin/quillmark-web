import { Quill } from '@quillmark-test/wasm';

/**
 * Options for configuring how files are loaded and processed
 */
export interface QuillLoaderOptions {
  /**
   * Base URL for fetching files (default: '/node_modules/@quillmark-test/fixtures/resources/')
   */
  baseUrl?: string;
  
  /**
   * Base URL for fetching manifest file (default: '/fixtures-manifest.json')
   */
  manifestUrl?: string;
  
  /**
   * File extensions to treat as binary (default: .otf, .ttf, .gif, .png, .jpg, .jpeg)
   */
  binaryExtensions?: Set<string>;
}

/**
 * Represents a file in the Quill JSON contract
 */
export interface QuillFile {
  contents: string | number[];
}

/**
 * Represents the Quill JSON object structure
 */
export interface QuillJsonObject {
  name?: string;
  base_path?: string;
  [key: string]: any;
}

/**
 * QuillLoader simplifies loading Quills from various sources
 */
export class QuillLoader {
  private baseUrl: string;
  private manifestUrl: string;
  private binaryExtensions: Set<string>;

  constructor(options: QuillLoaderOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/node_modules/@quillmark-test/fixtures/resources/';
    this.manifestUrl = options.manifestUrl ?? '/fixtures-manifest.json';
    this.binaryExtensions = options.binaryExtensions ?? new Set([
      '.otf', '.ttf', '.gif', '.png', '.jpg', '.jpeg'
    ]);
  }

  /**
   * Load a Quill from a fixture set by name
   * @param setName - The name of the fixture set (e.g., 'usaf_memo')
   * @returns A Quill instance
   */
  async loadFromFixtures(setName: string): Promise<Quill> {
    const manifest = await this.loadManifest();
    const entries = manifest[setName];
    
    if (!entries) {
      throw new Error(`No manifest entry for fixture set: ${setName}`);
    }

    const quillObj = await this.buildQuillObject(setName, entries);
    return Quill.fromJson(JSON.stringify(quillObj));
  }

  /**
   * Load a Quill from a custom file list
   * @param name - The name for the Quill
   * @param files - Object mapping file paths to contents
   * @returns A Quill instance
   */
  async loadFromFiles(name: string, files: Record<string, string | Uint8Array>): Promise<Quill> {
    const quillObj: QuillJsonObject = { name };
    
    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      const value = typeof content === 'string' 
        ? { contents: content }
        : { contents: Array.from(content) };
      this.insertPath(quillObj, parts, value);
    }

    return Quill.fromJson(JSON.stringify(quillObj));
  }

  /**
   * Load a Quill from a pre-built JSON object
   * @param quillObj - Object conforming to the Quill JSON contract
   * @returns A Quill instance
   */
  loadFromJson(quillObj: QuillJsonObject): Quill {
    return Quill.fromJson(JSON.stringify(quillObj));
  }

  /**
   * Fetch and parse the fixtures manifest
   */
  private async loadManifest(): Promise<Record<string, string[]>> {
    const response = await fetch(this.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to load manifest from ${this.manifestUrl}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Build a Quill JSON object from a list of file paths
   */
  private async buildQuillObject(name: string, entries: string[]): Promise<QuillJsonObject> {
    const quillObj: QuillJsonObject = { name };

    for (const relPath of entries) {
      const fullPath = `${name}/${relPath}`;
      const parts = relPath.split('/');
      const fileName = parts[parts.length - 1];
      
      try {
        const value = await this.loadFile(fullPath, fileName);
        this.insertPath(quillObj, parts, value);
      } catch (err) {
        console.warn(`Failed loading file: ${fullPath}`, err);
      }
    }

    return quillObj;
  }

  /**
   * Load a single file as text or binary
   */
  private async loadFile(path: string, fileName: string): Promise<QuillFile> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }

    const ext = this.getFileExtension(fileName);
    
    if (this.binaryExtensions.has(ext)) {
      const buffer = await response.arrayBuffer();
      return { contents: Array.from(new Uint8Array(buffer)) };
    } else {
      const text = await response.text();
      return { contents: text };
    }
  }

  /**
   * Get file extension in lowercase
   */
  private getFileExtension(fileName: string): string {
    return fileName.includes('.') 
      ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() 
      : '';
  }

  /**
   * Insert a value into a nested object at the specified path
   */
  private insertPath(root: any, parts: string[], value: any): void {
    const [head, ...rest] = parts;
    
    if (rest.length === 0) {
      root[head] = value;
      return;
    }
    
    if (!(head in root)) {
      root[head] = {};
    }
    
    this.insertPath(root[head], rest, value);
  }
}

/**
 * Create a QuillLoader with default options
 */
export function createQuillLoader(options?: QuillLoaderOptions): QuillLoader {
  return new QuillLoader(options);
}
