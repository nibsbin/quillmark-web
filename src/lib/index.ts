/**
 * @quillmark-test/web - Opinionated frontend utilities for Quillmark
 * 
 * This library provides convenient helpers for loading Quill templates
 * and rendering documents in the browser, while maintaining full access
 * to the underlying WASM API.
 */

import { Quillmark, Quill } from '@quillmark-test/wasm';
import { exportToBlob, exportToDataUrl, exportToElement, download as downloadBlob } from './exporters';
import { fromZip as _fromZip } from './loaders';
import { detectBinaryFile, debounce } from './utils';

// Re-export WASM core classes
export { Quillmark, Quill } from '@quillmark-test/wasm';

// Export types
export type { 
  QuillJson, 
  FileTree, 
  FileNode, 
  QuillMetadata,
  RenderOptions
} from './types';

// Grouped exports - the only way to access utilities
export const loaders = {
  fromZip: _fromZip
};

export const exporters = {
  toBlob: exportToBlob,
  toDataUrl: exportToDataUrl,
  toElement: exportToElement,
  download: downloadBlob
};

export const utils = {
  detectBinaryFile,
  debounce
};
