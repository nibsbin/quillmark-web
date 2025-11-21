/**
 * File Source Abstraction - Type Declarations
 */

/**
 * Abstract interface for reading files from any source
 */
export interface FileSource {
  /**
   * Read all files from the source
   * @returns Map of relative paths to file contents (as Uint8Array)
   */
  readAllFiles(): Promise<Map<string, Uint8Array>>;
}

/**
 * Options for building file trees
 */
export interface TreeBuildOptions {
  /**
   * Output format:
   * - 'flat': { 'path/to/file': contents, ... }
   * - 'nested': { 'path': { 'to': { 'file': contents } } }
   */
  format: 'flat' | 'nested';

  /**
   * Whether to wrap contents in { contents: ... } objects
   * Required for Quill JSON format
   */
  wrapContents?: boolean;

  /**
   * Whether to detect binary files and handle them differently
   * Binary files are stored as number arrays, text files as strings
   */
  detectBinary?: boolean;

  /**
   * Whether to return raw buffers (for zip creation) or convert to arrays
   */
  rawBuffers?: boolean;
}

/**
 * Build a file tree from a FileSource with configurable output format
 */
export function buildFileTree(
  source: FileSource,
  options: TreeBuildOptions
): Promise<Record<string, any>>;

/**
 * Filesystem source for Node.js environments
 */
export class FilesystemSource implements FileSource {
  constructor(rootPath: string, fs: any, path: any);
  readAllFiles(): Promise<Map<string, Uint8Array>>;
}

/**
 * Synchronous filesystem source for Node.js environments
 */
export class FilesystemSourceSync implements FileSource {
  constructor(rootPath: string, fs: any, path: any);
  readAllFiles(): Promise<Map<string, Uint8Array>>;
}

/**
 * Zip source for browser environments
 */
export class ZipSource implements FileSource {
  constructor(unzippedFiles: Record<string, Uint8Array>, pathPrefix?: string);
  readAllFiles(): Promise<Map<string, Uint8Array>>;
}
