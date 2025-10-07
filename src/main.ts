import { 
  QuillmarkEngine, 
  Quill,
  fromDirectory,
  renderToElement,
  renderToBlob,
  downloadArtifact,
  debounce
} from './lib';

// File list for usaf_memo Quill - directly embedded since structure is known
const USAF_MEMO_FILES = [
  'Quill.toml',
  'glue.typ',
  'usaf_memo.md',
  'assets/CopperplateCC-Heavy.otf',
  'assets/DejaVuSansMono-Bold.ttf',
  'assets/DejaVuSansMono-BoldOblique.ttf',
  'assets/DejaVuSansMono-Oblique.ttf',
  'assets/DejaVuSansMono.ttf',
  'assets/NimbusRomNo9L-Med.otf',
  'assets/NimbusRomNo9L-MedIta.otf',
  'assets/NimbusRomNo9L-Reg.otf',
  'assets/NimbusRomNo9L-RegIta.otf',
  'assets/dod_seal.gif',
  'packages/tonguetoquill-usaf-memo/LICENSE',
  'packages/tonguetoquill-usaf-memo/src/lib.typ',
  'packages/tonguetoquill-usaf-memo/src/utils.typ',
  'packages/tonguetoquill-usaf-memo/typst.toml',
];

// Helper to read file as text
async function readTextFile(path: string): Promise<string> {
  const response = await fetch(`/${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.statusText}`);
  return response.text();
}

// Init app
async function init() {
  const markdownInput = document.getElementById('markdown-input') as HTMLTextAreaElement | null;
  const downloadPdfBtn = document.getElementById('download-pdf-btn') as HTMLButtonElement | null;
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

  let engine: QuillmarkEngine | null = null;

  try {
    // Load Quill using the new fromDirectory utility
    const quillJson = await fromDirectory('/usaf_memo', USAF_MEMO_FILES);
    
    // Create engine and register Quill
    engine = QuillmarkEngine.create({});
    const quill = Quill.fromJson(JSON.stringify(quillJson));
    engine.registerQuill(quill);
    
    // Load default markdown
    const defaultMarkdown = await readTextFile('usaf_memo/usaf_memo.md');
    markdownInput.value = defaultMarkdown;
    
    // Enable PDF download button
    if (downloadPdfBtn) downloadPdfBtn.disabled = false;
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    return;
  }

  // Auto-render SVG when the markdown changes using renderToElement
  const renderSvg = async () => {
    if (!engine) return;
    try {
      await renderToElement(
        engine,
        'usaf_memo',
        markdownInput.value,
        preview,
        { format: 'svg' }
      );
    } catch (err) {
      console.error('SVG render error:', err);
      showStatus('SVG render failed', 'error');
    }
  };

  const debouncedRender = debounce(renderSvg, 50);
  markdownInput.addEventListener('input', debouncedRender);

  // Initial SVG render on page load
  renderSvg().catch(err => console.error('Initial SVG render failed:', err));

  // Download PDF on demand using renderToBlob and downloadArtifact
  downloadPdfBtn?.addEventListener('click', async () => {
    if (!engine) return;
    showLoading('Rendering PDF...');
    try {
      const blob = await renderToBlob(
        engine,
        'usaf_memo',
        markdownInput.value,
        { format: 'pdf' }
      );
      
      if (blob.size === 0) {
        showStatus('No PDF artifact produced', 'error');
        return;
      }

      downloadArtifact(blob, 'render-output.pdf');
      showStatus('Download started — check your browser downloads', 'success');
    } catch (err) {
      console.error('PDF render/download error:', err);
      showStatus('PDF generation failed', 'error');
    }
  });
}

init().catch(console.error);
