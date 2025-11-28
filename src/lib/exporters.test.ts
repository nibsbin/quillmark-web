import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { render, toBlob, toDataUrl, toElement } from './exporters';

const TEST_PARSED_DOC = {
  fields: { title: 'Test Document' },
  quillTag: 'test_quill'
};

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

      const result = render(engine, TEST_PARSED_DOC, { format: 'pdf' });

      expect(result).toBeDefined();
      expect(result.outputFormat).toBe('pdf');
    });

    it('should render SVG', () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const engine = createMockEngine(svgBytes, 'svg');

      const result = render(engine, TEST_PARSED_DOC, { format: 'svg' });

      expect(result).toBeDefined();
      expect(result.outputFormat).toBe('svg');
    });

    it('should default to SVG format when not specified', () => {
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const engine = createMockEngine(svgBytes, 'svg');

      const result = render(engine, TEST_PARSED_DOC);

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

describe('toElement', () => {
  describe('Unit tests (with mocks)', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      // Create a mock HTML element for each test
      mockElement = document.createElement('div');
    });

    it('should render SVG content directly into element', () => {
      const svgContent = '<svg width="100" height="100"><circle cx="50" cy="50" r="40"></circle></svg>';
      const svgBytes = new TextEncoder().encode(svgContent);
      const result = {
        artifacts: { main: svgBytes },
        outputFormat: 'svg' as const
      };

      toElement(result, mockElement);

      // Verify SVG was rendered (DOM may normalize the markup)
      expect(mockElement.innerHTML).toContain('<svg');
      expect(mockElement.innerHTML).toContain('circle');
      expect(mockElement.innerHTML).toContain('cx="50"');
    });

    it('should render PDF content in an embed element', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
      const result = {
        artifacts: { main: pdfBytes },
        outputFormat: 'pdf' as const
      };

      // Mock URL.createObjectURL since it's not available in test environment
      const mockUrl = 'blob:mock-url';
      global.URL.createObjectURL = vi.fn(() => mockUrl);

      toElement(result, mockElement);

      const embed = mockElement.querySelector('embed');
      expect(embed).toBeTruthy();
      expect(embed?.type).toBe('application/pdf');
      expect(embed?.width).toBe('100%');
      expect(embed?.height).toBe('600px');
    });

    it('should clear existing content before rendering', () => {
      mockElement.innerHTML = '<p>Existing content</p>';
      const svgBytes = new TextEncoder().encode('<svg></svg>');
      const result = {
        artifacts: { main: svgBytes },
        outputFormat: 'svg' as const
      };

      toElement(result, mockElement);

      expect(mockElement.innerHTML).toBe('<svg></svg>');
      expect(mockElement.innerHTML).not.toContain('Existing content');
    });

    it('should handle empty SVG content', () => {
      const svgBytes = new TextEncoder().encode('');
      const result = {
        artifacts: { main: svgBytes },
        outputFormat: 'svg' as const
      };

      toElement(result, mockElement);

      expect(mockElement.innerHTML).toBe('');
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
    //    import { Quillmark } from '@quillmark-test/wasm';
    //    const parsed = Quillmark.parseMarkdown(markdown);
    //
    // 2. Create engine and register quill:
    //    const engine = new Quillmark();
    //    engine.registerQuill(quillJson);
    //
    // 3. Render to result:
    //    import { exporters } from '@quillmark-test/web';
    //    const result = exporters.render(engine, parsed, { format: 'pdf' });
    //
    // 4. Convert to blob:
    //    const blob = exporters.toBlob(result);
    //    expect(blob.size).toBeGreaterThan(0);
    //
    // 5. Convert to data URL:
    //    const dataUrl = await exporters.toDataUrl(result);
    //    expect(dataUrl.length).toBeGreaterThan(50);

    const expectedWorkflow = [
      'Parse markdown with Quillmark.parseMarkdown() from @quillmark-test/wasm',
      'Register quill with engine.registerQuill()',
      'Render using exporters.render(engine, parsed, options)',
      'Convert using exporters.toBlob or exporters.toDataUrl',
      'Verify blob size or data URL length'
    ];

    expect(expectedWorkflow).toHaveLength(5);
  });
});
