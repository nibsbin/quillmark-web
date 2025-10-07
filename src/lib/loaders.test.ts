import { describe, it, expect } from 'vitest';
import { fromZip } from './loaders';

describe('fromZip', () => {
  it('should reject when Quill.toml is missing', async () => {
    // Create a simple zip with just a README file (no Quill.toml)
    // Using a minimal zip structure manually
    const zipWithoutQuillToml = createMockZip({
      'README.md': 'Hello world'
    });

    await expect(fromZip(zipWithoutQuillToml)).rejects.toThrow(
      'Quill.toml not found in zip file'
    );
  });

  it('should successfully load zip with Quill.toml', async () => {
    const zipWithQuillToml = createMockZip({
      'Quill.toml': 'name = "test-quill"',
      'glue.typ': '#import "template.typ"',
      'template.typ': '#let main() = { }'
    });

    const result = await fromZip(zipWithQuillToml);

    expect(result).toBeDefined();
    expect(result.files).toBeDefined();
    expect(result.files['Quill.toml']).toBeDefined();
    expect(result.files['Quill.toml'].contents).toBe('name = "test-quill"');
  });

  it('should handle nested directories', async () => {
    const zipWithNestedFiles = createMockZip({
      'Quill.toml': 'name = "test"',
      'packages/my-package/lib.typ': '// library code',
      'assets/logo.txt': 'logo data' // Using .txt to avoid binary handling complexity
    });

    const result = await fromZip(zipWithNestedFiles);

    expect(result.files['Quill.toml']).toBeDefined();
    expect(result.files.packages).toBeDefined();
    expect(result.files.packages['my-package']).toBeDefined();
    expect(result.files.packages['my-package']['lib.typ']).toBeDefined();
    expect(result.files.assets).toBeDefined();
    expect(result.files.assets['logo.txt']).toBeDefined();
  });

  it('should handle ArrayBuffer input', async () => {
    const zipData = createMockZip({
      'Quill.toml': 'name = "test"'
    });
    
    const arrayBuffer = await zipData.arrayBuffer();
    const result = await fromZip(arrayBuffer);

    expect(result.files['Quill.toml']).toBeDefined();
  });

  it('should handle Blob input', async () => {
    const zipData = createMockZip({
      'Quill.toml': 'name = "test"'
    });

    const result = await fromZip(zipData);

    expect(result.files['Quill.toml']).toBeDefined();
  });
});

/**
 * Helper function to create a mock zip file using fflate
 */
function createMockZip(files: Record<string, string>): Blob {
  // Use fflate to create an actual zip
  const { zipSync, strToU8 } = require('fflate');
  
  const filesData: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    filesData[path] = strToU8(content);
  }
  
  const zipped = zipSync(filesData);
  return new Blob([zipped], { type: 'application/zip' });
}
