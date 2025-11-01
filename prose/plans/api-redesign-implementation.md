# API Redesign Implementation Plan

## Overview

This plan outlines the steps to implement the cleaner, more semantically consistent API as described in `api-redesign.md`.

## Current State

- API has inconsistent naming: `exportToBlob`, `exportToDataUrl`, `preview`, `exportPreview`, `downloadDocument`
- Functions have different parameter ordering and semantics
- Hidden dependencies on markdown parsing in each function
- Tests passing with current API

## Desired State

- Single `render()` function as the core entry point
- Pure conversion functions: `toBlob()`, `toDataUrl()`, `toElement()`
- Side-effect function: `download()`
- Consistent parameter ordering and naming
- Better composability and efficiency
- All tests updated and passing

## Implementation Steps

### Phase 1: Add New API Functions

- [ ] Add `render()` function to exporters.ts
  - Takes engine, markdown, and options
  - Calls parseMarkdown internally
  - Returns RenderResult
  - Reuses logic from `exportPreview()`

- [ ] Add `toBlob()` function to exporters.ts
  - Takes RenderResult
  - Returns Blob with appropriate MIME type
  - Pure function, no side effects

- [ ] Add `toDataUrl()` function to exporters.ts
  - Takes RenderResult
  - Returns Promise<string> data URL
  - Reuses Blob conversion logic

- [ ] Add `toElement()` function to exporters.ts
  - Takes RenderResult and HTMLElement
  - Mutates DOM to show preview
  - Handles SVG, PDF, and TXT formats

- [ ] Add `download()` function to exporters.ts
  - Takes RenderResult and filename
  - Triggers browser download
  - Determines MIME type from format

### Phase 2: Update Exports and Types

- [ ] Export new functions from index.ts in the `exporters` namespace
- [ ] Ensure RenderResult type is properly exported
- [ ] Update type definitions if needed

### Phase 3: Update Tests

- [ ] Add tests for `render()` function
- [ ] Add tests for `toBlob()` function
- [ ] Add tests for `toDataUrl()` function
- [ ] Add tests for `toElement()` function
- [ ] Add tests for `download()` function
- [ ] Verify all tests pass

### Phase 4: Update Playground Demo

- [ ] Update main.ts to use new API
  - Replace `preview()` with `render()` + `toElement()`
  - Replace `downloadDocument()` with `render()` + `download()`
- [ ] Test playground functionality
- [ ] Verify UI works correctly

### Phase 5: Update Documentation

- [ ] Update src/lib/README.md with new API examples
- [ ] Update main README.md with new API examples
- [ ] Add migration guide section
- [ ] Document breaking changes

### Phase 6: Deprecate Old Functions (Future)

Note: For minimal changes, we'll keep old functions working but document the new preferred API. Actual deprecation can happen in a future version.

- [ ] Add deprecation notices to old function JSDoc comments
- [ ] Keep old functions functional for backward compatibility
- [ ] Document the migration path

## Testing Strategy

- Run existing tests to ensure nothing breaks
- Add comprehensive tests for new functions
- Test playground manually to verify UI functionality
- Verify type safety with TypeScript compilation

## Success Criteria

- [ ] All new functions implemented and exported
- [ ] All tests passing
- [ ] Playground demo uses and demonstrates new API
- [ ] Documentation updated with clear examples
- [ ] No regressions in functionality
- [ ] Code is cleaner and more maintainable

## Notes

- This is a significant API improvement but requires careful testing
- We maintain backward compatibility by keeping old functions
- Focus on making the new API the "blessed" way forward
- The new API should be simpler to understand and use
