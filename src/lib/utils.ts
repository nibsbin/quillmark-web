/**
 * Utility functions for Quillmark web library
 */

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.pdf', '.ttf', '.otf', '.woff', '.woff2',
  '.zip', '.tar', '.gz'
]);

/**
 * Check if a filename indicates a binary file
 * 
 * @param filename - File name to check
 * @returns true if the file should be treated as binary
 * 
 * @example
 * detectBinaryFile('logo.png')  // true
 * detectBinaryFile('glue.typ')  // false
 */
export function detectBinaryFile(filename: string): boolean {
  const ext = filename.includes('.') 
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase() 
    : '';
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Helper to insert a file path into nested object structure
 * @internal
 */
export function insertPath(root: any, parts: string[], value: any): void {
  const [head, ...rest] = parts;
  if (!rest || rest.length === 0) {
    root[head] = value;
    return;
  }
  if (!(head in root)) root[head] = {};
  insertPath(root[head], rest, value);
}

/**
 * Simple debounce function
 * @internal
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 250): (...args: Parameters<T>) => void {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}
