import { describe, it, expect, vi } from 'vitest';
import { renderToBlob, renderToDataUrl, renderToElement, downloadArtifact } from './renderers';

// Mock Quillmark engine
const createMockEngine = (artifactBytes: number[] = [72, 101, 108, 108, 111]) => {
  return {
    render: vi.fn((quillName: string, markdown: string, options: any) => {
      const format = options?.format || 'pdf';
      
      // Return mock result matching the expected structure
      return {
        artifacts: {
          main: {
            bytes: new Uint8Array(artifactBytes)
          }
        },
        diagnostics: []
      };
    })
  } as any;
};

describe('renderToBlob', () => {
  it('should render to PDF blob by default', async () => {
    const engine = createMockEngine();
    const blob = await renderToBlob(engine, 'test-quill', '# Hello');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(engine.render).toHaveBeenCalledWith('test-quill', '# Hello', { format: 'pdf' });
  });

  it('should render to SVG blob when specified', async () => {
    const engine = createMockEngine();
    const blob = await renderToBlob(engine, 'test-quill', '# Hello', { format: 'svg' });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml');
    expect(engine.render).toHaveBeenCalledWith('test-quill', '# Hello', { format: 'svg' });
  });

  it('should handle array-style artifacts', async () => {
    const engine = {
      render: vi.fn(() => ({
        artifacts: [
          { bytes: new Uint8Array([1, 2, 3]) }
        ]
      }))
    } as any;

    const blob = await renderToBlob(engine, 'test', 'content');
    expect(blob.size).toBe(3);
  });

  it('should handle empty artifacts', async () => {
    const engine = createMockEngine([]);
    const blob = await renderToBlob(engine, 'test', 'content');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(0);
  });
});

describe('renderToDataUrl', () => {
  it('should render to data URL', async () => {
    const engine = createMockEngine([72, 101, 108, 108, 111]); // "Hello"
    const dataUrl = await renderToDataUrl(engine, 'test-quill', '# Test');

    expect(dataUrl).toMatch(/^data:application\/pdf;base64,/);
  });

  it('should work with SVG format', async () => {
    const engine = createMockEngine([60, 115, 118, 103, 62]); // "<svg>"
    const dataUrl = await renderToDataUrl(engine, 'test-quill', '# Test', { format: 'svg' });

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

describe('renderToElement', () => {
  it('should render SVG directly into element', async () => {
    const svgContent = '<svg><rect /></svg>';
    const svgBytes = new TextEncoder().encode(svgContent);
    const engine = createMockEngine(Array.from(svgBytes));
    
    const element = document.createElement('div');
    await renderToElement(engine, 'test', '# Test', element, { format: 'svg' });

    // DOM normalizes self-closing tags, so check that it contains the SVG
    expect(element.innerHTML).toContain('<svg>');
    expect(element.innerHTML).toContain('<rect');
  });

  it('should render PDF as embed element', async () => {
    const engine = createMockEngine([37, 80, 68, 70]); // "%PDF"
    const element = document.createElement('div');
    
    await renderToElement(engine, 'test', '# Test', element, { format: 'pdf' });

    expect(element.innerHTML).toContain('<embed');
    expect(element.innerHTML).toContain('type="application/pdf"');
  });

  it('should render text as pre element', async () => {
    const textContent = 'Hello, world!';
    const textBytes = new TextEncoder().encode(textContent);
    const engine = createMockEngine(Array.from(textBytes));
    
    const element = document.createElement('div');
    await renderToElement(engine, 'test', '# Test', element, { format: 'txt' });

    expect(element.innerHTML).toContain('<pre>');
    expect(element.innerHTML).toContain(textContent);
  });
});

describe('downloadArtifact', () => {
  it('should trigger download with correct filename', () => {
    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn()
    };
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const blob = new Blob(['test'], { type: 'application/pdf' });
    downloadArtifact(blob, 'output.pdf');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('output.pdf');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.remove).toHaveBeenCalled();
  });
});
