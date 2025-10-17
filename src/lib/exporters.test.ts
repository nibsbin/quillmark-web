import { describe, it, expect, vi } from 'vitest';
import { exportToBlob, exportToDataUrl, exportToElement, download } from './exporters';

// Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Quillmark engine
const createMockEngine = (artifactBytes: Uint8Array) => {
  return {
    render: vi.fn(() => ({
      artifacts: {
        bytes: artifactBytes
      }
    }))
  } as any;
};

describe('exportToBlob', () => {
  it('should export PDF to blob', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
    const engine = createMockEngine(pdfBytes);

    const blob = await exportToBlob(engine, '# Hello', { format: 'pdf' });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('should export SVG to blob', async () => {
    const svgBytes = new TextEncoder().encode('<svg></svg>');
    const engine = createMockEngine(svgBytes);

    const blob = await exportToBlob(engine, '# Hello', { format: 'svg' });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml');
  });

  it('should default to PDF format', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const engine = createMockEngine(pdfBytes);

    const blob = await exportToBlob(engine,  '# Hello');

    expect(blob.type).toBe('application/pdf');
  });

  it('should handle array artifacts', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const engine = {
      render: vi.fn(() => ({
        artifacts: [{ bytes }]
      }))
    } as any;

    const blob = await exportToBlob(engine, '# Test');
    
    expect(blob).toBeInstanceOf(Blob);
  });
});

describe('exportToDataUrl', () => {
  it('should export to data URL', async () => {
    const svgBytes = new TextEncoder().encode('<svg></svg>');
    const engine = createMockEngine(svgBytes);

    const dataUrl = await exportToDataUrl(engine, '# Hello', { format: 'svg' });

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

describe('exportToElement', () => {
  it('should inject SVG into element', async () => {
    const svgMarkup = '<svg width="100" height="100"></svg>';
    const svgBytes = new TextEncoder().encode(svgMarkup);
    const engine = createMockEngine(svgBytes);
    
    const element = document.createElement('div');
    await exportToElement(engine, '# Hello', element, { format: 'svg' });

    expect(element.innerHTML).toContain('<svg');
    expect(element.innerHTML).toContain('width="100"');
  });

  it('should create embed for PDF', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const engine = createMockEngine(pdfBytes);
    
    const element = document.createElement('div');
    await exportToElement(engine, '# Hello', element, { format: 'pdf' });

    expect(element.innerHTML).toContain('<embed');
    expect(element.innerHTML).toContain('type="application/pdf"');
  });

  it('should default to SVG format', async () => {
    const svgBytes = new TextEncoder().encode('<svg></svg>');
    const engine = createMockEngine(svgBytes);
    
    const element = document.createElement('div');
    await exportToElement(engine, '# Hello', element);

    expect(element.innerHTML).toContain('<svg');
  });
});

describe('download', () => {
  it('should trigger download', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    
    // Mock DOM methods
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    
    const mockAnchor = {
      href: '',
      download: '',
      click: clickSpy,
      remove: removeSpy
    } as any;
    
    createElementSpy.mockReturnValue(mockAnchor);

    download(blob, 'test.txt');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.download).toBe('test.txt');
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });
});
