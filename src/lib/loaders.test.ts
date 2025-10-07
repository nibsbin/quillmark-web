import { describe, it, expect, vi } from 'vitest';
import { fromZip } from './loaders';
import type { unzip } from 'fflate';

// Mock fflate
vi.mock('fflate', () => ({
  unzip: vi.fn()
}));

import { unzip as mockUnzip } from 'fflate';

describe('fromZip', () => {
  it('should load a valid Quill zip file', async () => {
    // Mock unzip to return a valid structure
    (mockUnzip as any).mockImplementation((data: any, callback: any) => {
      callback(null, {
        'Quill.toml': new TextEncoder().encode('[quill]\nname = "test"'),
        'glue.typ': new TextEncoder().encode('#let content = "test"'),
        'test.md': new TextEncoder().encode('# Test Document')
      });
    });

    const zipBuffer = new ArrayBuffer(100);
    const result = await fromZip(zipBuffer);

    expect(result).toHaveProperty('files');
    expect(result.files).toHaveProperty('Quill.toml');
    expect(result.files['Quill.toml']).toHaveProperty('contents');
    expect(typeof result.files['Quill.toml'].contents).toBe('string');
    expect(result.files['Quill.toml'].contents).toContain('[quill]');
    expect(result.files).toHaveProperty('glue.typ');
    expect(result.files).toHaveProperty('test.md');
  });

  it('should handle binary files correctly', async () => {
    // Mock unzip with binary file
    (mockUnzip as any).mockImplementation((data: any, callback: any) => {
      callback(null, {
        'Quill.toml': new TextEncoder().encode('[quill]'),
        'logo.png': new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
      });
    });

    const zipBuffer = new ArrayBuffer(100);
    const result = await fromZip(zipBuffer);

    expect(result.files).toHaveProperty('logo.png');
    expect(result.files['logo.png'].contents).toBeInstanceOf(Array);
    expect(result.files['logo.png'].contents).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it('should reject zip without Quill.toml', async () => {
    // Mock unzip without Quill.toml
    (mockUnzip as any).mockImplementation((data: any, callback: any) => {
      callback(null, {
        'glue.typ': new TextEncoder().encode('#let content = "test"')
      });
    });

    const zipBuffer = new ArrayBuffer(100);

    await expect(fromZip(zipBuffer)).rejects.toThrow(
      'Quill.toml not found in zip file'
    );
  });

  it('should handle nested directories', async () => {
    // Mock unzip with nested structure
    (mockUnzip as any).mockImplementation((data: any, callback: any) => {
      callback(null, {
        'Quill.toml': new TextEncoder().encode('[quill]'),
        'assets/logo.png': new Uint8Array([1, 2, 3]),
        'packages/my-pkg/lib.typ': new TextEncoder().encode('#let x = 1')
      });
    });

    const zipBuffer = new ArrayBuffer(100);
    const result = await fromZip(zipBuffer);

    expect(result.files).toHaveProperty('assets');
    expect(result.files.assets).toHaveProperty('logo.png');
    expect(result.files).toHaveProperty('packages');
    expect(result.files.packages).toHaveProperty('my-pkg');
    expect(result.files.packages['my-pkg']).toHaveProperty('lib.typ');
  });

  it('should reject invalid zip files', async () => {
    // Mock unzip error
    (mockUnzip as any).mockImplementation((data: any, callback: any) => {
      callback(new Error('invalid zip'), null);
    });

    const invalidZip = new Uint8Array([1, 2, 3, 4, 5]);
    
    await expect(fromZip(invalidZip.buffer)).rejects.toThrow();
  });

  it('should skip directory entries', async () => {
    // Mock unzip with directory entry
    (mockUnzip as any).mockImplementation((data: any, callback: any) => {
      callback(null, {
        'Quill.toml': new TextEncoder().encode('[quill]'),
        'assets/': new Uint8Array([]), // Directory entry
        'assets/logo.png': new Uint8Array([1, 2, 3])
      });
    });

    const zipBuffer = new ArrayBuffer(100);
    const result = await fromZip(zipBuffer);

    expect(result.files).toHaveProperty('Quill.toml');
    expect(result.files.assets).toHaveProperty('logo.png');
    // Should not have the directory entry itself
    expect(result.files.assets).not.toHaveProperty('contents');
  });
});
