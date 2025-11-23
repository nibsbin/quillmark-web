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
 * Parsed markdown document (returned by Quillmark.parseMarkdown)
 */
export interface ParsedDocument {
  fields: Record<string, any>;
  quillTag?: string;
}

/**
 * Supported render formats
 */
export type RenderFormat = 'pdf' | 'svg';

/**
 * Information about a registered Quill (returned by engine.getQuillInfo)
 */
export interface QuillInfo {
  name: string;
  backend: string;
  metadata: Record<string, any>;
  example?: string;
  fieldSchemas: Record<string, any>;
  supportedFormats: Array<RenderFormat>;
}

/**
 * Artifact from render result
 * @deprecated Legacy format - use RenderResult.artifacts directly
 */
export interface Artifact {
  bytes: Uint8Array;
  mimeType?: string;
}

/**
 * Result from rendering (standardized format)
 *
 * This interface represents the standardized render result contract.
 * Artifacts can be:
 * - A single Uint8Array for single-page output
 * - An array of Uint8Array for multi-page output (e.g., multiple SVG pages)
 * - An object with named artifacts (e.g., { main: ..., header: ... })
 */
export interface RenderResult {
  artifacts: Uint8Array | Uint8Array[] | Record<string, Uint8Array>;
  outputFormat: RenderFormat;
}

/**
 * Options for rendering
 */
export interface RenderOptions {
  format?: RenderFormat;
  assets?: Record<string, Uint8Array>;
  quillName?: string;  // Optional: overrides quillTag from ParsedDocument
}