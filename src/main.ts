import { QuillmarkEngine, Quill } from '@quillmark-test/wasm';

// Helper to read file as text from fixtures
async function readFixtureFile(path: string): Promise<string> {
  const response = await fetch(`/node_modules/@quillmark-test/fixtures/resources/${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.statusText}`);
  return response.text();
}

// Helper to read file as bytes from fixtures
async function readFixtureFileBytes(path: string): Promise<number[]> {
  const response = await fetch(`/node_modules/@quillmark-test/fixtures/resources/${path}`);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.statusText}`);
  const ab = await response.arrayBuffer();
  return Array.from(new Uint8Array(ab));
}

// Load a Quill from the fixtures manifest and resources (builds the tree recursively)
async function loadUsafMemoQuill(): Promise<Quill> {
  // Fetch the public manifest which maps fixture sets to file lists
  const resp = await fetch('/fixtures-manifest.json');
  if (!resp.ok) throw new Error('Failed to load fixtures manifest');
  const manifest = await resp.json() as Record<string, string[]>;

  const setName = 'usaf_memo';
  const entries = manifest[setName];
  if (!entries) throw new Error(`No manifest entry for ${setName}`);

  // Helper to insert a file path like 'packages/foo/src/lib.typ' into the nested object
  function insertPath(root: any, parts: string[], value: any) {
    const [head, ...rest] = parts;
    if (!rest || rest.length === 0) {
      root[head] = value;
      return;
    }
    if (!(head in root)) root[head] = {};
    insertPath(root[head], rest, value);
  }

  const quillObj: any = { name: setName };

  // Decide which files are binary
  const binaryExt = new Set(['.otf', '.ttf', '.gif', '.png', '.jpg', '.jpeg']);

  // Load each listed file and insert into quillObj under the setName directory
  for (const relPath of entries) {
    const fullPath = `${setName}/${relPath}`; // matches fixture resource layout
    const parts = relPath.split('/');
    const fileName = parts[parts.length - 1];

    // choose binary vs text loader by file extension
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
    try {
      if (binaryExt.has(ext)) {
        const bytes = await readFixtureFileBytes(fullPath);
        insertPath(quillObj, parts, { contents: bytes });
      } else {
        const text = await readFixtureFile(fullPath);
        insertPath(quillObj, parts, { contents: text });
      }
    } catch (err) {
      console.warn('Failed loading fixture', fullPath, err);
    }
  }

  // Return a Quill constructed from the JSON contract
  return Quill.fromJson(JSON.stringify(quillObj));
}

// Small helpers
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 250) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}

// Convert many artifact shapes to Uint8Array
function toUint8ArrayFromArtifactBytes(bytesOrArtifact: any): Uint8Array {
  if (bytesOrArtifact == null) return new Uint8Array();
  // Unwrap { bytes: ... }
  if (typeof bytesOrArtifact === 'object' && 'bytes' in bytesOrArtifact) {
    return toUint8ArrayFromArtifactBytes((bytesOrArtifact as any).bytes);
  }
  if (bytesOrArtifact instanceof Uint8Array) return bytesOrArtifact;
  if (bytesOrArtifact instanceof ArrayBuffer) return new Uint8Array(bytesOrArtifact as ArrayBuffer);
  if (Array.isArray(bytesOrArtifact)) return new Uint8Array(bytesOrArtifact);
  if (typeof bytesOrArtifact === 'string') {
    // Heuristic: base64-ish string? decode, otherwise encode as UTF-8
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

// Compute SHA-256 hex for quick comparisons
async function sha256HexFromArrayBuffer(ab: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', ab);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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
    engine = QuillmarkEngine.create({});
    const quill = await loadUsafMemoQuill();
    engine.registerQuill(quill);
    const defaultMarkdown = await readFixtureFile('usaf_memo/usaf_memo.md');
  markdownInput.value = defaultMarkdown;
  // Make the Download PDF button clickable on load; clicking will render+download on demand
  if (downloadPdfBtn) downloadPdfBtn.disabled = false;
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    return;
  }

  // Auto-render SVG when the markdown changes
  const renderSvg = async () => {
    if (!engine) return;
    try {
      const markdown = markdownInput.value;
      const workflow = engine.loadWorkflow('usaf_memo');
      let glueResult: any = markdown;
      try {
        glueResult = workflow.processGlue(markdown);
        console.log('Glue result (SVG):', glueResult);
      } catch (gErr) {
        console.warn('processGlue warning/error (SVG):', gErr);
      }

      const result = workflow.renderSource(glueResult, { format: 'svg' });
      console.log('Raw render result.artifacts (SVG):', result.artifacts);
      let artifactCandidate: any = result.artifacts;
      if (Array.isArray(result.artifacts)) artifactCandidate = result.artifacts[0];
      else if (result.artifacts && typeof result.artifacts === 'object' && 'main' in result.artifacts) artifactCandidate = result.artifacts.main;

      const normalized = toUint8ArrayFromArtifactBytes(artifactCandidate);
      console.log('Normalized artifact byte length (SVG):', normalized.length);
      const svgText = new TextDecoder().decode(normalized);
      preview.innerHTML = svgText;
    } catch (err) {
      console.error('SVG render error:', err);
      showStatus('SVG render failed', 'error');
    }
  };

  const debouncedRender = debounce(renderSvg, 50);
  markdownInput.addEventListener('input', debouncedRender);

  // Initial SVG render on page load so the preview is populated immediately
  // (run after wiring listeners so status/loading UI is available)
  renderSvg().catch(err => console.error('Initial SVG render failed:', err));

  // Download PDF on demand
  downloadPdfBtn?.addEventListener('click', async () => {
    if (!engine) return;
    showLoading('Rendering PDF...');
    try {
      const markdown = markdownInput.value;
      const workflow = engine.loadWorkflow('usaf_memo');
      let glueResult: any = markdown;
      try {
        glueResult = workflow.processGlue(markdown);
        console.log('Glue result (PDF):', glueResult);
      } catch (gErr) {
        console.warn('processGlue warning/error (PDF):', gErr);
      }

      const result = workflow.renderSource(glueResult, { format: 'pdf' });
      console.log('Raw render result.artifacts (PDF):', result.artifacts);
      let artifactCandidate: any = result.artifacts;
      if (Array.isArray(result.artifacts)) artifactCandidate = result.artifacts[0];
      else if (result.artifacts && typeof result.artifacts === 'object' && 'main' in result.artifacts) artifactCandidate = result.artifacts.main;

      const normalized = toUint8ArrayFromArtifactBytes(artifactCandidate);
      console.log('Normalized artifact byte length (PDF):', normalized.length);
      if (normalized.length === 0) {
        showStatus('No PDF artifact produced', 'error');
        return;
      }

      // Compute SHA from an exact ArrayBuffer of the bytes
      const exactBuffer = normalized.slice().buffer;
      const sha = await sha256HexFromArrayBuffer(exactBuffer);
      console.log('PDF artifact SHA-256 (client):', sha);

  // Create Blob from the exact ArrayBuffer (cast to ArrayBuffer to satisfy TS types)
  const blob = new Blob([exactBuffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'render-output.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showStatus('Download started — check your browser downloads', 'success');
    } catch (err) {
      console.error('PDF render/download error:', err);
      showStatus('PDF generation failed', 'error');
    }
  });
}

init().catch(console.error);
