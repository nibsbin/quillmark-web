/**
 * Rendering helper utilities
 */

import type { QuillmarkEngine } from '@quillmark-test/wasm';
import type { RenderOptions } from './types';

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
 * Render markdown to a Blob
 * 
 * @param engine - Quillmark engine instance
 * @param quillName - Name of the registered Quill
 * @param markdown - Markdown content to render
 * @param options - Render options (format, assets, etc.)
 * @returns Blob containing the rendered output
 * 
 * @example
 * const blob = await renderToBlob(engine, 'my-quill', markdown, { format: 'pdf' });
 * const url = URL.createObjectURL(blob);
 * window.open(url);
 */
export async function renderToBlob(
  engine: QuillmarkEngine,
  quillName: string,
  markdown: string,
  options?: RenderOptions
): Promise<Blob> {
  const format = options?.format || 'pdf';
  const workflow = engine.loadWorkflow(quillName);
  
  // Process through glue
  let glueResult: any = markdown;
  try {
    glueResult = workflow.processGlue(markdown);
  } catch (err) {
    console.warn('processGlue warning:', err);
  }
  
  // Render
  const result = workflow.renderSource(glueResult, { format, ...options });
  
  // Extract artifact
  let artifactCandidate: any = result.artifacts;
  if (Array.isArray(result.artifacts)) {
    artifactCandidate = result.artifacts[0];
  } else if (result.artifacts && typeof result.artifacts === 'object' && 'main' in result.artifacts) {
    artifactCandidate = result.artifacts.main;
  }
  
  const bytes = toUint8Array(artifactCandidate);
  
  // Determine MIME type
  const mimeType = format === 'pdf' ? 'application/pdf' 
    : format === 'svg' ? 'image/svg+xml'
    : 'text/plain';
  
  return new Blob([bytes], { type: mimeType });
}

/**
 * Render markdown to a data URL
 * 
 * @param engine - Quillmark engine instance
 * @param quillName - Name of the registered Quill
 * @param markdown - Markdown content to render
 * @param options - Render options (format, assets, etc.)
 * @returns Data URL string
 * 
 * @example
 * const dataUrl = await renderToDataUrl(engine, 'my-quill', markdown, { format: 'svg' });
 * imgElement.src = dataUrl;
 */
export async function renderToDataUrl(
  engine: QuillmarkEngine,
  quillName: string,
  markdown: string,
  options?: RenderOptions
): Promise<string> {
  const blob = await renderToBlob(engine, quillName, markdown, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Render markdown directly into a DOM element
 * 
 * For SVG: Injects SVG markup directly
 * For PDF: Creates an embed or iframe element
 * For TXT: Displays as pre-formatted text
 * 
 * @param engine - Quillmark engine instance
 * @param quillName - Name of the registered Quill
 * @param markdown - Markdown content to render
 * @param element - Target HTML element
 * @param options - Render options (format, assets, etc.)
 * 
 * @example
 * const preview = document.getElementById('preview');
 * await renderToElement(engine, 'my-quill', markdown, preview, { format: 'svg' });
 */
export async function renderToElement(
  engine: QuillmarkEngine,
  quillName: string,
  markdown: string,
  element: HTMLElement,
  options?: RenderOptions
): Promise<void> {
  const format = options?.format || 'svg';
  const workflow = engine.loadWorkflow(quillName);
  
  // Process through glue
  let glueResult: any = markdown;
  try {
    glueResult = workflow.processGlue(markdown);
  } catch (err) {
    console.warn('processGlue warning:', err);
  }
  
  // Render
  const result = workflow.renderSource(glueResult, { format, ...options });
  
  // Extract artifact
  let artifactCandidate: any = result.artifacts;
  if (Array.isArray(result.artifacts)) {
    artifactCandidate = result.artifacts[0];
  } else if (result.artifacts && typeof result.artifacts === 'object' && 'main' in result.artifacts) {
    artifactCandidate = result.artifacts.main;
  }
  
  const bytes = toUint8Array(artifactCandidate);
  
  if (format === 'svg') {
    // Inject SVG directly
    const svgText = new TextDecoder().decode(bytes);
    element.innerHTML = svgText;
  } else if (format === 'pdf') {
    // Create blob URL and embed
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    element.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="600px" />`;
  } else {
    // Text format
    const text = new TextDecoder().decode(bytes);
    element.innerHTML = `<pre>${text}</pre>`;
  }
}

/**
 * Trigger browser download of a rendered artifact
 * 
 * @param blob - Blob to download
 * @param filename - Name for the downloaded file
 * 
 * @example
 * const blob = await renderToBlob(engine, 'my-quill', markdown);
 * downloadArtifact(blob, 'output.pdf');
 */
export function downloadArtifact(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
