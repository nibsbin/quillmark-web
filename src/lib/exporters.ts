/**
 * Export helper utilities for converting rendered artifacts to browser formats
 */

import { Quillmark } from '@quillmark-test/wasm';
import type { 
  RenderOptions,
  RenderResult,
  QuillInfo,
  ParsedDocument
} from './types';

/** Time to wait before revoking blob URLs (in milliseconds) */
const BLOB_URL_REVOKE_DELAY = 1500;

/**
 * Normalize legacy WASM output to standardized RenderResult format
 *
 * This function handles the 10+ different artifact formats that WASM might return
 * and converts them to the standard { main: Uint8Array } format.
 *
 * @internal
 */
function normalizeWasmResult(rawResult: any): RenderResult {
  const outputFormat = rawResult.outputFormat || 'svg';

  // Helper to convert any byte format to Uint8Array
  const toUint8Array = (bytesOrArtifact: any): Uint8Array => {
    if (bytesOrArtifact == null) return new Uint8Array(0);

    // Unwrap { bytes: ... } wrapper objects
    if (typeof bytesOrArtifact === 'object' && 'bytes' in bytesOrArtifact) {
      return toUint8Array(bytesOrArtifact.bytes);
    }

    // Handle Uint8Array (already correct format)
    if (bytesOrArtifact instanceof Uint8Array) {
      return bytesOrArtifact;
    }

    // Handle ArrayBuffer
    if (bytesOrArtifact instanceof ArrayBuffer) {
      return new Uint8Array(bytesOrArtifact);
    }

    // Handle plain arrays
    if (Array.isArray(bytesOrArtifact)) {
      return new Uint8Array(bytesOrArtifact);
    }

    // Handle strings (with base64 detection)
    if (typeof bytesOrArtifact === 'string') {
      const compact = bytesOrArtifact.replace(/\s+/g, '');
      const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length % 4 === 0;
      if (isBase64) {
        const binary = atob(compact);
        const out = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
        return out;
      }
      return new TextEncoder().encode(bytesOrArtifact);
    }

    // Handle iterables
    try {
      const maybeArray = Array.from(bytesOrArtifact as any) as number[];
      return new Uint8Array(maybeArray);
    } catch (e) {
      throw new Error('Unsupported artifact bytes type: ' + Object.prototype.toString.call(bytesOrArtifact));
    }
  };

  // Extract main artifact from various structural formats
  let mainArtifact: Uint8Array;

  if (Array.isArray(rawResult.artifacts)) {
    // Array format: result.artifacts[0]
    mainArtifact = toUint8Array(rawResult.artifacts[0]);
  } else if (rawResult.artifacts && typeof rawResult.artifacts === 'object' && 'main' in rawResult.artifacts) {
    // Object format: result.artifacts.main (already standardized!)
    mainArtifact = toUint8Array(rawResult.artifacts.main);
  } else if (rawResult.artifacts) {
    // Direct format: result.artifacts
    mainArtifact = toUint8Array(rawResult.artifacts);
  } else {
    mainArtifact = new Uint8Array(0);
  }

  // Return standardized format
  return {
    artifacts: {
      main: mainArtifact
    },
    outputFormat
  };
}

/**
 * Convert Uint8Array or ArrayBuffer to ArrayBuffer
 *
 * Simplified version that only handles the standard format.
 * After Cascade 1 implementation, this only needs to handle Uint8Array and ArrayBuffer.
 *
 * @param bytes - Uint8Array or ArrayBuffer to convert
 * @returns ArrayBuffer containing the data
 */
export function toArrayBuffer(bytes: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) {
    return bytes;
  }
  // Ensure we return a plain ArrayBuffer (not SharedArrayBuffer)
  // Use slice() to create a copied Uint8Array backed by a new ArrayBuffer
  const view = bytes.slice();
  return view.buffer;
}

/**
 * Extract the main artifact from a standardized render result
 * @internal
 */
function extractArtifact(result: RenderResult): ArrayBuffer {
  return toArrayBuffer(result.artifacts.main);
}

/**
 * Determine the preferred format for preview based on QuillInfo
 * @internal
 */
function getPreferredPreviewFormat(
  engine: Quillmark,
  quillName?: string,
  userFormat?: 'pdf' | 'svg' | 'txt'
): 'pdf' | 'svg' | 'txt' {
  // User explicitly specified a format
  if (userFormat) {
    return userFormat;
  }

  // If we can determine the quill, check its supported formats
  if (quillName) {
    try {
      const info: QuillInfo = engine.getQuillInfo(quillName);
      if (info.supportedFormats.includes('svg')) {
        return 'svg';
      }
      if (info.supportedFormats.includes('pdf')) {
        return 'pdf';
      }
      if (info.supportedFormats.includes('txt')) {
        return 'txt';
      }
    } catch (e) {
      // Quill not found or error getting info, fall through to default
    }
  }

  // Default: prefer SVG, but if we can't determine, use SVG as a safe default
  return 'svg';
}

// ============================================================================
// NEW API - Cleaner and more semantically consistent
// ============================================================================

