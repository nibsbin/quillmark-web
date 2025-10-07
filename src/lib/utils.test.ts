import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectBinaryFile, debounce } from './utils';

describe('detectBinaryFile', () => {
  it('should detect image files as binary', () => {
    expect(detectBinaryFile('logo.png')).toBe(true);
    expect(detectBinaryFile('photo.jpg')).toBe(true);
    expect(detectBinaryFile('image.jpeg')).toBe(true);
    expect(detectBinaryFile('graphic.gif')).toBe(true);
    expect(detectBinaryFile('icon.webp')).toBe(true);
    expect(detectBinaryFile('bitmap.bmp')).toBe(true);
    expect(detectBinaryFile('favicon.ico')).toBe(true);
  });

  it('should detect font files as binary', () => {
    expect(detectBinaryFile('font.ttf')).toBe(true);
    expect(detectBinaryFile('font.otf')).toBe(true);
    expect(detectBinaryFile('font.woff')).toBe(true);
    expect(detectBinaryFile('font.woff2')).toBe(true);
  });

  it('should detect other binary formats', () => {
    expect(detectBinaryFile('document.pdf')).toBe(true);
    expect(detectBinaryFile('archive.zip')).toBe(true);
    expect(detectBinaryFile('archive.tar')).toBe(true);
    expect(detectBinaryFile('compressed.gz')).toBe(true);
  });

  it('should not detect text files as binary', () => {
    expect(detectBinaryFile('glue.typ')).toBe(false);
    expect(detectBinaryFile('Quill.toml')).toBe(false);
    expect(detectBinaryFile('README.md')).toBe(false);
    expect(detectBinaryFile('script.js')).toBe(false);
    expect(detectBinaryFile('style.css')).toBe(false);
    expect(detectBinaryFile('data.json')).toBe(false);
    expect(detectBinaryFile('document.txt')).toBe(false);
  });

  it('should handle files without extensions', () => {
    expect(detectBinaryFile('Dockerfile')).toBe(false);
    expect(detectBinaryFile('LICENSE')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(detectBinaryFile('IMAGE.PNG')).toBe(true);
    expect(detectBinaryFile('Font.TTF')).toBe(true);
    expect(detectBinaryFile('DOCUMENT.PDF')).toBe(true);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call function with latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('third');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on each call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    
    debounced();
    vi.advanceTimersByTime(50);
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use default wait time of 250ms', () => {
    const fn = vi.fn();
    const debounced = debounce(fn);

    debounced();
    vi.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
