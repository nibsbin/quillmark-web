/**
 * Shared file loading utilities - Cascade 3
 *
 * Simple functions to eliminate duplication in directory traversal and tree building.
 */

// Utility functions (inlined to avoid .ts import issues in Node.js scripts)
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.pdf', '.ttf', '.otf', '.woff', '.woff2',
  '.zip', '.tar', '.gz'
]);

function detectBinaryFile(filename) {
  const ext = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
    : '';
  return BINARY_EXTENSIONS.has(ext);
}

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
 * Recursively read all files from a directory (async)
 * @param {string} dirPath - Directory to read
 * @param {any} fs - Node.js fs/promises module
 * @param {any} path - Node.js path module
 * @returns {Promise<Map<string, Uint8Array>>} Map of relative paths to file contents
 */
export async function readDirectoryAsync(dirPath, fs, path) {
  const files = new Map();

  async function traverse(dir, basePath) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath, basePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(basePath, fullPath);
        const content = await fs.readFile(fullPath);
        files.set(relativePath, new Uint8Array(content));
      }
    }
  }

  await traverse(dirPath, dirPath);
  return files;
}

/**
 * Recursively read all files from a directory (sync)
 * @param {string} dirPath - Directory to read
 * @param {any} fs - Node.js fs module (not fs/promises)
 * @param {any} path - Node.js path module
 * @returns {Map<string, Uint8Array>} Map of relative paths to file contents
 */
export function readDirectorySync(dirPath, fs, path) {
  const files = new Map();

  function traverse(dir, basePath) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath, basePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(basePath, fullPath);
        const content = fs.readFileSync(fullPath);
        files.set(relativePath, new Uint8Array(content));
      }
    }
  }

  traverse(dirPath, dirPath);
  return files;
}

/**
 * Convert a Map of files into a tree structure with configurable format
 * @param {Map<string, Uint8Array>} fileMap - Map of paths to contents
 * @param {Object} options - Build options
 * @param {'flat'|'nested'} options.format - Output format
 * @param {boolean} [options.wrapContents=false] - Wrap in { contents: ... }
 * @param {boolean} [options.detectBinary=false] - Detect binary files
 * @param {boolean} [options.rawBuffers=false] - Keep as raw Buffers (for zipping)
 * @returns {Record<string, any>} File tree
 */
export function buildFileTree(fileMap, options) {
  const { format, wrapContents = false, detectBinary = false, rawBuffers = false } = options;
  const result = {};

  for (const [filePath, data] of fileMap.entries()) {
    let value;

    if (rawBuffers) {
      value = Buffer.from(data);
    } else if (detectBinary && detectBinaryFile(filePath)) {
      value = wrapContents ? { contents: Array.from(data) } : Array.from(data);
    } else {
      const text = new TextDecoder().decode(data);
      value = wrapContents ? { contents: text } : text;
    }

    if (format === 'nested') {
      insertPath(result, filePath.split('/'), value);
    } else {
      result[filePath] = value;
    }
  }

  return result;
}

/**
 * Extract files from an unzipped structure (from fflate)
 * @param {Record<string, Uint8Array>} unzipped - Unzipped files
 * @param {string} [pathPrefix=''] - Optional path prefix to strip
 * @returns {Map<string, Uint8Array>} Map of relative paths to contents
 */
export function extractZipFiles(unzipped, pathPrefix = '') {
  const files = new Map();

  for (const [path, data] of Object.entries(unzipped)) {
    if (path.endsWith('/')) continue; // Skip directories
    if (pathPrefix && !path.startsWith(pathPrefix)) continue;

    const relativePath = pathPrefix ? path.substring(pathPrefix.length) : path;
    files.set(relativePath, data);
  }

  return files;
}
