# Quillmark Web Examples

This directory contains example applications demonstrating how to use `@quillmark-test/web` in various scenarios.

## Vanilla JS Example

The `vanilla-js` example shows how to integrate Quillmark into a plain JavaScript application without any frameworks.

### Features Demonstrated

- Loading a Quill template from a `.zip` file
- Creating and configuring a Quillmark engine
- Real-time markdown editing with live SVG preview
- Debounced rendering for performance
- PDF download functionality
- Error handling and status updates

### Running the Example

1. **Build the library first:**
   ```bash
   cd ../..  # Go to project root
   npm run build:lib
   ```

2. **Serve the example with a local server:**
   ```bash
   # Option 1: Using Python
   python3 -m http.server 8000
   
   # Option 2: Using Node.js http-server
   npx http-server -p 8000
   
   # Option 3: Using the project's preview server
   npm run preview
   ```

3. **Open in browser:**
   Navigate to `http://localhost:8000/examples/vanilla-js/`

### Key Code Patterns

#### Loading a Quill Template

```javascript
import { fromZip } from '@quillmark-test/web';

const response = await fetch('/quills/usaf_memo.zip');
const zipBlob = await response.blob();
const quillJson = await fromZip(zipBlob);
```

#### Creating the Engine

```javascript
import { Quillmark } from '@quillmark-test/web';

const engine = Quillmark.create();
engine.registerQuill('my-template', quillJson);
```

#### Live Preview with Debouncing

```javascript
import { renderToElement, debounce } from '@quillmark-test/web';

const renderPreview = async () => {
  await renderToElement(
    engine,
    'my-template',
    markdownInput.value,
    previewElement,
    { format: 'svg' }
  );
};

const debouncedRender = debounce(renderPreview, 300);
markdownInput.addEventListener('input', debouncedRender);
```

#### PDF Download

```javascript
import { renderToBlob, downloadArtifact } from '@quillmark-test/web';

const blob = await renderToBlob(
  engine,
  'my-template',
  markdown,
  { format: 'pdf' }
);

downloadArtifact(blob, 'output.pdf');
```

## Adding More Examples

To add a new example:

1. Create a new directory: `examples/your-example-name/`
2. Add your example files (HTML, JS, CSS, etc.)
3. Update this README with a description and instructions
4. Consider these topics:
   - React integration
   - Vue integration
   - File upload handling
   - Multiple templates
   - Custom error handling
   - Advanced rendering options

## Tips

- Always build the library before running examples
- Use a proper HTTP server (not file:// protocol) for module imports
- Check the browser console for errors
- Ensure the Quill template `.zip` files are accessible
