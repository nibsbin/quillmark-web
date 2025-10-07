/**
 * Type definitions for @quillmark-test/web utilities
 */

/**
 * Quill JSON contract format
 */
export interface QuillJson {
  files: FileTree;
  metadata?: QuillMetadata;
}

/**
 * File tree structure (nested directories and files)
 */
export interface FileTree {
  [key: string]: FileNode | FileTree;
}

/**
 * Individual file entry
 */
export interface FileNode {
  contents: string | number[];  // text or binary
}

/**
 * Optional metadata override
 */
export interface QuillMetadata {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
}

/**
 * Options for rendering
 */
export interface RenderOptions {
  format?: 'pdf' | 'svg' | 'txt';
  assets?: Record<string, Uint8Array>;
}
