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

/*
 * Convert various artifact byte formats to ArrayBuffer-backed Uint8Array
 * @internal
 */
function toArrayBuffer(bytesOrArtifact: any): Uint8Array {
  if (bytesOrArtifact == null) return new Uint8Array();

  // Unwrap { bytes: ... }
  if (typeof bytesOrArtifact === 'object' && 'bytes' in bytesOrArtifact) {
    return toArrayBuffer(bytesOrArtifact.bytes);
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
  
  return toArrayBuffer(artifactCandidate);
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



