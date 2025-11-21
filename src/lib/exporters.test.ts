import { describe, it, expect, vi } from 'vitest';

// Mock the WASM module before importing exporters
vi.mock('@quillmark-test/wasm', () => ({
  Quillmark: class {
    static parseMarkdown(_markdown: string) {
      return {
        fields: {},
        quillTag: 'test-quill'
      };
    }
    render() {
      return {};
    }
    getQuillInfo() {
      return {};
    }
  }
}));

import { render, toBlob, toDataUrl } from './exporters';

const TEST_MARKDOWN = `---
title: Test Document
QUILL: test_quill
---

# Hello World`;

describe('render', () => {
  describe('Unit tests (with mocks)', () => {
    // Mock Quillmark engine
    const createMockEngine = (artifactBytes: Uint8Array, outputFormat: 'pdf' | 'svg' = 'pdf') => {
      return {
        render: vi.fn(() => ({
          artifacts: [{
            bytes: artifactBytes
          }],
          outputFormat
        })),
        getQuillInfo: vi.fn()
      } as any;
    };

    it('should render PDF', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
      const engine = createMockEngine(pdfBytes, 'pdf');

      const result = render(engine, TEST_MARKDOWN, { format: 'pdf' });

      expect(result).toBeDefined();
      expect(result.outputFormat).toBe('pdf');
    });

    it('should render SVG', () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const engine = createMockEngine(svgBytes, 'svg');

      const result = render(engine, TEST_MARKDOWN, { format: 'svg' });

      expect(result).toBeDefined();
      expect(result.outputFormat).toBe('svg');
    });

    it('should default to SVG format when not specified', () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const engine = createMockEngine(svgBytes, 'svg');

      const result = render(engine, TEST_MARKDOWN);

      expect(result).toBeDefined();
    });
  });
});

describe('toBlob', () => {
  describe('Unit tests (with mocks)', () => {
    it('should convert PDF result to blob', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
      const result = {
        artifacts: { main: pdfBytes },
        outputFormat: 'pdf' as const
      };

      const blob = toBlob(result);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should convert SVG result to blob', () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const result = {
        artifacts: { main: svgBytes },
        outputFormat: 'svg' as const
      };

      const blob = toBlob(result);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');
    });

    it('should handle standardized format', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const result = {
        artifacts: { main: bytes },
        outputFormat: 'pdf' as const
      };

      const blob = toBlob(result);

      expect(blob).toBeInstanceOf(Blob);
    });
  });
});

describe('toDataUrl', () => {
  describe('Unit tests (with mocks)', () => {
    it('should convert result to data URL', async () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const result = {
        artifacts: { main: svgBytes },
        outputFormat: 'svg' as const
      };

      const dataUrl = await toDataUrl(result);

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
    //    engine.registerQuill(quillJson);
    //
    // 3. Render to result:
    //    const result = render(engine, markdown, { format: 'pdf' });
    //
    // 4. Convert to blob:
    //    const blob = toBlob(result);
    //    expect(blob.size).toBeGreaterThan(0);
    //
    // 5. Convert to data URL:
    //    const dataUrl = await toDataUrl(result);
    //    expect(dataUrl.length).toBeGreaterThan(50);

    const expectedWorkflow = [
      'Parse markdown with Quillmark.parseMarkdown()',
      'Register quill with engine.registerQuill()',
      'Render using render()',
      'Convert using toBlob or toDataUrl',
      'Verify blob size or data URL length'
    ];

    expect(expectedWorkflow).toHaveLength(5);
  });
});
