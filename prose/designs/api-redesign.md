# API Redesign for @quillmark/web-utils

## Current State Analysis

### Current API Problems

The current API has several semantic inconsistencies and design issues:

1. **Inconsistent Function Naming**
   - `exportToBlob()`, `exportToDataUrl()` - uses "export" prefix
   - `preview()` - no prefix
   - `exportPreview()` - returns RenderResult, not exported artifact
   - `downloadDocument()` - uses "download" prefix
   - Mixing of verbs: export, preview, download

2. **Parameter Ordering Inconsistency**
   - `exportToBlob(engine, markdown, options?)` - no quillName
   - `downloadDocument(engine, markdown, outputFilename, options?)` - filename before options
   - Functions implicitly extract quillName from markdown parsing, making the API less explicit

3. **Unclear Function Purposes**
   - `exportPreview()` returns RenderResult but name suggests exporting
   - `preview()` modifies DOM but name suggests it returns something
   - Overlap between `exportPreview()` and other export functions

4. **Hidden Dependencies**
   - All export functions internally call `Quillmark.parseMarkdown()` 
   - Users can't reuse parsed documents across multiple renders
   - Inefficient for rendering the same markdown multiple times in different formats

5. **Type Confusion**
   - `downloadDocument()` has outputFilename as required parameter
   - `exportToBlob()` doesn't need filename but returns blob that could be downloaded
   - Blob creation and download triggering are conflated

## Proposed API Design

### Design Principles

1. **Semantic Clarity**: Function names should clearly indicate their purpose and side effects
2. **Consistent Naming**: Use consistent verbs throughout the API
3. **Separation of Concerns**: Separate rendering from export/download operations
4. **Explicit Parameters**: Make important parameters explicit rather than derived
5. **Composability**: Allow users to compose operations for efficiency

### New API Structure

```typescript
// Core rendering function - the foundation
render(engine: Quillmark, markdown: string, options?: RenderOptions): RenderResult

// Conversion functions - pure transformations
toBlob(result: RenderResult): Blob
toDataUrl(result: RenderResult): Promise<string>
toElement(result: RenderResult, element: HTMLElement): void

// Convenience functions - side effects
download(result: RenderResult, filename: string): void
```

### Rationale

1. **Single `render()` function**
   - All rendering goes through one entry point
   - Handles markdown parsing internally
   - Returns RenderResult for further operations
   - Clear semantic: "render markdown to get a result"

2. **Conversion functions take RenderResult**
   - Pure functions with no side effects
   - Composable and reusable
   - Clear semantic: "convert result to format X"
   - Enables rendering once, exporting many times

3. **`download()` is a utility**
   - Triggers browser download (side effect)
   - Works with RenderResult for consistency
   - Determines MIME type and default filename from result

4. **Removed `preview()`**
   - Replaced by `toElement()` which is clearer
   - `toElement()` explicitly shows DOM mutation
   - Users can combine `render()` + `toElement()` for preview

5. **Removed `exportPreview()` and `downloadDocument()`**
   - Functionality covered by `render()` + conversion functions
   - Eliminates confusion about what these functions do

### API Comparison

#### Old API
```typescript
// Confusing: Multiple entry points with different patterns
const blob = await exportToBlob(engine, markdown, { format: 'pdf' });
const url = await exportToDataUrl(engine, markdown, { format: 'svg' });
await preview(engine, markdown, element, { format: 'svg' });
await downloadDocument(engine, markdown, 'doc.pdf', { format: 'pdf' });

// Hidden: Can't reuse parse results
// Re-parses markdown each time even with same input
```

#### New API
```typescript
// Clear: Single render function
const result = render(engine, markdown, { format: 'pdf' });

// Composable: Convert result to different formats
const blob = toBlob(result);
const url = await toDataUrl(result);
toElement(result, element);
download(result, 'document.pdf');

// Efficient: Render once, export many times
const pdfResult = render(engine, markdown, { format: 'pdf' });
const svgResult = render(engine, markdown, { format: 'svg' });
download(pdfResult, 'doc.pdf');
download(svgResult, 'doc.svg');
```

### Migration Path

To help users migrate, we'll:

1. Keep old functions as deprecated (with warnings in console)
2. Provide clear migration examples in documentation
3. Update all examples and playground to use new API
4. Document the breaking changes in README

### Implementation Notes

- All new functions live in the `exporters` namespace for consistency
- `render()` replaces `exportPreview()` as the core entry point
- Conversion functions are simpler and more focused
- Type safety maintained throughout
