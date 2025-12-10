/**
 * @quillmark/web-utils - Utilities for Quillmark
 * 
 * This library provides convenient helpers for loading Quill templates.
 * For rendering, use @quillmark/wasm directly.
 */

import { fromZip as _fromZip } from './loaders';
import { detectBinaryFile, debounce } from './utils';

// Export types
export type {
  QuillJson,
  FileTree,
  FileNode,
  QuillMetadata,
} from './types';

// Grouped exports - the only way to access utilities
export const loaders = {
  fromZip: _fromZip
};

export const utils = {
  detectBinaryFile,
  debounce
};
