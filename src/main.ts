import { Quillmark } from '@quillmark/wasm';
import {
  loaders,
  utils
} from './lib';

/** Time to wait before revoking blob URLs (in milliseconds) */
const BLOB_URL_REVOKE_DELAY = 1500;

/**
 * Download bytes as a file using standard browser APIs
 */
function downloadFile(bytes: Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([bytes as any], { type: mimeType });
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
 * Display rendered bytes in a DOM element
 */
function displayResult(bytes: Uint8Array, format: 'pdf' | 'svg', element: HTMLElement): void {
  element.innerHTML = '';
  
  if (format === 'svg') {
    // Inject SVG directly
    element.innerHTML = new TextDecoder().decode(bytes);
  } else {
    // Create blob URL and embed for PDF viewing
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.width = '100%';
    embed.height = '600px';
    element.appendChild(embed);
  }
}

/**
 * Extract first artifact bytes from WASM render result
 */
function getFirstArtifactBytes(result: any): Uint8Array {
  if (!result.artifacts) {
    return new Uint8Array(0);
  }

  // Helper to convert any byte format to Uint8Array
  const toUint8Array = (value: any): Uint8Array => {
    if (value == null) return new Uint8Array(0);
    
    // Unwrap { bytes: ... } wrapper objects
    if (typeof value === 'object' && 'bytes' in value) {
      return toUint8Array(value.bytes);
    }
    
    // Already a Uint8Array
    if (value instanceof Uint8Array) {
      return value;
    }
    
    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    
    // Plain array of numbers
    if (Array.isArray(value)) {
      return new Uint8Array(value);
    }
    
    return new Uint8Array(0);
  };

  const artifacts = result.artifacts;

  // Array format: get first element
  if (Array.isArray(artifacts)) {
    if (artifacts.length === 0) return new Uint8Array(0);
    return toUint8Array(artifacts[0]);
  }

  // Object format: get 'main' or first available key
  if (typeof artifacts === 'object') {
    if ('main' in artifacts) {
      return toUint8Array(artifacts.main);
    }
    const keys = Object.keys(artifacts);
    if (keys.length > 0) {
      return toUint8Array(artifacts[keys[0]]);
    }
  }

  // Direct format
  return toUint8Array(artifacts);
}

// Init app
async function init() {
  const markdownInput = document.getElementById('markdown-input') as HTMLTextAreaElement | null;
  const downloadPdfBtn = document.getElementById('download-pdf-btn') as HTMLButtonElement | null;
  const quillSelect = document.getElementById('quill-select') as HTMLSelectElement | null;
  const preview = document.getElementById('preview') as HTMLDivElement | null;
  const statusDiv = document.getElementById('status') as HTMLDivElement | null;

  if (!markdownInput || !preview || !statusDiv) {
    console.error('Missing required DOM elements');
    return;
  }

  function showStatus(message: string, type: 'info' | 'success' | 'error') {
    if (!statusDiv) return;
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
  }

  function showLoading(message: string) {
    if (!statusDiv) return;
    statusDiv.className = 'status info';
    statusDiv.innerHTML = `${message} <span class="loading"></span>`;
  }

  // Create engine immediately — we'll register all quills into it at startup
  const engine = new Quillmark();
  const preloadedQuills: Record<string, any> = {};

  // NOTE: quill loading is done once at startup via preloadAllQuills().

  // Preload all quill zip files listed in the select element options
  async function preloadAllQuills() {
    if (!quillSelect) return;
    const options = Array.from(quillSelect.options).map(o => o.value).filter(Boolean);
    if (options.length === 0) return;

    console.log('Preloading quills:', options);
    showLoading('Preloading templates...');

    await Promise.all(options.map(async (filename) => {
      try {
        // Avoid double-fetch
        if (preloadedQuills[filename]) return;
        const response = await fetch(`/quills/${filename}`);
        if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
        const zipBlob = await response.blob();
        const quillJson = await loaders.fromZip(zipBlob);
        try {
          engine!.registerQuill(quillJson as any);
        } catch (_) {
          // ignore duplicate registration errors
        }
        preloadedQuills[filename] = quillJson;
      } catch (err) {
        console.error(`Failed to preload ${filename}:`, err);
        // don't rethrow - continue preloading others
      }
    }));

    let quills = engine.listQuills();
    console.log('Registered quills:', quills);

    showStatus('Templates preloaded', 'success');
  }

  // Preload and register all quills, then populate the editor with the initial quill's markdown
  await preloadAllQuills();
  const initial = quillSelect?.value || 'usaf_memo.zip';
  const initialQuill = preloadedQuills[initial];
  if (initialQuill && markdownInput) {
    const initialName = initial.replace(/\.zip$/i, '');
    const candidateKeys = Object.keys(initialQuill.files || {});
    const preferred = `${initialName}.md`;
    const mdKey = (initialQuill.files && initialQuill.files[preferred])
      ? preferred
      : candidateKeys.find((k: string) => k.toLowerCase().endsWith('.md'));
    markdownInput.value = mdKey && initialQuill.files[mdKey]
      ? initialQuill.files[mdKey].contents
      : '# Welcome\n\nEdit this markdown to see the preview update.';
    if (downloadPdfBtn) downloadPdfBtn.disabled = false;
  }

  // Auto-render preview when the markdown changes using WASM directly
  const renderPreview = async () => {
    try {
      const parsed = Quillmark.parseMarkdown(markdownInput.value);
      const result = engine.render(parsed, { format: 'svg' });
      const bytes = getFirstArtifactBytes(result);
      displayResult(bytes, 'svg', preview);
    } catch (err) {
      console.error('Preview render error:', err);
      showStatus(`Preview render failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const debouncedRender = utils.debounce(renderPreview, 50);
  markdownInput.addEventListener('input', debouncedRender);

  // Re-render when the selected quill changes: swap editor content only
  quillSelect?.addEventListener('change', async (e) => {
    const sel = (e.target as HTMLSelectElement).value;
    const quillJson = preloadedQuills[sel];
    if (!quillJson || !markdownInput) return;
    const name = sel.replace(/\.zip$/i, '');
    const candidateKeys = Object.keys(quillJson.files || {});
    const preferred = `${name}.md`;
    const mdKey = (quillJson.files && quillJson.files[preferred])
      ? preferred
      : candidateKeys.find((k: string) => k.toLowerCase().endsWith('.md'));
    markdownInput.value = mdKey && quillJson.files[mdKey]
      ? quillJson.files[mdKey].contents
      : '# Welcome\n\nEdit this markdown to see the preview update.';
    await renderPreview();
  });

  // Initial preview render on page load
  renderPreview().catch(err => console.error('Initial preview render failed:', err));

  // Download PDF on demand using WASM directly
  downloadPdfBtn?.addEventListener('click', async () => {
    showLoading('Rendering document...');
    try {
      const parsed = Quillmark.parseMarkdown(markdownInput.value);
      const result = engine.render(parsed, { format: 'pdf' });
      const bytes = getFirstArtifactBytes(result);
      downloadFile(bytes, 'document.pdf', 'application/pdf');
      showStatus('Download started — check your browser downloads', 'success');
    } catch (err) {
      console.error('Document render/download error:', err);
      showStatus(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  });

  // Demo: Export SVG pages programmatically
  // This function demonstrates the SVG export using WASM directly
  function exportSvgPages(): string | string[] {
    if (!markdownInput) throw new Error('Markdown input not available');
    const parsed = Quillmark.parseMarkdown(markdownInput.value);
    const result = engine.render(parsed, { format: 'svg' });
    
    // Convert artifacts to strings
    if (Array.isArray(result.artifacts)) {
      return result.artifacts.map((artifact: any) => {
        const bytes = artifact.bytes || artifact;
        return new TextDecoder().decode(bytes);
      });
    }
    const bytes = getFirstArtifactBytes(result);
    return new TextDecoder().decode(bytes);
  }

  // Make API available globally for console usage
  (window as any).quillmark = {
    engine,
    exportSvgPages,
    // Example: Get SVG as string(s) for programmatic use
    getSvg: () => {
      if (!markdownInput) throw new Error('Markdown input not available');
      const parsed = Quillmark.parseMarkdown(markdownInput.value);
      const result = engine.render(parsed, { format: 'svg' });
      
      if (Array.isArray(result.artifacts) && result.artifacts.length > 1) {
        const pages = result.artifacts.map((artifact: any) => {
          const bytes = artifact.bytes || artifact;
          return new TextDecoder().decode(bytes);
        });
        console.log(`Rendered ${pages.length} SVG pages`);
        return pages;
      }
      
      const bytes = getFirstArtifactBytes(result);
      const svg = new TextDecoder().decode(bytes);
      console.log('Rendered single SVG page');
      return svg;
    }
  };
}

init().catch(console.error);
