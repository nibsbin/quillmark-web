# Testing Differences: quillmark-web vs quillmark-wasm

This document outlines the differences between the testing approach in `quillmark-web` and the validated patterns from `quillmark-wasm` end-to-end tests.

## Overview

The `quillmark-wasm` package includes comprehensive end-to-end tests that validate the complete workflow for rendering markdown and quills. We've examined these tests and documented what `quillmark-web` does differently.

## Source References

The `quillmark-wasm` tests analyzed are from the [nibsbin/quillmark](https://github.com/nibsbin/quillmark) repository:
- `quillmark-wasm/basic.test.js` - Core WASM API functionality tests
- `quillmark-wasm/tests/usaf_memo.test.js` - Smoke test for Typst backend
- `quillmark-wasm/tests/usaf_form_8.test.js` - Smoke test for Acroform backend
- `quillmark-wasm/tests/quillLoader.js` - Helper for loading Quill directories

## Key Differences

### 1. Test Scope

**quillmark-wasm:**
- Tests the complete 4-step workflow: parse → register → getInfo → render
- Validates data types (ensures plain objects, not Maps)
- Tests both positive and negative cases (error handling)
- Includes smoke tests comparing WASM output to native cargo output
- Tests multiple backends (Typst, Acroform)

**quillmark-web:**
- Tests utility functions (fromZip, exportToBlob, etc.) in isolation
- Heavy use of mocks (mocks the entire Quillmark class)
- Does NOT test the actual WASM rendering workflow end-to-end
- Does NOT validate data types returned from WASM
- No smoke tests comparing outputs

### 2. Workflow Testing

**quillmark-wasm basic.test.js pattern:**
```javascript
// Complete workflow test
it('should complete full workflow: parse → register → render', () => {
  // Step 1: Parse markdown
  const parsed = Quillmark.parseMarkdown(TEST_MARKDOWN)
  expect(parsed).toBeDefined()
  
  // Step 2: Create engine and register quill
  const engine = new Quillmark()
  engine.registerQuill('test_quill', TEST_QUILL)
  
  // Step 3: Get quill info
  const info = engine.getQuillInfo('test_quill')
  expect(info.supportedFormats).toContain('pdf')
  
  // Step 4: Render to PDF
  const result = engine.render(parsed, { format: 'pdf' })
  
  expect(result).toBeDefined()
  expect(result.artifacts).toBeDefined()
  expect(result.artifacts[0].bytes).toBeDefined()
  expect(result.artifacts[0].mimeType).toBe('application/pdf')
})
```

**quillmark-web exporters.test.ts pattern:**
```typescript
// Mock-based test - does NOT test actual WASM
vi.mock('@quillmark-test/wasm', () => ({
  Quillmark: class {
    static parseMarkdown = vi.fn((_markdown: string) => ({
      fields: {},
      quillTag: 'test-quill'
    }));
    render = vi.fn();
  }
}));

const engine = createMockEngine(pdfBytes);
const blob = await exportToBlob(engine, markdownSample, { format: 'pdf' });
```

### 3. Data Type Validation

**quillmark-wasm:**
Explicitly validates that WASM returns plain JavaScript objects, not Maps:
```javascript
it('should return all data as plain objects', () => {
  const parsed = Quillmark.parseMarkdown(TEST_MARKDOWN)
  
  // Validate fields is plain object
  expect(parsed.fields instanceof Map).toBe(false)
  expect(parsed.fields instanceof Object).toBe(true)
  
  const info = engine.getQuillInfo('test_quill')
  
  // Validate metadata is plain object
  expect(info.metadata instanceof Map).toBe(false)
  expect(info.metadata instanceof Object).toBe(true)
  
  // Validate fieldSchemas is plain object
  expect(info.fieldSchemas instanceof Map).toBe(false)
  expect(info.fieldSchemas instanceof Object).toBe(true)
})
```

**quillmark-web:**
Does NOT validate data types - relies on mocks that don't represent actual WASM behavior.

### 4. Error Handling

**quillmark-wasm:**
Tests multiple error scenarios:
```javascript
it('should handle error: unregistered quill', () => {
  const engine = new Quillmark()
  expect(() => {
    engine.getQuillInfo('nonexistent_quill')
  }).toThrow()
})

it('should handle error: invalid markdown', () => {
  const badMarkdown = `---
title: Test
QUILL: test_quill
this is not valid yaml
---
# Content`
  
  expect(() => {
    Quillmark.parseMarkdown(badMarkdown)
  }).toThrow()
})
```

**quillmark-web:**
Limited error testing - only tests fromZip errors (invalid zip, missing Quill.toml).

### 5. Quill Loading

**quillmark-wasm quillLoader.js:**
Loads Quills from filesystem directories:
```javascript
function loadDirectory(dirPath) {
  const result = {};
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      result[entry.name] = loadDirectory(fullPath);
    } else if (entry.isFile()) {
      const isBinary = /\.(png|jpg|jpeg|gif|pdf|woff|woff2|ttf|otf)$/i.test(entry.name);
      if (isBinary) {
        result[entry.name] = { contents: Array.from(buffer) };
      } else {
        result[entry.name] = { contents: text };
      }
    }
  }
  return result;
}
```

**quillmark-web loaders.ts:**
Loads Quills from zip files (browser-oriented approach):
```typescript
export async function fromZip(zipFile: File | Blob | ArrayBuffer): Promise<Record<string, any>> {
  // Uses fflate to unzip
  // Converts nested paths to nested objects
  // Handles binary detection similarly
  // Handles single top-level folder stripping
}
```

**Difference:** The approach is fundamentally different due to environment (Node.js vs browser), but both produce the same Quill JSON format.

### 6. Asset Handling

**quillmark-wasm:**
Tests that assets can be passed as plain objects:
```javascript
it('should accept assets as plain JavaScript objects', () => {
  const assets = {
    'logo.png': [137, 80, 78, 71],
    'font.ttf': [0, 1, 2, 3]
  }
  
  const result = engine.render(parsed, { 
    format: 'pdf',
    assets: assets
  })
  
  expect(result).toBeDefined()
})
```

**quillmark-web:**
Does NOT test asset handling in the workflow.

### 7. Smoke Tests

**quillmark-wasm:**
Includes comprehensive smoke tests that:
- Generate reference PDFs using native cargo
- Compare WASM output with cargo output
- Verify byte-for-byte identity (Acroform) or functional identity (Typst)
- Validate PDF structure (headers, metadata, size)

**quillmark-web:**
No smoke tests comparing actual rendered outputs.

## Recommendations

Based on the analysis, `quillmark-web` tests should:

1. ✅ **Add End-to-End Workflow Tests**: Test the complete parse → register → getInfo → render workflow without mocks
2. ✅ **Validate Data Types**: Ensure WASM returns plain objects, not Maps
3. ✅ **Test Error Scenarios**: Invalid markdown, unregistered quills, render errors
4. ✅ **Test Multiple Formats**: PDF, SVG, and TXT rendering
5. ✅ **Test Asset Handling**: Verify assets work correctly in render options
6. ❌ **Smoke Tests**: Not applicable - would require cargo/rust toolchain in CI (browser library doesn't need to verify WASM implementation)

## What quillmark-web Does Better

1. **Browser-Specific Utilities**: Tests zip file loading (browser use case)
2. **Nested Directory Handling**: Tests single top-level folder stripping
3. **Export Helpers**: Tests convenience functions like exportToBlob, exportToDataUrl
4. **UI Integration**: Tests preview and downloadDocument helpers

## Summary

The main difference is that `quillmark-wasm` tests validate the WASM implementation itself, while `quillmark-web` currently only tests utility wrappers around it using mocks. To be more robust, `quillmark-web` should add end-to-end tests that exercise the actual WASM API to ensure the utilities work correctly with real WASM behavior.
