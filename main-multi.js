import { QuillmarkEngine, Quill } from '@quillmark-test/wasm';

// DOM elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const renderBtn = document.getElementById('renderBtn');
const templateSelector = document.getElementById('templateSelector');

// State
let engine = null;
let workflow = null;
let currentTemplate = 'taro';

// Load taro template files
async function loadTaroTemplate() {
    const baseUrl = '/node_modules/@quillmark-test/fixtures/resources/taro';
    
    const filesToLoad = [
        'Quill.toml',
        'glue.typ',
        'taro.md'
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
            files[file] = bytes;
            
            if (file === 'taro.md') {
                sampleMarkdown = new TextDecoder().decode(bytes);
            }
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    return { files, sampleMarkdown, name: 'taro' };
}

// Load usaf_memo template files
async function loadUsafMemoTemplate() {
    const baseUrl = '/node_modules/@quillmark-test/fixtures/resources/usaf_memo';
    
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
            
            if (file === 'usaf_memo.md') {
                sampleMarkdown = new TextDecoder().decode(bytes);
            }
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }

    return { files, sampleMarkdown, name: 'usaf_memo' };
}

// Initialize the Quillmark engine and workflow
async function initialize() {
    try {
        preview.innerHTML = '<div class="loading">Loading template</div>';
        
        // Create the engine if it doesn't exist
        if (!engine) {
            engine = QuillmarkEngine.create({});
        }
        
        // Load template files based on selection
        const templateData = currentTemplate === 'taro' 
            ? await loadTaroTemplate()
            : await loadUsafMemoTemplate();
        
        if (Object.keys(templateData.files).length === 0) {
            throw new Error('Failed to load any template files');
        }

        // Create metadata for the quill
        const metadata = {
            name: templateData.name,
            backend: 'typst'
        };

        // Create the Quill from files
        const quill = Quill.fromFiles(templateData.files, metadata);
        
        // Register the quill
        engine.registerQuill(quill);
        
        // Load the workflow
        workflow = engine.loadWorkflow(templateData.name);
        
        // Set the sample markdown in the editor
        editor.value = templateData.sampleMarkdown;
        
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
            
            // The bytes are returned as an array from WASM, need to convert to Uint8Array
            let svgContent;
            if (typeof svgArtifact.bytes === 'string') {
                svgContent = svgArtifact.bytes;
            } else if (svgArtifact.bytes instanceof Uint8Array) {
                svgContent = new TextDecoder().decode(svgArtifact.bytes);
            } else if (Array.isArray(svgArtifact.bytes)) {
                // Convert array to Uint8Array then decode
                svgContent = new TextDecoder().decode(new Uint8Array(svgArtifact.bytes));
            } else {
                // Try converting to Uint8Array first
                svgContent = new TextDecoder().decode(new Uint8Array(svgArtifact.bytes));
            }
            
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

// Template selector
if (templateSelector) {
    templateSelector.addEventListener('change', (e) => {
        currentTemplate = e.target.value;
        initialize();
    });
}

// Auto-render on Ctrl+Enter or Cmd+Enter
editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        renderMarkdown();
    }
});

// Initialize on load
initialize();
