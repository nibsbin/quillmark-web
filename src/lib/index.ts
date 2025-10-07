/**
 * @quillmark-test/web - Opinionated frontend utilities for Quillmark
 * 
 * This library provides convenient helpers for loading Quill templates
 * and rendering documents in the browser, while maintaining full access
 * to the underlying WASM API.
 */

import { Quillmark as WasmQuillmark, Quill } from '@quillmark-test/wasm';
import { exportToBlob, exportToDataUrl, exportToElement, download as downloadBlob } from './exporters';
import type { RenderOptions } from './types';

// Re-export WASM core Quill class
export { Quill } from '@quillmark-test/wasm';

// Extend Quillmark with web export utilities
class Quillmark extends WasmQuillmark {
  /**
   * Create a new Quillmark engine instance with web export utilities
   * 
   * @returns Enhanced Quillmark instance with export methods
   */
  static create(): Quillmark {
    const instance = WasmQuillmark.create();
    // Copy methods from our extended class to the instance
    Object.setPrototypeOf(instance, Quillmark.prototype);
    return instance as Quillmark;
  }

  /**
   * Export rendered markdown to a Blob
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param options - Render options (format, assets, etc.)
   * @returns Blob containing the rendered artifact
   * 
   * @example
   * const blob = await engine.exportToBlob('my-quill', markdown, { format: 'pdf' });
   * const url = URL.createObjectURL(blob);
   * window.open(url);
   */
  async exportToBlob(
    quillName: string,
    markdown: string,
    options?: RenderOptions
  ): Promise<Blob> {
    return exportToBlob(this, quillName, markdown, options);
  }

  /**
   * Export rendered markdown to a data URL
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param options - Render options (format, assets, etc.)
   * @returns Data URL string
   * 
   * @example
   * const dataUrl = await engine.exportToDataUrl('my-quill', markdown, { format: 'svg' });
   * imgElement.src = dataUrl;
   */
  async exportToDataUrl(
    quillName: string,
    markdown: string,
    options?: RenderOptions
  ): Promise<string> {
    return exportToDataUrl(this, quillName, markdown, options);
  }

  /**
   * Export rendered markdown directly into a DOM element
   * 
   * For SVG: Injects SVG markup directly
   * For PDF: Creates an embed or iframe element
   * For TXT: Displays as pre-formatted text
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param element - Target HTML element
   * @param options - Render options (format, assets, etc.)
   * 
   * @example
   * const preview = document.getElementById('preview');
   * await engine.exportToElement('my-quill', markdown, preview, { format: 'svg' });
   */
  async exportToElement(
    quillName: string,
    markdown: string,
    element: HTMLElement,
    options?: RenderOptions
  ): Promise<void> {
    return exportToElement(this, quillName, markdown, element, options);
  }

  /**
   * Render markdown and download the artifact
   * 
   * @param quillName - Name of the registered Quill
   * @param markdown - Markdown content to render
   * @param filename - Name for the downloaded file
   * @param options - Render options (format, assets, etc.)
   * 
   * @example
   * await engine.download('my-quill', markdown, 'output.pdf', { format: 'pdf' });
   */
  async download(
    quillName: string,
    markdown: string,
    filename: string,
    options?: RenderOptions
  ): Promise<void> {
    const blob = await exportToBlob(this, quillName, markdown, options);
    downloadBlob(blob, filename);
  }
}

export { Quillmark };

// Export loaders
export { fromZip } from './loaders';

// Export exporters (standalone functions for functional API)
export { 
  exportToBlob, 
  exportToDataUrl, 
  exportToElement,
  download
} from './exporters';

// Backward compatibility: export old names as aliases
export { 
  exportToBlob as renderToBlob,
  exportToDataUrl as renderToDataUrl,
  exportToElement as renderToElement,
  download as downloadArtifact
} from './exporters';

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

// Grouped exports for better discoverability
import { fromZip as _fromZip } from './loaders';
import { detectBinaryFile, debounce } from './utils';

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
