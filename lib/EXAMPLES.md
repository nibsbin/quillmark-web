# @quillmark-test/web Usage Examples

This document provides practical examples of using the `@quillmark-test/web` package.

## Example 1: Loading from Fixtures (Simplest)

This is the most common use case - loading a Quill from the fixtures package:

```typescript
import { QuillmarkEngine } from '@quillmark-test/wasm';
import { createQuillLoader } from '@quillmark-test/web';

async function initWithFixtures() {
  // Create loader with default settings
  const loader = createQuillLoader();
  
  // Load the usaf_memo Quill from fixtures
  const quill = await loader.loadFromFixtures('usaf_memo');
  
  // Use with the WASM engine
  const engine = QuillmarkEngine.create({});
  engine.registerQuill(quill);
  
  // Now you can render!
  const workflow = engine.loadWorkflow('usaf_memo');
  const result = workflow.renderSource('# Hello World', { format: 'pdf' });
}
```

## Example 2: Loading from Custom Files

Build a Quill from your own template files:

```typescript
import { createQuillLoader } from '@quillmark-test/web';

async function createCustomQuill() {
  const loader = createQuillLoader();
  
  // Define your Quill files
  const files = {
    'Quill.toml': `
      [Quill]
      name = "my-template"
      backend = "typst"
      glue = "glue.typ"
    `,
    'glue.typ': `
      = {{ title }}
      
      {{ body }}
      
      ---
      Generated on {{ date }}
    `,
    'styles/theme.typ': `
      #set page(
        paper: "us-letter",
        margin: (x: 1in, y: 1in)
      )
    `
  };
  
  const quill = await loader.loadFromFiles('my-template', files);
  return quill;
}
```

## Example 3: Loading with Binary Assets

Include images, fonts, and other binary files:

```typescript
import { createQuillLoader } from '@quillmark-test/web';

async function createQuillWithAssets() {
  const loader = createQuillLoader();
  
  // Fetch binary assets
  const logoResponse = await fetch('/assets/logo.png');
  const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  
  const fontResponse = await fetch('/assets/custom-font.otf');
  const fontBytes = new Uint8Array(await fontResponse.arrayBuffer());
  
  const files = {
    'Quill.toml': `
      [Quill]
      name = "branded-template"
      backend = "typst"
      glue = "glue.typ"
    `,
    'glue.typ': `
      #image("assets/logo.png", width: 2in)
      
      #set text(font: "CustomFont")
      
      = {{ title }}
      {{ body }}
    `,
    'assets/logo.png': logoBytes,
    'assets/custom-font.otf': fontBytes
  };
  
  const quill = await loader.loadFromFiles('branded-template', files);
  return quill;
}
```

## Example 4: Custom Loader Configuration

Configure the loader for different environments:

```typescript
import { createQuillLoader } from '@quillmark-test/web';

// Development environment - load from local fixtures
const devLoader = createQuillLoader({
  baseUrl: '/node_modules/@quillmark-test/fixtures/resources/',
  manifestUrl: '/fixtures-manifest.json'
});

// Production environment - load from CDN
const prodLoader = createQuillLoader({
  baseUrl: 'https://cdn.example.com/quill-templates/',
  manifestUrl: 'https://cdn.example.com/manifest.json',
  binaryExtensions: new Set(['.otf', '.ttf', '.png', '.jpg', '.woff', '.woff2'])
});

// Use the appropriate loader
const loader = process.env.NODE_ENV === 'production' ? prodLoader : devLoader;
const quill = await loader.loadFromFixtures('usaf_memo');
```

## Example 5: Loading from a JSON Object

If you already have a Quill JSON object (e.g., from an API):

```typescript
import { createQuillLoader } from '@quillmark-test/web';

async function loadFromApi() {
  const loader = createQuillLoader();
  
  // Fetch Quill JSON from API
  const response = await fetch('/api/templates/my-template');
  const quillJson = await response.json();
  
  // Load directly from the JSON object
  const quill = loader.loadFromJson(quillJson);
  
  return quill;
}
```

## Example 6: Dynamic Template Selection

Let users choose from multiple templates:

