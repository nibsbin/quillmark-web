# @quillmark-test/web Package Design

## Problem Statement

Loading Quill templates in web applications currently involves significant boilerplate code. Developers need to:

1. Fetch and parse manifest files
2. Implement binary vs text file detection logic
3. Build nested JSON structures with complex path manipulation
4. Convert files to the correct format (number arrays for binary, strings for text)
5. Understand the Quill JSON contract in detail

This friction slows down integration and makes the code harder to maintain.

## Solution: @quillmark-test/web

The `@quillmark-test/web` package provides a simple, high-level API that encapsulates all the boilerplate, making it trivial to load Quills from various sources.

## Key Benefits

### 1. Reduced Boilerplate

**Before:**
- ~70 lines of code to load a Quill from fixtures
- Complex path insertion logic
- Manual binary/text detection
- Manifest parsing and error handling

**After:**
```typescript
import { createQuillLoader } from '@quillmark-test/web';

const loader = createQuillLoader();
const quill = await loader.loadFromFixtures('usaf_memo');
```

Just 3 lines of code!

### 2. Multiple Loading Strategies

The package supports three different ways to load Quills:

#### From Fixtures
```typescript
const quill = await loader.loadFromFixtures('usaf_memo');
```

#### From Custom Files
```typescript
const quill = await loader.loadFromFiles('my-template', {
  'Quill.toml': '...',
  'glue.typ': '...',
  'assets/logo.png': new Uint8Array([...])
});
```

#### From JSON Object
```typescript
const quillObj = { name: 'my-quill', ... };
const quill = loader.loadFromJson(quillObj);
```

### 3. Type Safety

Full TypeScript support with exported interfaces:
- `QuillLoaderOptions` - Configuration options
- `QuillFile` - File structure in JSON contract
- `QuillJsonObject` - Root object structure

### 4. Flexible Configuration

Customize behavior while keeping simple defaults:

```typescript
const loader = createQuillLoader({
  baseUrl: '/custom/path/',
  manifestUrl: '/custom-manifest.json',
  binaryExtensions: new Set(['.otf', '.png', '.custom'])
});
```

### 5. Error Handling

Built-in error handling with descriptive messages:
- Missing manifest entries
- Failed file fetches
- Invalid paths

## Architecture

### Core Class: QuillLoader

The `QuillLoader` class encapsulates all loading logic:

```
QuillLoader
├── loadFromFixtures(name)     → Quill
├── loadFromFiles(name, files) → Quill
└── loadFromJson(quillObj)     → Quill
```

Internal methods handle:
- Manifest loading and parsing
- File fetching (text and binary)
- Path insertion into nested structures
- JSON contract building

### Factory Function

`createQuillLoader()` provides a convenient way to create instances with custom options.

## Impact on Developer Experience

### Learning Curve
- New developers don't need to understand the Quill JSON contract details
- No need to implement complex file loading logic
- Focus on using Quills, not loading them

### Maintainability
- Centralized loading logic
- Single source of truth for JSON contract compliance
- Easy to update when contract evolves

### Testing
- Mock the loader easily
- Test different loading scenarios independently
- No need to test boilerplate in every app

## Compatibility

The package:
- ✅ Follows the canonical Quill JSON contract
- ✅ Works with `@quillmark-test/wasm` v0.0.34+
- ✅ Supports both ES modules and TypeScript
- ✅ Has zero runtime dependencies (except peer dep on wasm)
- ✅ Works in all modern browsers

## Future Enhancements

Potential additions:
1. **Caching** - Cache loaded Quills to avoid re-fetching
2. **Progress callbacks** - Report loading progress for large templates
3. **Validation** - Pre-validate files before building JSON
4. **Streaming** - Stream large binary files instead of loading all at once
5. **Node.js support** - Load Quills from filesystem in Node environments

## Conclusion

The `@quillmark-test/web` package dramatically reduces friction for frontend developers integrating `@quillmark-test/wasm`. By abstracting away the complex boilerplate and providing a clean, type-safe API, it enables developers to focus on building features rather than wrestling with infrastructure code.
