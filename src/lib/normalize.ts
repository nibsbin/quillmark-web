/**
 * Utility for normalizing parsed documents from WASM
 */

import type { ParsedDocument } from './types';

/**
 * Normalize parsed document from WASM
 * 
 * The WASM layer returns fields as a Map, but it needs to be a plain object
 * for proper JSON serialization when passing to render().
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
  // Convert Map to plain object if needed
  const fields = parsed.fields instanceof Map 
    ? Object.fromEntries(parsed.fields)
    : parsed.fields;
  
  return {
    fields,
    quillTag: parsed.quillTag
  };
}
