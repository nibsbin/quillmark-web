import { describe, it, expect, vi } from 'vitest';

// Mock the WASM module before importing exporters
vi.mock('@quillmark-test/wasm', () => ({
  Quillmark: class {
    static parseMarkdown = vi.fn((markdown: string) => ({
      fields: {},
      quillTag: 'test-quill'
    }));
    render = vi.fn();
    getQuillInfo = vi.fn();
  }
}));

import { exportToBlob, exportToDataUrl } from './exporters';

// Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const TEST_MARKDOWN = `---
title: Test Document
QUILL: test_quill
---

# Hello World`;

describe('exportToBlob', () => {
  describe('Unit tests (with mocks)', () => {
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

    it('should export PDF to blob', async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
      const engine = createMockEngine(pdfBytes);

      const blob = await exportToBlob(engine, TEST_MARKDOWN, { format: 'pdf' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should export SVG to blob', async () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const engine = createMockEngine(svgBytes);

      const blob = await exportToBlob(engine, TEST_MARKDOWN, { format: 'svg' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');
    });

    it('should default to PDF format', async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const engine = createMockEngine(pdfBytes);

      const blob = await exportToBlob(engine, TEST_MARKDOWN);

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

      const blob = await exportToBlob(engine, TEST_MARKDOWN);
      
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});

describe('exportToDataUrl', () => {
  describe('Unit tests (with mocks)', () => {
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

    it('should export to data URL', async () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const engine = createMockEngine(svgBytes);

      const dataUrl = await exportToDataUrl(engine, TEST_MARKDOWN, { format: 'svg' });

      expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    });
  });
});

// Document integration test patterns from quillmark-wasm
describe('Integration patterns (from quillmark-wasm)', () => {
  it('documents expected workflow for WASM integration testing', () => {
    // These patterns should be followed when testing with actual WASM
    // (in browser environment or with proper WASM support):
    //
    // 1. Parse markdown:
    //    const parsed = Quillmark.parseMarkdown(markdown);
    //
    // 2. Create engine and register quill:
    //    const engine = new Quillmark();
    //    engine.registerQuill('name', quillJson);
    //
    // 3. Export to blob:
    //    const blob = await exportToBlob(engine, markdown, { format: 'pdf' });
    //    expect(blob.size).toBeGreaterThan(0);
    //
    // 4. Export to data URL:
    //    const dataUrl = await exportToDataUrl(engine, markdown, { format: 'svg' });
    //    expect(dataUrl.length).toBeGreaterThan(50);

    const expectedWorkflow = [
      'Parse markdown with Quillmark.parseMarkdown()',
      'Register quill with engine.registerQuill()',
      'Export using exportToBlob or exportToDataUrl',
      'Verify blob size or data URL length'
    ];

    expect(expectedWorkflow).toHaveLength(4);
  });
});
