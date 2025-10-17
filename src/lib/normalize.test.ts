import { describe, it, expect } from 'vitest';
import { normalizeParsedDocument } from './normalize';

/**
 * Test for Map normalization (simulating WASM parseMarkdown behavior)
 */
describe('Map to Object conversion', () => {
  it('should convert Map to plain object', () => {
    // Simulate what WASM returns
    const fieldsMap = new Map([
      ['dod_id', 1999123101],
      ['examinee', { last: 'Fry', first: 'Phillip', middle: 'J.', grade: 'SrA' }],
      ['organization', 'Planet Express']
    ]);
    
    const parsed = {
      fields: fieldsMap,
      quillTag: 'usaf_form_8'
    };
    
    // Normalize using the actual function
    const normalized = normalizeParsedDocument(parsed);
    
    // Verify conversion
    expect(normalized.fields).not.toBeInstanceOf(Map);
    expect(normalized.fields).toBeInstanceOf(Object);
    expect(normalized.fields.dod_id).toBe(1999123101);
    expect(normalized.fields.examinee).toEqual({ last: 'Fry', first: 'Phillip', middle: 'J.', grade: 'SrA' });
    expect(normalized.fields.organization).toBe('Planet Express');
    
    // Verify JSON serialization works
    const json = JSON.stringify(normalized);
    const deserialized = JSON.parse(json);
    expect(deserialized.fields.dod_id).toBe(1999123101);
    expect(deserialized.fields.examinee.last).toBe('Fry');
  });
  
  it('should handle plain object (no conversion needed)', () => {
    const parsed = {
      fields: { dod_id: 1999123101, examinee: { last: 'Fry' } },
      quillTag: 'usaf_form_8'
    };
    
    // Normalize using the actual function
    const normalized = normalizeParsedDocument(parsed);
    
    expect(normalized.fields).toBe(parsed.fields);
    expect(normalized.fields.dod_id).toBe(1999123101);
  });
});