/**
 * Render markdown to a result that can be converted to various formats.
 * 
 * This is the core rendering function. It parses the markdown, determines
 * the quill to use, and renders the document. The returned RenderResult
 * can be passed to conversion functions like toBlob(), toDataUrl(), etc.
 * 
 * @param engine - Quillmark engine instance
 * @param markdown - Markdown content to render
 * @param options - Render options (format, quillName, assets)
 * @returns RenderResult containing artifacts and output format
 * 
 * @example
 * // Render to PDF
 * const result = render(engine, markdown, { format: 'pdf' });
 * const blob = toBlob(result);
 * 
 * @example
 * // Render once, export many times
 * const result = render(engine, markdown, { format: 'svg' });
 * const blob = toBlob(result);
 * const dataUrl = await toDataUrl(result);
 * download(result, 'document.svg');
 */
export function render(
  engine: Quillmark,
  markdown: string,
  options?: RenderOptions
): RenderResult {
  // Parse markdown to get quill tag and fields
  const parsed: ParsedDocument = Quillmark.parseMarkdown(markdown);
  const quillName = options?.quillName || parsed.quillTag;

  // Determine format (with smart default for preview)
  const format = options?.format || getPreferredPreviewFormat(engine, quillName);

  // Render using the WASM engine (returns legacy format)
  const rawResult: any = engine.render(parsed, {
    format,
    ...options
  });

  // Normalize to standard format - this is where the cascade happens!
  // We handle all 10+ legacy formats here and convert to { main: Uint8Array }
  return normalizeWasmResult(rawResult);
}

/**
 * Convert a render result to a Blob.
 *
 * @param result - RenderResult from render()
 * @returns Blob containing the rendered output
 *
 * @example
 * const result = render(engine, markdown, { format: 'pdf' });
 * const blob = toBlob(result);
 * const url = URL.createObjectURL(blob);
 */
export function toBlob(result: RenderResult): Blob {
  const bytes = extractArtifact(result);
  const uint8 = new Uint8Array(bytes);
  const format = result.outputFormat;

  // Determine MIME type
  const mimeType = format === 'pdf' ? 'application/pdf'
    : format === 'svg' ? 'image/svg+xml'
    : 'text/plain';

  return new Blob([uint8.slice()], { type: mimeType });
}

/**
 * Convert a render result to a data URL.
 *
 * @param result - RenderResult from render()
 * @returns Promise resolving to data URL string
 *
 * @example
 * const result = render(engine, markdown, { format: 'svg' });
 * const dataUrl = await toDataUrl(result);
 * imgElement.src = dataUrl;
 */
export async function toDataUrl(result: RenderResult): Promise<string> {
  const blob = toBlob(result);
  
  // Check if we're in a browser environment with FileReader
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Node.js environment fallback using Buffer
  if (typeof Buffer !== 'undefined') {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:${blob.type};base64,${base64}`;
  }
  
  // Fallback for environments without FileReader or Buffer
  throw new Error('toDataUrl requires either FileReader (browser) or Buffer (Node.js) to be available');
}

/**
 * Display a render result in a DOM element.
 *
 * Intelligently handles different formats:
 * - SVG: Injects directly into element
 * - PDF: Creates an embed element
 * - TXT: Wraps in a pre element
 *
 * Note: SVG content is rendered as-is. If the SVG source is untrusted,
 * consider sanitizing it before rendering to prevent XSS attacks.
 *
 * @param result - RenderResult from render()
 * @param element - Target HTML element
 *
 * @example
 * const result = render(engine, markdown, { format: 'svg' });
 * const preview = document.getElementById('preview');
 * toElement(result, preview);
 */
export function toElement(
  result: RenderResult,
  element: HTMLElement
): void {
  const bytes = extractArtifact(result);
  const uint8 = new Uint8Array(bytes);
  const format = result.outputFormat;
  
  // Clear existing content
  element.innerHTML = '';
  
  if (format === 'svg') {
    // Inject SVG directly for best preview experience
    // Note: SVG is generated by the Quillmark engine (trusted source)
    const svgText = new TextDecoder().decode(uint8);
    element.innerHTML = svgText;
  } else if (format === 'pdf') {
    // Create blob URL and embed using DOM methods
    const blob = new Blob([uint8.slice()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.width = '100%';
    embed.height = '600px';
    element.appendChild(embed);
  } else {
    // Text format - use textContent to avoid XSS
    const text = new TextDecoder().decode(uint8);
    const pre = document.createElement('pre');
    pre.textContent = text;
    element.appendChild(pre);
  }
}

/**
 * Download a render result as a file.
 *
 * Triggers a browser download with the appropriate MIME type.
 *
 * @param result - RenderResult from render()
 * @param filename - Name for the downloaded file
 *
 * @example
 * const result = render(engine, markdown, { format: 'pdf' });
 * download(result, 'document.pdf');
 */
export function download(
  result: RenderResult,
  filename: string
): void {
  const blob = toBlob(result);
  
  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_DELAY);
}



