/**
 * Type definitions for @quillmark/web-utils utilities
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