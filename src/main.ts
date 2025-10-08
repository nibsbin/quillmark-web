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

  let engine: Quillmark | null = null;

  // Helper to load & register a quill zip by filename (e.g. 'usaf_memo.zip' or 'taro.zip')
  async function loadQuillByZipFilename(filename: string) {
    try {
      showLoading(`Loading template ${filename}...`);
      const response = await fetch(`/quills/${filename}`);
      if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
      const zipBlob = await response.blob();
      const quillJson = await loaders.fromZip(zipBlob);

      // Create engine if needed
      if (!engine) engine = new Quillmark();

      // Register under a stable name derived from filename (strip extension)
      const name = filename.replace(/\.zip$/i, '');
  engine.registerQuill(name, quillJson as any);

      // Try to pick a sensible default markdown file from the quill
      const candidateKeys = Object.keys(quillJson.files || {});
      // Prefer <name>.md, fallback to first markdown-like file, else a default
      const preferred = `${name}.md`;
      let defaultMarkdown = '# Welcome\n\nEdit this markdown to see the preview update.';
      if (quillJson.files && quillJson.files[preferred]) {
        defaultMarkdown = quillJson.files[preferred].contents;
      } else {
        const mdKey = candidateKeys.find(k => k.toLowerCase().endsWith('.md'));
        if (mdKey && quillJson.files[mdKey]) defaultMarkdown = quillJson.files[mdKey].contents;
      }

      if (markdownInput) markdownInput.value = defaultMarkdown;
      if (downloadPdfBtn) downloadPdfBtn.disabled = false;
      showStatus(`Loaded template: ${name}`, 'success');
    } catch (err) {
      console.error('Initialization error:', err);
      showStatus(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }

  // Load initial quill based on select value (or default to usaf_memo.zip)
  const initial = quillSelect?.value || 'usaf_memo.zip';
  await loadQuillByZipFilename(initial);

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

  // Re-render when the selected quill changes: load new template and render
  quillSelect?.addEventListener('change', async (e) => {
    const sel = (e.target as HTMLSelectElement).value;
    await loadQuillByZipFilename(sel);
    // Re-render with the new quill
    await renderSvg();
  });

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
