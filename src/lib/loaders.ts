/**
 * Quill loading utilities
 */

import { unzip } from 'fflate';
import type { QuillJson } from './types';
import { detectBinaryFile, insertPath } from './utils';

/**
 * Load a Quill template from a .zip file
 * 
 * @param zipFile - Zip file containing Quill template (must include Quill.toml at root)
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if zip is invalid or missing Quill.toml
 * 
 * @example
 * const input = document.querySelector('input[type="file"]');
 * const zipFile = input.files[0];
 * const quillJson = await fromZip(zipFile);
 * 
 * const engine = Quillmark.create();
 * const quill = Quill.fromJson(JSON.stringify(quillJson));
 * engine.registerQuill(quill);
 */
export async function fromZip(zipFile: File | Blob | ArrayBuffer): Promise<Record<string, any>> {
  // Convert to ArrayBuffer if needed
  let buffer: ArrayBuffer;
  if (zipFile instanceof ArrayBuffer) {
    buffer = zipFile;
  } else {
    buffer = await (zipFile as Blob).arrayBuffer();
  }
  
  const quillObj: Record<string, any> = {};
  
  // Unzip using fflate
  return new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (err, unzipped) => {
      if (err) {
        reject(new Error(`Failed to unzip file: ${err.message}`));
        return;
      }
      
      // Process each file in the zip
      for (const [path, fileData] of Object.entries(unzipped)) {
        // Skip directories (they end with /)
        if (path.endsWith('/')) continue;
        
        const parts = path.split('/');
        
        if (detectBinaryFile(path)) {
          // Binary file - store as number array
          const bytes = Array.from(fileData);
          insertPath(quillObj, parts, { contents: bytes });
        } else {
          // Text file - decode as UTF-8
          const text = new TextDecoder().decode(fileData);
          insertPath(quillObj, parts, { contents: text });
        }
      }
      
      // Validate that Quill.toml exists
      if (!quillObj['Quill.toml']) {
        reject(new Error('Quill.toml not found in zip file. Make sure it exists at the root of the archive.'));
        return;
      }
      
      resolve(quillObj);
    });
  });
}

/**
 * Load a Quill template from a remote directory via fetch
 * 
 * @param baseUrl - Base URL of the Quill directory
 * @param files - Array of file paths to fetch
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if required files are missing or fetching fails
 * 
 * @example
 * const quillJson = await fromDirectory('/usaf_memo', [
 *   'Quill.toml',
 *   'glue.typ',
 *   'assets/logo.png'
 * ]);
 * 
 * const engine = Quillmark.create();
 * const quill = Quill.fromJson(JSON.stringify(quillJson));
 * engine.registerQuill(quill);
 */
export async function fromDirectory(
  baseUrl: string,
  files: string[]
): Promise<Record<string, any>> {
  // Ensure baseUrl doesn't have trailing slash
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const quillObj: Record<string, any> = {};
  
  for (const relPath of files) {
    const fullPath = `${base}/${relPath}`;
    const parts = relPath.split('/');
    
    try {
      const response = await fetch(fullPath);
      if (!response.ok) {
        throw new Error(`Failed to load ${fullPath}: ${response.statusText}`);
      }
      
      if (detectBinaryFile(relPath)) {
        // Binary file - read as array buffer and convert to number array
        const arrayBuffer = await response.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        insertPath(quillObj, parts, { contents: bytes });
      } else {
        // Text file
        const text = await response.text();
        insertPath(quillObj, parts, { contents: text });
      }
    } catch (error) {
      console.warn(`Failed loading file ${fullPath}:`, error);
      throw error;
    }
  }
  
  // Validate that Quill.toml exists
  if (!quillObj['Quill.toml']) {
    throw new Error('Quill.toml not found in directory. Make sure it exists at the root.');
  }
  
  return quillObj;
}

/**
 * Load a Quill template from uploaded files (via FileList or File array)
 * 
 * @param files - FileList or File array from file input
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if no Quill.toml found
 * 
 * @example
 * const input = document.querySelector('input[type="file"]');
 * input.setAttribute('webkitdirectory', '');
 * input.addEventListener('change', async (e) => {
 *   const quillJson = await fromFiles(e.target.files);
 *   const quill = Quill.fromJson(JSON.stringify(quillJson));
 *   engine.registerQuill(quill);
 * });
 */
export async function fromFiles(files: FileList | File[]): Promise<Record<string, any>> {
  const quillObj: Record<string, any> = {};
  const fileArray = Array.from(files);
  
  for (const file of fileArray) {
    // Use webkitRelativePath if available, otherwise use name
    const relativePath = (file as any).webkitRelativePath || file.name;
    const parts = relativePath.split('/').filter((p: string) => p.length > 0);
    
    // Skip if no valid path
    if (parts.length === 0) continue;
    
    if (detectBinaryFile(file.name)) {
      // Binary file
      const arrayBuffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      insertPath(quillObj, parts, { contents: bytes });
    } else {
      // Text file
      const text = await file.text();
      insertPath(quillObj, parts, { contents: text });
    }
  }
  
  // Validate that Quill.toml exists somewhere
  const hasQuillToml = JSON.stringify(quillObj).includes('Quill.toml');
  if (!hasQuillToml) {
    throw new Error('Quill.toml not found in uploaded files. Make sure it exists at the root.');
  }
  
  return quillObj;
}
