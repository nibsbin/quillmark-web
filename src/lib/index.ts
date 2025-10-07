/**
 * @quillmark-test/web - Opinionated frontend utilities for Quillmark
 * 
 * This library provides convenient helpers for loading Quill templates
 * and rendering documents in the browser, while maintaining full access
 * to the underlying WASM API.
 */

// Re-export WASM core
export { Quillmark, Quill } from '@quillmark-test/wasm';

// Re-export WASM types (if available)
// Note: @quillmark-test/wasm may not have all types exported,
// so we define our own for now

// Export loaders
export { fromZip } from './loaders';

// Export renderers
export { 
  renderToBlob, 
  renderToDataUrl, 
  renderToElement,
  downloadArtifact 
} from './renderers';

// Export utilities
export { detectBinaryFile, debounce } from './utils';

// Export types
export type { 
  QuillJson, 
  FileTree, 
  FileNode, 
  QuillMetadata,
  RenderOptions
} from './types';
