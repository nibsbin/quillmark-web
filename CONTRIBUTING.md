# Contributing to Quillmark Web

Thank you for your interest in contributing to Quillmark Web! This document provides guidelines for contributing to both the playground demo and the `@quillmark-test/web` library.

## Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nibsbin/quillmark-web.git
   cd quillmark-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The playground will be available at http://localhost:5173

4. **Make your changes** and test them in the browser

5. **Build to verify:**
   ```bash
   npm run build
   ```

## Project Structure

- **`src/main.ts`** - Playground demo application
- **`src/lib/`** - The `@quillmark-test/web` library
  - `index.ts` - Main library exports
  - `loaders.ts` - Quill loading utilities (`fromZip`)
  - `renderers.ts` - Rendering helpers
  - `utils.ts` - Utility functions
  - `types.ts` - TypeScript type definitions
- **`public/quills/`** - Quill template zip files for testing
- **`designs/`** - Design documents and specifications
- **`index.html`** - Playground HTML template

## Code Style

### TypeScript

- Use **TypeScript strict mode** - no `any` types in public APIs
- Provide **JSDoc comments** for all exported functions and types
- Use **clear, descriptive names** for variables and functions
- Follow existing code formatting and style

### Conventions

- **File organization:** Group related functionality in dedicated files
- **Exports:** Export only what's needed in the public API
- **Error handling:** Provide clear, actionable error messages
- **Comments:** Add comments only when necessary to explain complex logic

### Example

```typescript
/**
 * Load a Quill template from a zip file.
 * 
 * @param zipFile - The zip file containing the Quill template
 * @returns Promise resolving to the Quill JSON contract
 * @throws Error if Quill.toml is not found in the zip
 */
export async function fromZip(zipFile: File | Blob | ArrayBuffer): Promise<QuillJson> {
  // Implementation...
}
```

## Making Changes

### Library Changes (`src/lib/`)

When modifying the library:

1. **Maintain backward compatibility** - avoid breaking changes to the public API
2. **Update TypeScript types** in `src/lib/types.ts` if needed
3. **Update documentation** in `src/lib/README.md`
4. **Test your changes** in the playground demo

### Playground Changes (`src/main.ts`, `index.html`)

When modifying the playground:

1. **Test all functionality** - markdown editing, SVG preview, PDF download
2. **Verify responsiveness** on different screen sizes
3. **Check browser compatibility** (Chrome, Firefox, Safari, Edge)

### Design Document Changes

If your changes affect the design:

1. Update relevant files in `designs/`
2. Keep design docs in sync with implementation
3. Document architectural decisions

## Testing

### Manual Testing

Since there are no automated tests currently:

1. **Test the playground:**
   - Load the dev server with `npm run dev`
   - Edit markdown and verify SVG preview updates
   - Test PDF download functionality
   - Try different markdown content

2. **Test library functions:**
   - Modify `src/main.ts` to test new library features
   - Verify error handling with invalid inputs
   - Test edge cases

3. **Test the build:**
   ```bash
   npm run build
   npm run preview
   ```

### Browser Testing

Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

## Submitting Changes

### Pull Requests

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with clear, focused commits

3. **Test thoroughly** using the manual testing steps above

4. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub with:
   - Clear description of the changes
   - Rationale for the change
   - Testing steps you performed
   - Screenshots (if UI changes)

### Commit Messages

Use clear, descriptive commit messages:

```
Add fromZip validation for missing Quill.toml

- Throw clear error when Quill.toml is not found
- Add example error message to README
- Update error handling documentation
```

## Reporting Issues

When reporting bugs or requesting features:

1. **Check existing issues** to avoid duplicates
2. **Provide clear description** of the issue or feature
3. **Include steps to reproduce** (for bugs)
4. **Include environment details** (browser, OS, Node.js version)
5. **Add screenshots** if relevant

### Bug Report Template

```
**Describe the bug:**
A clear description of what the bug is.

**To Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior:**
What you expected to happen.

**Environment:**
- Browser: Chrome 120.0
- OS: Windows 11
- Node.js: 20.10.0
```

## Design Philosophy

When contributing, keep these principles in mind:

1. **Developer Experience First** - Make common tasks simple and clear
2. **Progressive Enhancement** - Simple tasks are simple, complex tasks remain possible
3. **Type Safety** - Leverage TypeScript for better DX
4. **Minimal Dependencies** - Only add dependencies when necessary
5. **Framework Agnostic** - Works with any frontend framework or vanilla JS

## Questions?

If you have questions about contributing:

- Open a GitHub Issue with the "question" label
- Review the design documents in `designs/`
- Check existing code for examples

## License

By contributing to Quillmark Web, you agree that your contributions will be licensed under the Apache License 2.0.
