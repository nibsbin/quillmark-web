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
        const name = filename.replace(/\.zip$/i, '');
        try {
          engine!.registerQuill(name, quillJson as any);
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

  // Auto-render preview when the markdown changes using exporters.preview
  const renderPreview = async () => {
    try {
      await exporters.preview(engine, markdownInput.value, preview);
    } catch (err) {
      console.error('Preview render error:', err);
      showStatus('Preview render failed', 'error');
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

  // Download PDF on demand using exporters.downloadDocument
  downloadPdfBtn?.addEventListener('click', async () => {
    showLoading('Rendering PDF...');
    try {
      await exporters.downloadDocument(engine, markdownInput.value, { filename: 'render-output.pdf' });
      showStatus('Download started — check your browser downloads', 'success');
    } catch (err) {
      console.error('PDF render/download error:', err);
      showStatus('PDF generation failed', 'error');
    }
  });
}

init().catch(console.error);
