import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectBinaryFile, debounce } from './utils';

describe('detectBinaryFile', () => {
  it('should detect PNG files as binary', () => {
    expect(detectBinaryFile('logo.png')).toBe(true);
    expect(detectBinaryFile('image.PNG')).toBe(true);
  });

  it('should detect JPG/JPEG files as binary', () => {
    expect(detectBinaryFile('photo.jpg')).toBe(true);
    expect(detectBinaryFile('photo.jpeg')).toBe(true);
  });

  it('should detect font files as binary', () => {
    expect(detectBinaryFile('font.ttf')).toBe(true);
    expect(detectBinaryFile('font.otf')).toBe(true);
    expect(detectBinaryFile('font.woff')).toBe(true);
    expect(detectBinaryFile('font.woff2')).toBe(true);
  });

  it('should detect PDF files as binary', () => {
    expect(detectBinaryFile('document.pdf')).toBe(true);
  });

  it('should not detect text files as binary', () => {
    expect(detectBinaryFile('glue.typ')).toBe(false);
    expect(detectBinaryFile('Quill.toml')).toBe(false);
    expect(detectBinaryFile('README.md')).toBe(false);
    expect(detectBinaryFile('script.js')).toBe(false);
  });

  it('should handle files without extensions', () => {
    expect(detectBinaryFile('README')).toBe(false);
    expect(detectBinaryFile('LICENSE')).toBe(false);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 250);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 250);

    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the debounced function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 250);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(250);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should use default wait time if not specified', () => {
    const fn = vi.fn();
    const debounced = debounce(fn);

    debounced();
    vi.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
