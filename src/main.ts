import { QuillmarkEngine, Quill } from '@quillmark-test/wasm';

// Helper to read file as text from fixtures
async function readFixtureFile(path: string): Promise<string> {
  const response = await fetch(`/node_modules/@quillmark-test/fixtures/resources/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }
  return await response.text();
}

// Helper to read file as bytes from fixtures
async function readFixtureFileBytes(path: string): Promise<number[]> {
  const response = await fetch(`/node_modules/@quillmark-test/fixtures/resources/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
}

// Load the usaf_memo Quill using the JSON contract
async function loadUsafMemoQuill(): Promise<Quill> {
  // Build the JSON structure following the contract
  const quillObj: any = {
    name: 'usaf_memo',
    'Quill.toml': {
      contents: await readFixtureFile('usaf_memo/Quill.toml')
    },
    'glue.typ': {
      contents: await readFixtureFile('usaf_memo/glue.typ')
    },
    '.quillignore': {
      contents: await readFixtureFile('usaf_memo/.quillignore')
    },
    'usaf_memo.md': {
      contents: await readFixtureFile('usaf_memo/usaf_memo.md')
    },
    'packages': {
      'tonguetoquill-usaf-memo': {
        'LICENSE': {
          contents: await readFixtureFile('usaf_memo/packages/tonguetoquill-usaf-memo/LICENSE')
        },
        'typst.toml': {
          contents: await readFixtureFile('usaf_memo/packages/tonguetoquill-usaf-memo/typst.toml')
        },
        'src': {
          'lib.typ': {
            contents: await readFixtureFile('usaf_memo/packages/tonguetoquill-usaf-memo/src/lib.typ')
          },
          'utils.typ': {
            contents: await readFixtureFile('usaf_memo/packages/tonguetoquill-usaf-memo/src/utils.typ')
          }
        }
      }
    },
    'assets': {
      'CopperplateCC-Heavy.otf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/CopperplateCC-Heavy.otf')
      },
      'DejaVuSansMono.ttf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/DejaVuSansMono.ttf')
      },
      'DejaVuSansMono-Oblique.ttf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/DejaVuSansMono-Oblique.ttf')
      },
      'DejaVuSansMono-Bold.ttf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/DejaVuSansMono-Bold.ttf')
      },
      'DejaVuSansMono-BoldOblique.ttf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/DejaVuSansMono-BoldOblique.ttf')
      },
      'dod_seal.gif': {
        contents: await readFixtureFileBytes('usaf_memo/assets/dod_seal.gif')
      },
      'NimbusRomNo9L-Med.otf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/NimbusRomNo9L-Med.otf')
      },
      'NimbusRomNo9L-Reg.otf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/NimbusRomNo9L-Reg.otf')
      },
      'NimbusRomNo9L-MedIta.otf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/NimbusRomNo9L-MedIta.otf')
      },
      'NimbusRomNo9L-RegIta.otf': {
        contents: await readFixtureFileBytes('usaf_memo/assets/NimbusRomNo9L-RegIta.otf')
      }
    }
  };

  // Convert to JSON string and create Quill
  return Quill.fromJson(JSON.stringify(quillObj));
}

// Initialize the playground
async function init() {
  const markdownInput = document.getElementById('markdown-input') as HTMLTextAreaElement;
  const formatSelect = document.getElementById('format') as HTMLSelectElement;
  const renderBtn = document.getElementById('render-btn') as HTMLButtonElement;
  const preview = document.getElementById('preview') as HTMLDivElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  let engine: QuillmarkEngine | null = null;

  // Show status message
  function showStatus(message: string, type: 'info' | 'success' | 'error') {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
  }

  // Show loading indicator
  function showLoading(message: string) {
    statusDiv.className = 'status info';
    statusDiv.innerHTML = `${message} <span class="loading"></span>`;
  }

  try {
    showLoading('Loading Quillmark engine and usaf_memo template...');

    // Create engine and load Quill
    engine = QuillmarkEngine.create({});
    const quill = await loadUsafMemoQuill();
    engine.registerQuill(quill);

    // Load default markdown
    const defaultMarkdown = await readFixtureFile('usaf_memo/usaf_memo.md');
    markdownInput.value = defaultMarkdown;

    showStatus('Ready! Edit the markdown and click Render.', 'success');
    renderBtn.disabled = false;
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
    return;
  }

  // Render button handler
  renderBtn.addEventListener('click', async () => {
    if (!engine) return;

    try {
      showLoading('Rendering...');
      renderBtn.disabled = true;

      const markdown = markdownInput.value;
      const format = formatSelect.value;

      // Create workflow and render
      const workflow = engine.loadWorkflow('usaf_memo');
      
      // Log for debugging
      console.log('Rendering with format:', format);
      console.log('Supported formats:', workflow.supportedFormats);
      
      const result = workflow.render(markdown, { format });

      // Display result
      preview.innerHTML = '';
      
      if (format === 'pdf') {
        // For PDF, create a blob and display in iframe
        const blob = new Blob([new Uint8Array(result.artifacts.main)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        preview.appendChild(iframe);
      } else if (format === 'svg') {
        // For SVG, display directly
        const svgText = new TextDecoder().decode(new Uint8Array(result.artifacts.main));
        preview.innerHTML = svgText;
      }

      showStatus('Rendering complete!', 'success');
    } catch (error) {
      console.error('Rendering error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'null');
      
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = String(error.message);
        } else if ('kind' in error) {
          errorMessage = `${error.kind}: ${error.message || JSON.stringify(error)}`;
        } else {
          errorMessage = JSON.stringify(error, null, 2);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      
      preview.innerHTML = `<div class="error">${errorMessage}</div>`;
      showStatus(`Error: ${errorMessage}`, 'error');
    } finally {
      renderBtn.disabled = false;
    }
  });
}

// Start the app
init().catch(console.error);
