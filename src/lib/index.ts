/**
 * @quillmark-test/web - Opinionated frontend utilities for Quillmark
 * 
 * This library provides convenient helpers for loading Quill templates
 * and rendering documents in the browser, while maintaining full access
 * to the underlying WASM API.
 */

import { 
  render as render_,
  toBlob as toBlob_,
  toDataUrl as toDataUrl_,
  toElement as toElement_,
  download as download_
} from './exporters';
import { fromZip as _fromZip } from './loaders';
import { detectBinaryFile, debounce } from './utils';

// Re-export WASM core classes
export { Quillmark } from '@quillmark-test/wasm';

// Export types
export type { 
  QuillJson, 
  FileTree, 
  FileNode, 
  QuillMetadata,
  RenderOptions,
  ParsedDocument,
  QuillInfo,
  Artifact,
  RenderResult,
} from './types';

// Grouped exports - the only way to access utilities
export const loaders = {
  fromZip: _fromZip
};

export const exporters = {
  render: render_,
  toBlob: toBlob_,
  toDataUrl: toDataUrl_,
  toElement: toElement_,
  download: download_
};

export const utils = {
  detectBinaryFile,
  debounce
};
