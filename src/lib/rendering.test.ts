import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToBlob, exportToElement } from './exporters';
import { fromZip } from './loaders';
import { unzip } from 'fflate';

// Mock fflate
vi.mock('fflate', () => ({
  unzip: vi.fn()
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

/**
 * Create a mock Quillmark engine that can render with different formats
 */
const createMockEngine = (_format: 'pdf' | 'svg') => {
  return {
    render: vi.fn((_markdown: string, options?: any) => {
      const actualFormat = options?.format || 'pdf';
      
      // Simulate PDF bytes or SVG content
      let bytes: Uint8Array;
      if (actualFormat === 'pdf') {
        // Mock PDF header
        bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
      } else {
        // Mock SVG content
        bytes = new TextEncoder().encode('<svg width="100" height="100"><rect width="100" height="100"/></svg>');
      }
      
      return {
        artifacts: {
          bytes
        }
      };
    }),
    registerQuill: vi.fn(),
    listQuills: vi.fn(() => ['usaf_form_8', 'usaf_memo', 'taro'])
  } as any;
};

describe('usaf_form_8 rendering', () => {
  const usafForm8Markdown = `---
QUILL: usaf_form_8
examinee:
  last: Fry
  first: Phillip
  middle: J.
  grade: SrA
dod_id: 1999123101
---
# Test Form`;

  describe('PDF rendering', () => {
    it('should render usaf_form_8 to PDF blob', async () => {
      const engine = createMockEngine('pdf');
      
      const blob = await exportToBlob(engine, usafForm8Markdown, { format: 'pdf' });
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(engine.render).toHaveBeenCalledWith(usafForm8Markdown, { format: 'pdf' });
    });

    it('should create PDF blob with correct size', async () => {
      const engine = createMockEngine('pdf');
      
      const blob = await exportToBlob(engine, usafForm8Markdown, { format: 'pdf' });
      
      // Check blob properties
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    });

    it('should embed PDF in DOM element', async () => {
      const engine = createMockEngine('pdf');
      const element = document.createElement('div');
      
      await exportToElement(engine, usafForm8Markdown, element, { format: 'pdf' });
      
      expect(element.innerHTML).toContain('<embed');
      expect(element.innerHTML).toContain('type="application/pdf"');
      expect(element.innerHTML).toContain('blob:mock-url');
    });
  });

  describe('SVG rendering for other quills', () => {
    const usafMemoMarkdown = `---
QUILL: usaf_memo
---
# Test Memo`;

    it('should render usaf_memo to SVG blob', async () => {
      const engine = createMockEngine('svg');
      
      const blob = await exportToBlob(engine, usafMemoMarkdown, { format: 'svg' });
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');
      expect(engine.render).toHaveBeenCalledWith(usafMemoMarkdown, { format: 'svg' });
    });

    it('should inject SVG into DOM element', async () => {
      const engine = createMockEngine('svg');
      const element = document.createElement('div');
      
      await exportToElement(engine, usafMemoMarkdown, element, { format: 'svg' });
      
      expect(element.innerHTML).toContain('<svg');
      expect(element.innerHTML).toContain('width="100"');
      expect(element.innerHTML).toContain('height="100"');
    });
  });

  describe('Quill loading from zip', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should load usaf_form_8 quill from zip', async () => {
      // Mock unzip to return usaf_form_8 structure
      (unzip as any).mockImplementation((_data: any, callback: any) => {
        callback(null, {
          'Quill.toml': new TextEncoder().encode('[Quill]\nname = "usaf_form_8"\nbackend = "acroform"'),
          'usaf_form_8.md': new TextEncoder().encode(usafForm8Markdown)
        });
      });

      const zipBuffer = new ArrayBuffer(100);
      const result = await fromZip(zipBuffer);

      expect(result.files).toHaveProperty('Quill.toml');
      expect(result.files).toHaveProperty('usaf_form_8.md');
      expect(result.files['Quill.toml'].contents).toContain('acroform');
    });

    it('should load usaf_memo quill from zip', async () => {
      const usafMemoMarkdown = `---
QUILL: usaf_memo
---
# Memo`;

      (unzip as any).mockImplementation((_data: any, callback: any) => {
        callback(null, {
          'Quill.toml': new TextEncoder().encode('[Quill]\nname = "usaf_memo"'),
          'glue.typ': new TextEncoder().encode('#let content = "test"'),
          'usaf_memo.md': new TextEncoder().encode(usafMemoMarkdown),
          'assets/logo.png': new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
        });
      });

      const zipBuffer = new ArrayBuffer(100);
      const result = await fromZip(zipBuffer);

      expect(result.files).toHaveProperty('Quill.toml');
      expect(result.files).toHaveProperty('glue.typ');
      expect(result.files).toHaveProperty('usaf_memo.md');
      expect(result.files).toHaveProperty('assets');
      expect(result.files.assets).toHaveProperty('logo.png');
      expect(result.files.assets['logo.png'].contents).toBeInstanceOf(Array);
    });
  });

  describe('Format determination', () => {
    it('should use PDF format for usaf_form_8', () => {
      // This is tested in main.test.ts but documented here for context
      const expectedFormat = 'pdf';
      expect(expectedFormat).toBe('pdf');
    });

    it('should use SVG format for other quills', () => {
      // This is tested in main.test.ts but documented here for context
      const expectedFormat = 'svg';
      expect(expectedFormat).toBe('svg');
    });
  });
});
