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
    
    expect(normalized.fields).toBeInstanceOf(Object);
    expect(normalized.fields.dod_id).toBe(1999123101);
  });
  
  it('should recursively convert nested Maps', () => {
    // Simulate nested Map structure
    const nestedMap = new Map([
      ['last', 'Fry'],
      ['first', 'Phillip'],
      ['middle', 'J.']
    ]);
    
    const fieldsMap = new Map([
      ['dod_id', 1999123101],
      ['examinee', nestedMap],
      ['organization', 'Planet Express']
    ]);
    
    const parsed = {
      fields: fieldsMap,
      quillTag: 'usaf_form_8'
    };
    
    const normalized = normalizeParsedDocument(parsed);
    
    // Verify nested Map is also converted
    expect(normalized.fields.examinee).not.toBeInstanceOf(Map);
    expect(normalized.fields.examinee).toBeInstanceOf(Object);
    expect(normalized.fields.examinee.last).toBe('Fry');
    expect(normalized.fields.examinee.first).toBe('Phillip');
    
    // Verify JSON serialization of nested structure
    const json = JSON.stringify(normalized);
    const deserialized = JSON.parse(json);
    expect(deserialized.fields.examinee.last).toBe('Fry');
    expect(deserialized.fields.examinee.middle).toBe('J.');
  });
  
  it('should handle arrays with Maps', () => {
    // Simulate array of Maps (like requisite_info)
    const requisites = [
      new Map([
        ['requisite', 'expendable'],
        ['date', '3000-01-01'],
        ['results', 'Q1']
      ]),
      new Map([
        ['requisite', 'good attitude'],
        ['date', '3000-01-01'],
        ['results', 'Q1']
      ])
    ];
    
    const fieldsMap = new Map([
      ['requisite_info', requisites]
    ]);
    
    const parsed = {
      fields: fieldsMap,
      quillTag: 'usaf_form_8'
    };
    
    const normalized = normalizeParsedDocument(parsed);
    
    // Verify arrays are processed and Maps within arrays are converted
    expect(Array.isArray(normalized.fields.requisite_info)).toBe(true);
    expect(normalized.fields.requisite_info[0]).not.toBeInstanceOf(Map);
    expect(normalized.fields.requisite_info[0].requisite).toBe('expendable');
    expect(normalized.fields.requisite_info[1].requisite).toBe('good attitude');
    
    // Verify JSON serialization
    const json = JSON.stringify(normalized);
    const deserialized = JSON.parse(json);
    expect(deserialized.fields.requisite_info[0].requisite).toBe('expendable');
  });
});
