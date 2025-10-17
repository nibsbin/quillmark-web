import { describe, it, expect, vi } from 'vitest';
import { exportToBlob, exportToDataUrl } from './exporters';

// Mock Quillmark class
vi.mock('@quillmark-test/wasm', () => ({
  Quillmark: class {
    static parseMarkdown = vi.fn((_markdown: string) => ({
      fields: {},
      quillTag: 'test-quill'
    }));
    
    render = vi.fn();
    getQuillInfo = vi.fn();
  }
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const markdownSample = 
`---
QUILL: test-quill
---
# Hello`;

// Mock Quillmark engine
const createMockEngine = (artifactBytes: Uint8Array) => {
  return {
    render: vi.fn(() => ({
      artifacts: [{
        bytes: artifactBytes
      }]
    })),
    getQuillInfo: vi.fn()
  } as any;
};

describe('exportToBlob', () => {
  it('should export PDF to blob', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
    const engine = createMockEngine(pdfBytes);

    const blob = await exportToBlob(engine, markdownSample, { format: 'pdf' });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('should export SVG to blob', async () => {
    const svgBytes = new TextEncoder().encode('<svg></svg>');
    const engine = createMockEngine(svgBytes);

    const blob = await exportToBlob(engine, markdownSample, { format: 'svg' });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml');
  });

  it('should default to PDF format', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const engine = createMockEngine(pdfBytes);

    const blob = await exportToBlob(engine, markdownSample);

    expect(blob.type).toBe('application/pdf');
  });

  it('should handle array artifacts', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const engine = {
      render: vi.fn(() => ({
        artifacts: [{ bytes }]
      })),
      getQuillInfo: vi.fn()
    } as any;

    const blob = await exportToBlob(engine, markdownSample);
    
    expect(blob).toBeInstanceOf(Blob);
  });
});

describe('exportToDataUrl', () => {
  it('should export to data URL', async () => {
    const svgBytes = new TextEncoder().encode('<svg></svg>');
    const engine = createMockEngine(svgBytes);

    const dataUrl = await exportToDataUrl(engine, markdownSample, { format: 'svg' });

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
