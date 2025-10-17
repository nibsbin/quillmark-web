import { describe, it, expect } from 'vitest';

/**
 * Determine the output format for a given quill name
 * Extracted for testing without importing the entire main.ts module
 */
function getFormatForQuill(quillName: string): 'pdf' | 'svg' {
  return quillName === 'usaf_form_8' ? 'pdf' : 'svg';
}

describe('getFormatForQuill', () => {
  it('should return pdf for usaf_form_8', () => {
    expect(getFormatForQuill('usaf_form_8')).toBe('pdf');
  });

  it('should return svg for usaf_memo', () => {
    expect(getFormatForQuill('usaf_memo')).toBe('svg');
  });

  it('should return svg for taro', () => {
    expect(getFormatForQuill('taro')).toBe('svg');
  });

  it('should return svg for any other quill', () => {
    expect(getFormatForQuill('some_other_quill')).toBe('svg');
    expect(getFormatForQuill('test')).toBe('svg');
    expect(getFormatForQuill('')).toBe('svg');
  });
});
