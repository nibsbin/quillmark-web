# Quick Start Guide: @quillmark-test/web

Get started with `@quillmark-test/web` in under 5 minutes!

## What is @quillmark-test/web?

A utility package that eliminates boilerplate when loading Quill templates with `@quillmark-test/wasm`. 

**Without it:** 70 lines of complex code  
**With it:** 3 simple lines

## Installation

```bash
npm install @quillmark-test/web @quillmark-test/wasm
```

## Basic Usage (3 Lines!)

```typescript
import { QuillmarkEngine } from '@quillmark-test/wasm';
import { createQuillLoader } from '@quillmark-test/web';

// 1. Create loader
const loader = createQuillLoader();

// 2. Load a Quill
const quill = await loader.loadFromFixtures('usaf_memo');

// 3. Register with engine
const engine = QuillmarkEngine.create({});
engine.registerQuill(quill);

// Done! Now you can render
const workflow = engine.loadWorkflow('usaf_memo');
const result = workflow.renderSource('# Hello', { format: 'pdf' });
```

## Three Ways to Load

### 1. From Fixtures (Most Common)
```typescript
const loader = createQuillLoader();
const quill = await loader.loadFromFixtures('usaf_memo');
```

### 2. From Custom Files
```typescript
const quill = await loader.loadFromFiles('my-template', {
  'Quill.toml': `[Quill]\nname = "my-template"\n...`,
  'glue.typ': '= Title\n\n{{ body }}'
});
```

### 3. From JSON Object
```typescript
const quillObj = {
  name: 'my-quill',
  'Quill.toml': { contents: '...' },
  'glue.typ': { contents: '...' }
};
const quill = loader.loadFromJson(quillObj);
```

## Complete Example

```typescript
import { QuillmarkEngine } from '@quillmark-test/wasm';
import { createQuillLoader } from '@quillmark-test/web';

async function renderDocument() {
  // Load the Quill template
  const loader = createQuillLoader();
  const quill = await loader.loadFromFixtures('usaf_memo');
  
  // Set up the engine
  const engine = QuillmarkEngine.create({});
  engine.registerQuill(quill);
  
  // Prepare markdown content
  const markdown = `
# Official Memorandum

This is an example document.

- Point 1
- Point 2
- Point 3
  `;
  
  // Render to PDF
  const workflow = engine.loadWorkflow('usaf_memo');
  const result = workflow.renderSource(markdown, { format: 'pdf' });
  
  // Download the PDF
  const blob = new Blob([result.artifacts], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.pdf';
  a.click();
}

renderDocument();
```

## Next Steps

1. **See More Examples:** [EXAMPLES.md](EXAMPLES.md) - 10 detailed examples
2. **Compare Before/After:** [BEFORE_AND_AFTER.md](../docs/BEFORE_AND_AFTER.md) - See the code reduction
3. **Read API Docs:** [README.md](README.md) - Full documentation
4. **Understand Design:** [WEB_PACKAGE_DESIGN.md](../docs/WEB_PACKAGE_DESIGN.md) - Architecture

## Common Tasks

### Load Different Template
```typescript
const quill = await loader.loadFromFixtures('letter'); // or 'report', etc.
```

### Custom Configuration
```typescript
const loader = createQuillLoader({
  baseUrl: '/templates/',
  manifestUrl: '/my-manifest.json'
});
```

### Add Binary Files
```typescript
const logoData = new Uint8Array([...]); // your image bytes
const quill = await loader.loadFromFiles('branded', {
  'Quill.toml': '...',
  'glue.typ': '...',
  'assets/logo.png': logoData
});
```

### Error Handling
```typescript
try {
  const quill = await loader.loadFromFixtures('my-template');
  // ... use quill
} catch (error) {
  console.error('Failed to load template:', error);
  // Handle error
}
```

## TypeScript Support

Full type safety included:

```typescript
import { 
  createQuillLoader, 
  QuillLoaderOptions,
  QuillJsonObject 
} from '@quillmark-test/web';

const options: QuillLoaderOptions = {
  baseUrl: '/templates/'
};

const loader = createQuillLoader(options);
```

## Troubleshooting

**Problem:** Template not found  
**Solution:** Check the template name matches a fixture set in the manifest

**Problem:** Binary files not loading  
**Solution:** Ensure file extension is in `binaryExtensions` set

**Problem:** CORS errors  
**Solution:** Serve fixtures from same origin or configure CORS

## That's It!

You're ready to use `@quillmark-test/web`. It's that simple!

For questions or issues, refer to the [full documentation](README.md).
