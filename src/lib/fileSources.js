/**
 * File Source Abstraction - Cascade 3 Implementation
 *
 * This module provides a unified abstraction for loading files from different sources
 * (filesystem, zip files, network, etc.) and building file trees in different formats.
 *
 * This eliminates duplication between:
 * - scripts/package-quills.js (filesystem → flat)
 * - src/lib/quillLoader.js (filesystem → nested)
 * - src/lib/loaders.ts (zip → nested)
 */

// Binary extensions (keep in sync with utils.ts)
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.pdf', '.ttf', '.otf', '.woff', '.woff2',
  '.zip', '.tar', '.gz'
]);

/**
 * Check if a filename indicates a binary file
 * @param {string} filename - File name to check
 * @returns {boolean} true if the file should be treated as binary
 */
function detectBinaryFile(filename) {
  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
    : '';
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Helper to insert a file path into nested object structure
 * @param {any} root - Root object
 * @param {string[]} parts - Path parts
 * @param {any} value - Value to insert
 */
function insertPath(root, parts, value) {
  const [head, ...rest] = parts;
  if (!rest || rest.length === 0) {
    root[head] = value;
    return;
  }
  if (!(head in root)) root[head] = {};
  insertPath(root[head], rest, value);
}

/**
 * Build a file tree from a FileSource with configurable output format
 *
 * This is the unified tree building function that eliminates duplication
 * across the codebase.
 *
 * @param {FileSource} source - The file source to read from
 * @param {Object} options - Tree building options
 * @param {'flat'|'nested'} options.format - Output format: 'flat' for { 'path/to/file': contents } or 'nested' for { path: { to: { file: contents } } }
 * @param {boolean} [options.wrapContents] - Whether to wrap contents in { contents: ... } objects (required for Quill JSON format)
 * @param {boolean} [options.detectBinary] - Whether to detect binary files and handle them differently
 * @param {boolean} [options.rawBuffers] - Whether to return raw buffers (for zip creation) or convert to arrays
 * @returns {Promise<Record<string, any>>} File tree in the requested format
 *
 * @example
 * // For packaging into zip (flat, raw buffers)
 * const files = await buildFileTree(new FilesystemSource('/path', fs, path), {
 *   format: 'flat',
 *   rawBuffers: true
 * });
 * const zipped = zipSync(files);
 *
 * @example
 * // For Quill JSON (nested, wrapped contents)
 * const files = await buildFileTree(new FilesystemSource('/path', fs, path), {
 *   format: 'nested',
 *   wrapContents: true,
 *   detectBinary: true
 * });
 * return { files };
 */
export async function buildFileTree(source, options) {
  const files = await source.readAllFiles();
  const result = {};

  for (const [path, data] of files.entries()) {
    let value;

    // Determine how to process the file content
    if (options.rawBuffers) {
      // Keep as raw buffer (for zip creation)
      value = Buffer.from(data);
    } else if (options.detectBinary && detectBinaryFile(path)) {
      // Binary file - store as number array
      value = options.wrapContents
        ? { contents: Array.from(data) }
        : Array.from(data);
    } else {
      // Text file - decode as UTF-8
      const text = new TextDecoder().decode(data);
      value = options.wrapContents
        ? { contents: text }
        : text;
    }

    // Insert into tree structure
    if (options.format === 'nested') {
      const parts = path.split('/');
      insertPath(result, parts, value);
    } else {
      // Flat format
      result[path] = value;
    }
  }

  return result;
}

/**
 * Filesystem source for Node.js environments
 * Recursively reads all files from a directory
 */
export class FilesystemSource {
  /**
   * @param {string} rootPath - Root directory path
   * @param {any} fs - Node.js 'fs' or 'fs/promises' module
   * @param {any} path - Node.js 'path' module
   */
  constructor(rootPath, fs, path) {
    this.rootPath = rootPath;
    this.fs = fs;
    this.path = path;
  }

  /**
   * Read all files from the filesystem
   * @returns {Promise<Map<string, Uint8Array>>}
   */
  async readAllFiles() {
    const files = new Map();
    await this.readDirectoryRecursive(this.rootPath, this.rootPath, files);
    return files;
  }

  /**
   * @private
   */
  async readDirectoryRecursive(dirPath, basePath, files) {
    const entries = await this.fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = this.path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.readDirectoryRecursive(fullPath, basePath, files);
      } else if (entry.isFile()) {
        const relativePath = this.path.relative(basePath, fullPath);
        const content = await this.fs.readFile(fullPath);
        files.set(relativePath, new Uint8Array(content));
      }
    }
  }
}

/**
 * Synchronous filesystem source for Node.js environments
 * Use this when you need synchronous file operations (e.g., in quillLoader.js)
 */
export class FilesystemSourceSync {
  /**
   * @param {string} rootPath - Root directory path
   * @param {any} fs - Node.js 'fs' module (not fs/promises)
   * @param {any} path - Node.js 'path' module
   */
  constructor(rootPath, fs, path) {
    this.rootPath = rootPath;
    this.fs = fs;
    this.path = path;
  }

  /**
   * Read all files from the filesystem
   * @returns {Promise<Map<string, Uint8Array>>}
   */
  async readAllFiles() {
    const files = new Map();
    this.readDirectoryRecursiveSync(this.rootPath, this.rootPath, files);
    return files;
  }

  /**
   * @private
   */
  readDirectoryRecursiveSync(dirPath, basePath, files) {
    const entries = this.fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = this.path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        this.readDirectoryRecursiveSync(fullPath, basePath, files);
      } else if (entry.isFile()) {
        const relativePath = this.path.relative(basePath, fullPath);
        const content = this.fs.readFileSync(fullPath);
        files.set(relativePath, new Uint8Array(content));
      }
    }
  }
}

/**
 * Zip source for browser environments
 * Reads files from an unzipped file structure
 */
export class ZipSource {
  /**
   * @param {Record<string, Uint8Array>} unzippedFiles - Unzipped files from fflate
   * @param {string} [pathPrefix=''] - Optional path prefix to strip
   */
  constructor(unzippedFiles, pathPrefix = '') {
    this.unzippedFiles = unzippedFiles;
    this.pathPrefix = pathPrefix;
  }

  /**
   * Read all files from the zip
   * @returns {Promise<Map<string, Uint8Array>>}
   */
  async readAllFiles() {
    const files = new Map();

    for (const [path, data] of Object.entries(this.unzippedFiles)) {
      // Skip directories (they end with /)
      if (path.endsWith('/')) continue;

      // Skip files outside the path prefix
      if (this.pathPrefix && !path.startsWith(this.pathPrefix)) continue;

      // Remove the path prefix if it exists
      const relativePath = this.pathPrefix
        ? path.substring(this.pathPrefix.length)
        : path;

      files.set(relativePath, data);
    }

    return files;
  }
}