```typescript
import { QuillmarkEngine } from '@quillmark-test/wasm';
import { createQuillLoader } from '@quillmark-test/web';

async function loadUserSelectedTemplate(templateName: string) {
  const loader = createQuillLoader();
  const engine = QuillmarkEngine.create({});
  
  try {
    // Load the user-selected template
    const quill = await loader.loadFromFixtures(templateName);
    engine.registerQuill(quill);
    
    console.log(`Loaded template: ${templateName}`);
    return engine;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    
    // Fall back to default template
    const defaultQuill = await loader.loadFromFixtures('usaf_memo');
    engine.registerQuill(defaultQuill);
    return engine;
  }
}

// Usage
const engine = await loadUserSelectedTemplate('custom_memo');
```

## Example 7: Multiple Templates in One Engine

Register multiple Quills in a single engine:

```typescript
import { QuillmarkEngine } from '@quillmark-test/wasm';
import { createQuillLoader } from '@quillmark-test/web';

async function loadMultipleTemplates() {
  const loader = createQuillLoader();
  const engine = QuillmarkEngine.create({});
  
  // Load multiple templates
  const templates = ['usaf_memo', 'letter', 'report'];
  
  for (const templateName of templates) {
    try {
      const quill = await loader.loadFromFixtures(templateName);
      engine.registerQuill(quill);
      console.log(`Registered: ${templateName}`);
    } catch (error) {
      console.warn(`Skipped ${templateName}:`, error);
    }
  }
  
  return engine;
}
```

## Example 8: Progressive Loading with Status Updates

Show loading progress to users:

```typescript
import { createQuillLoader } from '@quillmark-test/web';

async function loadWithProgress(
  templateName: string, 
  onProgress: (status: string) => void
) {
  const loader = createQuillLoader();
  
  onProgress('Initializing loader...');
  
  onProgress(`Loading template: ${templateName}`);
  const quill = await loader.loadFromFixtures(templateName);
  
  onProgress('Template loaded successfully!');
  
  return quill;
}

// Usage in a UI
loadWithProgress('usaf_memo', (status) => {
  document.getElementById('status').textContent = status;
});
```

## Example 9: TypeScript Type Safety

Leverage full TypeScript support:

```typescript
import { createQuillLoader, QuillLoaderOptions, QuillJsonObject } from '@quillmark-test/web';
import { Quill } from '@quillmark-test/wasm';

// Typed configuration
const config: QuillLoaderOptions = {
  baseUrl: '/templates/',
  manifestUrl: '/manifest.json',
  binaryExtensions: new Set(['.png', '.jpg'])
};

const loader = createQuillLoader(config);

// Typed Quill object
const quillObj: QuillJsonObject = {
  name: 'typed-template',
  'Quill.toml': { contents: '...' },
  'glue.typ': { contents: '...' }
};

const quill: Quill = loader.loadFromJson(quillObj);
```

## Example 10: Error Handling Best Practices

Robust error handling for production:

```typescript
import { createQuillLoader } from '@quillmark-test/web';
import { QuillmarkEngine } from '@quillmark-test/wasm';

async function safeLoadTemplate(templateName: string) {
  const loader = createQuillLoader();
  
  try {
    const quill = await loader.loadFromFixtures(templateName);
    const engine = QuillmarkEngine.create({});
    engine.registerQuill(quill);
    
    return { success: true, engine };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No manifest entry')) {
        return { 
          success: false, 
          error: `Template "${templateName}" not found` 
        };
      } else if (error.message.includes('Failed to load')) {
        return { 
          success: false, 
          error: 'Network error while loading template' 
        };
      }
    }
    
    return { 
      success: false, 
      error: 'Unknown error occurred' 
    };
  }
}

// Usage
const result = await safeLoadTemplate('usaf_memo');
if (result.success) {
  console.log('Engine ready:', result.engine);
} else {
  console.error('Failed:', result.error);
}
```

## Key Takeaways

1. **Simple fixture loading**: Just call `loader.loadFromFixtures(name)`
2. **Custom files**: Use `loader.loadFromFiles(name, files)` with string or Uint8Array contents
3. **JSON objects**: Direct loading with `loader.loadFromJson(obj)`
4. **Configuration**: Customize URLs and binary extensions via options
5. **Type safety**: Full TypeScript support for all APIs
6. **Error handling**: Descriptive error messages for common issues

For more details, see the [main README](README.md) and [package design document](../docs/WEB_PACKAGE_DESIGN.md).
