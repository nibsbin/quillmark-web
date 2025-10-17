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
  contents: string | number[];  // text or binary (binary as number array for JSON serialization)
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
 * Parsed markdown document (returned by Quillmark.parseMarkdown)
 */
export interface ParsedDocument {
  fields: Record<string, any>;
  quillTag?: string;
}

/**
 * Information about a registered Quill (returned by engine.getQuillInfo)
 */
export interface QuillInfo {
  name: string;
  backend: string;
  metadata: Record<string, any>;
  example?: string;
  fieldSchemas: Record<string, any>;
  supportedFormats: Array<'pdf' | 'svg' | 'txt'>;
}

/**
 * Artifact from render result
 */
export interface Artifact {
  bytes: Uint8Array;
  mimeType?: string;
}

/**
 * Result from rendering
 */
export interface RenderResult {
  artifacts: Artifact[];
}

/**
 * Options for rendering
 */
export interface RenderOptions {
  format?: 'pdf' | 'svg' | 'txt';
  assets?: Record<string, Uint8Array>;
  quillName?: string;  // Optional: overrides quillTag from ParsedDocument
}

/**
 * Options for preview and download operations
 */
export interface PreviewOptions {
  format?: 'pdf' | 'svg' | 'txt';
  assets?: Record<string, Uint8Array>;
  quillName?: string;
}

export interface DownloadOptions {
  format?: 'pdf' | 'svg' | 'txt';
  assets?: Record<string, Uint8Array>;
  quillName?: string;
  filename?: string;
}
