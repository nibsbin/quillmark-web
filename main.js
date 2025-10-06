import { QuillmarkEngine, Quill } from '@quillmark-test/wasm';

// DOM elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const renderBtn = document.getElementById('renderBtn');

// State
let engine = null;
let workflow = null;

// Load usaf_memo template files
async function loadUsafMemoTemplate() {
    const baseUrl = '/node_modules/@quillmark-test/fixtures/resources/usaf_memo';
    
    // Files to load from the usaf_memo template
    const filesToLoad = [
        'Quill.toml',
        'glue.typ',
        'usaf_memo.md',
        'assets/CopperplateCC-Heavy.otf',
        'assets/DejaVuSansMono.ttf',
        'assets/DejaVuSansMono-Oblique.ttf',
        'assets/DejaVuSansMono-Bold.ttf',
        'assets/DejaVuSansMono-BoldOblique.ttf',
        'assets/dod_seal.gif',
        'assets/NimbusRomNo9L-Med.otf',
        'assets/NimbusRomNo9L-Reg.otf',
        'assets/NimbusRomNo9L-MedIta.otf',
        'assets/NimbusRomNo9L-RegIta.otf',
        'packages/tonguetoquill-usaf-memo/LICENSE',
        'packages/tonguetoquill-usaf-memo/typst.toml',
        'packages/tonguetoquill-usaf-memo/src/lib.typ',
        'packages/tonguetoquill-usaf-memo/src/utils.typ'
    ];

    const files = {};
    let sampleMarkdown = '';

    for (const file of filesToLoad) {
        const url = `${baseUrl}/${file}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Failed to load ${file}:`, response.statusText);
                continue;
            }
            
            const bytes = new Uint8Array(await response.arrayBuffer());
            
            // Store in files map with appropriate paths for Typst
            // Typst expects packages to be in @preview/package-name/version/ structure
            let filePath = file;
            if (file.startsWith('packages/tonguetoquill-usaf-memo/')) {
                // Map package files to Typst's expected path structure
                const packagePath = file.replace('packages/tonguetoquill-usaf-memo/', '');
                filePath = `@preview/tonguetoquill-usaf-memo/0.1.1/${packagePath}`;
            }
            
            files[filePath] = bytes;
            console.log(`Loaded ${file} as ${filePath}: ${bytes.length} bytes`);
            
            // If it's the sample markdown, decode it for the editor
            if (file === 'usaf_memo.md') {
                sampleMarkdown = new TextDecoder().decode(bytes);
            }
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    console.log(`Total files loaded: ${Object.keys(files).length}`);
    console.log('File paths:', Object.keys(files));
    console.log('Preview namespace files:', Object.keys(files).filter(k => k.startsWith('@preview')));
    return { files, sampleMarkdown };
}

// Initialize the Quillmark engine and workflow
async function initialize() {
    try {
        preview.innerHTML = '<div class="loading">Loading USAF Memo template</div>';
        
        // Load template files
        const { files, sampleMarkdown } = await loadUsafMemoTemplate();
        
        if (files.size === 0) {
            throw new Error('Failed to load any template files');
        }

        // Create the engine
        engine = QuillmarkEngine.create({});
        
        // Create metadata for the quill
        const metadata = {
            name: 'usaf_memo',
            backend: 'typst'
        };

        // Create the Quill from files
        const quill = Quill.fromFiles(files, metadata);
        
        // Register the quill
        engine.registerQuill(quill);
        
        // Load the workflow
        workflow = engine.loadWorkflow('usaf_memo');
        
        // Set the sample markdown in the editor
        editor.value = sampleMarkdown;
        
        // Enable the render button
        renderBtn.disabled = false;
        
        // Initial render
        await renderMarkdown();
        
    } catch (error) {
        console.error('Initialization error:', error);
        preview.innerHTML = `<div class="error">Initialization failed:\n${error.message}\n\n${error.stack || ''}</div>`;
        renderBtn.disabled = true;
    }
}

// Render markdown to SVG
async function renderMarkdown() {
    if (!workflow) {
        preview.innerHTML = '<div class="error">Workflow not initialized</div>';
        return;
    }

    try {
        renderBtn.disabled = true;
        preview.innerHTML = '<div class="loading">Rendering</div>';
        
        const markdown = editor.value;
        
        // Render with SVG format
        const result = workflow.render(markdown, { format: 'svg' });
        
        // Check for warnings
        if (result.warnings && result.warnings.length > 0) {
            console.warn('Rendering warnings:', result.warnings);
        }
        
        // Get the SVG artifact
        if (result.artifacts && result.artifacts.length > 0) {
            const svgArtifact = result.artifacts[0];
            const svgContent = new TextDecoder().decode(svgArtifact.bytes);
            
            // Display the SVG
            preview.innerHTML = svgContent;
        } else {
            preview.innerHTML = '<div class="error">No artifacts generated</div>';
        }
        
    } catch (error) {
        console.error('Rendering error:', error);
        
        let errorMessage = `Rendering failed:\n${error.message || error}`;
        
        // Check for diagnostics
        if (error.diagnostics && error.diagnostics.length > 0) {
            errorMessage += '\n\nDiagnostics:\n';
            error.diagnostics.forEach(diag => {
                console.error('Diagnostic:', diag);
                errorMessage += `\n${diag.severity}: ${diag.message}`;
                if (diag.location) {
                    errorMessage += `\n  at ${diag.location.file}:${diag.location.line}:${diag.location.column}`;
                }
            });
        }
        
        preview.innerHTML = `<div class="error">${errorMessage}</div>`;
    } finally {
        renderBtn.disabled = false;
    }
}

// Event listeners
renderBtn.addEventListener('click', renderMarkdown);

// Auto-render on Ctrl+Enter or Cmd+Enter
editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        renderMarkdown();
    }
});

// Initialize on load
initialize();
