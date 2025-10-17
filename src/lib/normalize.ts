/**
 * Utility for normalizing parsed documents from WASM
 */

import type { ParsedDocument } from './types';

/**
 * Deep convert Maps to plain objects recursively
 * 
 * The WASM layer may return nested Maps (e.g., in nested YAML structures).
 * This function recursively converts all Maps to plain objects.
 * 
 * @internal
 */
function deepMapToObject(value: any): any {
  // Handle Map
  if (value instanceof Map) {
    const obj: Record<string, any> = {};
    for (const [key, val] of value.entries()) {
      obj[key] = deepMapToObject(val);
    }
    return obj;
  }
  
  // Handle Array
  if (Array.isArray(value)) {
    return value.map(item => deepMapToObject(item));
  }
  
  // Handle plain objects (but not null, Date, or other special objects)
  if (value !== null && typeof value === 'object' && value.constructor === Object) {
    const obj: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      obj[key] = deepMapToObject(val);
    }
    return obj;
  }
  
  // Return primitive values as-is
  return value;
}

/**
 * Normalize parsed document from WASM
 * 
 * The WASM layer returns fields as a Map, and nested structures may also be Maps.
 * This function recursively converts all Maps to plain objects for proper JSON
 * serialization when passing to render().
 * 
 * @param parsed - Parsed document from Quillmark.parseMarkdown()
 * @returns Normalized document with fields as plain object
 * 
 * @example
 * const parsed = Quillmark.parseMarkdown(markdown);
 * const normalized = normalizeParsedDocument(parsed);
 * engine.render(normalized, options);
 */
export function normalizeParsedDocument(parsed: { 
  fields: Map<string, any> | Record<string, any>; 
  quillTag?: string 
}): ParsedDocument {
  // Deep convert all Maps to plain objects
  const fields = deepMapToObject(parsed.fields);
  
  return {
    fields,
    quillTag: parsed.quillTag
  };
}
