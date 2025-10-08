import { 
  Quillmark, 
  loaders,
  exporters,
  utils
} from './lib';

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

  let engine: Quillmark | null = null;

  try {
    // Load Quill from zip file using the opinionated loaders.fromZip utility
    const response = await fetch('/quills/usaf_memo.zip');
    if (!response.ok) {
      throw new Error(`Failed to load Quill zip: ${response.statusText}`);
    }
    const zipBlob = await response.blob();
    const quillJson = await loaders.fromZip(zipBlob);
    
    // Create engine and register Quill using new() API
    engine = new Quillmark();
    engine.registerQuill('usaf_memo', quillJson);
    
    // Load default markdown from the zip content
    const defaultMarkdown = quillJson.files?.['usaf_memo.md']?.contents || '# Welcome\n\nEdit this markdown to see the preview update.';
    markdownInput.value = defaultMarkdown;
    
    // Enable PDF download button
    if (downloadPdfBtn) downloadPdfBtn.disabled = false;
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    return;
  }

  // Auto-render SVG when the markdown changes using exporters.toElement
  const renderSvg = async () => {
    if (!engine) return;
    try {
      await exporters.toElement(
        engine,
        markdownInput.value,
        preview,
        { format: 'svg' }
      );
    } catch (err) {
      console.error('SVG render error:', err);
      showStatus('SVG render failed', 'error');
    }
  };

  const debouncedRender = utils.debounce(renderSvg, 50);
  markdownInput.addEventListener('input', debouncedRender);

  // Initial SVG render on page load
  renderSvg().catch(err => console.error('Initial SVG render failed:', err));

  // Download PDF on demand using exporters.toBlob and exporters.download
  downloadPdfBtn?.addEventListener('click', async () => {
    if (!engine) return;
    showLoading('Rendering PDF...');
    try {
      const blob = await exporters.toBlob(
        engine,
        markdownInput.value,
        { format: 'pdf' }
      );
      exporters.download(blob, 'render-output.pdf');
      showStatus('Download started — check your browser downloads', 'success');
    } catch (err) {
      console.error('PDF render/download error:', err);
      showStatus('PDF generation failed', 'error');
    }
  });
}

init().catch(console.error);
