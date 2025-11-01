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
 * Convert various artifact byte formats to Uint8Array
 * @internal
 */
function toUint8Array(bytesOrArtifact: any): Uint8Array {
  if (bytesOrArtifact == null) return new Uint8Array();
  
  // Unwrap { bytes: ... }
  if (typeof bytesOrArtifact === 'object' && 'bytes' in bytesOrArtifact) {
    return toUint8Array(bytesOrArtifact.bytes);
  }
  
  if (bytesOrArtifact instanceof Uint8Array) return bytesOrArtifact;
  if (bytesOrArtifact instanceof ArrayBuffer) return new Uint8Array(bytesOrArtifact);
  if (Array.isArray(bytesOrArtifact)) return new Uint8Array(bytesOrArtifact);
  
  if (typeof bytesOrArtifact === 'string') {
    // Try to detect base64
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
  
  try {
    const maybeArray = Array.from(bytesOrArtifact as any) as number[];
    return new Uint8Array(maybeArray);
  } catch (e) {
    throw new Error('Unsupported artifact bytes type: ' + Object.prototype.toString.call(bytesOrArtifact));
  }
}

/**
 * Extract the first artifact from a render result
 * @internal
 */
function extractArtifact(result: any): Uint8Array {
  let artifactCandidate: any = result.artifacts;
  if (Array.isArray(result.artifacts)) {
    artifactCandidate = result.artifacts[0];
  } else if (result.artifacts && typeof result.artifacts === 'object' && 'main' in result.artifacts) {
    artifactCandidate = result.artifacts.main;
  }
  
  return toUint8Array(artifactCandidate);
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
  
  // Render using the WASM engine
  const result: RenderResult = engine.render(parsed, { 
    format, 
    ...options 
  });
  
  return result;
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
  const format = result.outputFormat;
  
  // Determine MIME type
  const mimeType = format === 'pdf' ? 'application/pdf' 
    : format === 'svg' ? 'image/svg+xml'
    : 'text/plain';
  
  return new Blob([bytes.slice()], { type: mimeType });
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
  const format = result.outputFormat;
  
  // Clear existing content
  element.innerHTML = '';
  
  if (format === 'svg') {
    // Inject SVG directly for best preview experience
    // Note: SVG is generated by the Quillmark engine (trusted source)
    const svgText = new TextDecoder().decode(bytes);
    element.innerHTML = svgText;
  } else if (format === 'pdf') {
    // Create blob URL and embed using DOM methods
    const blob = new Blob([bytes.slice()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.width = '100%';
    embed.height = '600px';
    element.appendChild(embed);
  } else {
    // Text format - use textContent to avoid XSS
    const text = new TextDecoder().decode(bytes);
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

// ============================================================================
// OLD API - Kept for backward compatibility
// ============================================================================

export async function exportPreview(
  engine: Quillmark,
  markdown: string,
  options?: RenderOptions
): Promise<RenderResult> {
  /**
   * Render markdown for a quick preview using the Quillmark WASM engine.
   *
   * This is a convenience helper that parses the provided markdown to determine
   * the quill tag (unless `options.quillName` is provided), selects a sensible
   * preview format (SVG preferred when supported, otherwise PDF or TXT), and
   * invokes the engine's rendering API. It returns the raw render result from
   * the engine so callers can inspect artifacts, output format, logs, etc.
   *
   * Inputs
   * - engine: initialized `Quillmark` WASM engine instance.
   * - markdown: the markdown string to parse and render. The markdown may
   *   include a Quill tag (e.g. `::quill-name::`) which will be used to
   *   determine the target quill if `options.quillName` is not supplied.
   * - options: optional `RenderOptions` forwarded to the engine. If
   *   `options.format` is omitted, this helper will pick a preferred preview
   *   format via `getPreferredPreviewFormat`.
   *
   * Outputs
   * - Resolves to a `RenderResult` produced by `engine.render(...)`.
   *   The result typically contains `outputFormat` and `artifacts` which can
   *   be used by higher-level helpers like `preview()` or `exportToBlob()`.
   *
   * Behavior and error modes
   * - If the markdown cannot be parsed, the underlying `Quillmark.parseMarkdown`
   *   may throw; that error will propagate to the caller.
   * - If the provided `quillName` (explicit or parsed) cannot be resolved by
   *   the engine, `engine.render` may throw. Callers should handle or surface
   *   these errors as appropriate for their UI (e.g. show an error message).
   *
   * Examples
   * ```ts
   * const result = await exportPreview(engine, '# My Doc');
   * // Prefer SVG preview when available
   * if (result.outputFormat === 'svg') {
   *   const svg = new TextDecoder().decode(result.artifacts[0]);
   * }
   * ```
   */
  // Parse markdown to get quill tag
  const parsed: ParsedDocument = Quillmark.parseMarkdown(markdown);
  const quillName = options?.quillName || parsed.quillTag;
  
  // Determine the best format for preview
  const format = getPreferredPreviewFormat(engine, quillName, options?.format);
  
  // Render using the new WASM workflow
  const result: RenderResult = engine.render(parsed, { 
    format, 
    ...options 
  });
  return result
}

/**
 * Preview rendered markdown in a DOM element
 * 
 * Intelligently selects the best format for preview:
 * - Prefers SVG for inline display (if supported by the Quill)
 * - Falls back to PDF embed if SVG is not supported
 * - Can be overridden with explicit format option
 * 
 * @param engine - Quillmark engine instance
 * @param markdown - Markdown content to render
 * @param element - Target HTML element for preview
 * @param options - Preview options (format can override smart defaults)
 * 
 * @example
 * const preview = document.getElementById('preview');
 * await preview(engine, markdown, preview); // Auto-selects SVG or PDF
 * 
 * @example
 * // Force PDF preview
 * await preview(engine, markdown, preview, { format: 'pdf' });
 */
export async function preview(
  engine: Quillmark,
  markdown: string,
  element: HTMLElement,
  options?: RenderOptions
): Promise<void> {
  const result = await exportPreview(engine, markdown, options);
  const format = result.outputFormat;

  const bytes = extractArtifact(result);
  
  if (format === 'svg') {
    // Inject SVG directly for best preview experience
    const svgText = new TextDecoder().decode(bytes);
    element.innerHTML = svgText;
  } else if (format === 'pdf') {
    // Create blob URL and embed
    const blob = new Blob([bytes.slice()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    element.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="600px" />`;
  } else {
    // Text format
    const text = new TextDecoder().decode(bytes);
    element.innerHTML = `<pre>${text}</pre>`;
  }
}

/**
 * Download rendered markdown as a file
 * 
 * Defaults to PDF format (most common download use case) but can be overridden.
 * 
 * @param engine - Quillmark engine instance
 * @param markdown - Markdown content to render
 * @param options - Download options (format, filename, etc.)
 * 
 * @example
 * // Download as PDF (default)
 * await downloadDocument(engine, markdown, { filename: 'document.pdf' });
 * 
 * @example
 * // Download as SVG
 * await downloadDocument(engine, markdown, { format: 'svg', filename: 'document.svg' });
 */
export async function downloadDocument(
  engine: Quillmark,
  markdown: string,
  outputFilename: string,
  options?: RenderOptions
): Promise<void> {
  const format = options?.format || 'pdf';
  
  // Parse markdown
  const parsed: ParsedDocument = Quillmark.parseMarkdown(markdown);
  
  // Render using the new WASM workflow
  const result: RenderResult = engine.render(parsed, { 
    format, 
    quillName: options?.quillName,
    assets: options?.assets 
  });
  
  const bytes = extractArtifact(result);
  
  // Determine MIME type and default filename
  const mimeType = format === 'pdf' ? 'application/pdf' 
    : format === 'svg' ? 'image/svg+xml'
    : 'text/plain';
  
  const defaultFilename = format === 'pdf' ? 'document.pdf'
    : format === 'svg' ? 'document.svg'
    : 'document.txt';
  
  const filename = outputFilename || defaultFilename;
  
  // Create blob and trigger download
  const blob = new Blob([bytes.slice()], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Trigger browser download of a blob
 * @internal
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_REVOKE_DELAY);
}


/**
 * Export rendered markdown to a Blob
 * 
 * @param engine - Quillmark engine instance
 * @param markdown - Markdown content to render
 * @param options - Render options (format, assets, etc.)
 * @returns Blob containing the rendered output
 * 
 * @example
 * const blob = await exportToBlob(engine, markdown, { format: 'pdf' });
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 */
export async function exportToBlob(
  engine: Quillmark,
  markdown: string,
  options?: RenderOptions
): Promise<Blob> {
  const format = options?.format || 'pdf';
  
  // Parse markdown using new WASM API
  const parsed: ParsedDocument = Quillmark.parseMarkdown(markdown);
  
  // Render using the new WASM workflow
  const result: RenderResult = engine.render(parsed, { format, ...options });
  
  const bytes = extractArtifact(result);
  
  // Determine MIME type
  const mimeType = format === 'pdf' ? 'application/pdf' 
    : format === 'svg' ? 'image/svg+xml'
    : 'text/plain';
  
  return new Blob([bytes.slice()], { type: mimeType });
}

/**
 * Export rendered markdown to a data URL
 * 
 * @param engine - Quillmark engine instance
 * @param markdown - Markdown content to render
 * @param options - Render options (format, assets, etc.)
 * @returns Data URL string
 * 
 * @example
 * const dataUrl = await exportToDataUrl(engine, markdown, { format: 'svg' });
 * imgElement.src = dataUrl;
 */
export async function exportToDataUrl(
  engine: Quillmark,
  markdown: string,
  options?: RenderOptions
): Promise<string> {
  const blob = await exportToBlob(engine, markdown, options);
  
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
  // Check if Buffer is available (Node.js environment)
  if (typeof Buffer !== 'undefined') {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:${blob.type};base64,${base64}`;
  }
  
  // Fallback for environments without FileReader or Buffer
  throw new Error('exportToDataUrl requires either FileReader (browser) or Buffer (Node.js) to be available');
}

