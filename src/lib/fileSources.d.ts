/**
 * Shared file loading utilities - Type Declarations
 */

export function readDirectoryAsync(
  dirPath: string,
  fs: any,
  path: any
): Promise<Map<string, Uint8Array>>;

export function readDirectorySync(
  dirPath: string,
  fs: any,
  path: any
): Map<string, Uint8Array>;

export interface BuildOptions {
  format: 'flat' | 'nested';
  wrapContents?: boolean;
  detectBinary?: boolean;
  rawBuffers?: boolean;
}

export function buildFileTree(
  fileMap: Map<string, Uint8Array>,
  options: BuildOptions
): Record<string, any>;

export function extractZipFiles(
  unzipped: Record<string, Uint8Array>,
  pathPrefix?: string
): Map<string, Uint8Array>;
