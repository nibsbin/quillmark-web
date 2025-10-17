/**
 * Quill loading utilities
 * 
 * The opinionated approach: All Quills must be loaded from .zip files.
 */

import { unzip } from 'fflate';
import { detectBinaryFile, insertPath } from './utils';

/**
 * Load a Quill template from a .zip file
 * 
 * This is the primary and opinionated way to load Quills in the browser.
 * All Quill templates should be packaged as .zip files for consistent,
 * portable, and secure distribution.
 * 
 * @param zipFile - Zip file containing Quill template (must include Quill.toml at root)
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if zip is invalid or missing Quill.toml
 * 
 * @example
 * // Load from user upload
 * const input = document.querySelector('input[type="file"]');
 * input.addEventListener('change', async (e) => {
 *   const zipFile = e.target.files[0];
 *   const quillJson = await fromZip(zipFile);
 *   
 *   const engine = QuillmarkEngine.create();
 *   const quill = Quill.fromJson(JSON.stringify(quillJson));
 *   engine.registerQuill(quill);
 * });
 * 
 * @example
 * // Load from server
 * const response = await fetch('/quills/my-template.zip');
 * const zipBlob = await response.blob();
 * const quillJson = await fromZip(zipBlob);
 * 
 * const engine = QuillmarkEngine.create();
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
      
      // Check if Quill.toml is nested inside a single top-level folder
      let pathPrefix = '';
      const hasQuillTomlAtRoot = Object.keys(unzipped).some(path => path === 'Quill.toml' || path === 'Quill.toml/');
      
      if (!hasQuillTomlAtRoot) {
        // Find all top-level entries (files and folders)
        const topLevelEntries = new Set<string>();
        for (const path of Object.keys(unzipped)) {
          const firstSlash = path.indexOf('/');
          if (firstSlash > 0) {
            topLevelEntries.add(path.substring(0, firstSlash));
          }
        }
        
        // If there's only one top-level folder, check if it contains Quill.toml
        if (topLevelEntries.size === 1) {
          const [topFolder] = Array.from(topLevelEntries);
          const nestedQuillToml = `${topFolder}/Quill.toml`;
          if (unzipped[nestedQuillToml]) {
            pathPrefix = topFolder + '/';
          }
        }
      }
      
      // Process each file in the zip
      for (const [path, fileData] of Object.entries(unzipped)) {
        // Skip directories (they end with /)
        if (path.endsWith('/')) continue;
        
        // Skip files outside the path prefix
        if (pathPrefix && !path.startsWith(pathPrefix)) continue;
        
        // Remove the path prefix if it exists
        const relativePath = pathPrefix ? path.substring(pathPrefix.length) : path;
        const parts = relativePath.split('/');
        
        if (detectBinaryFile(path)) {
          // Binary file - store as number array (WASM JSON deserialization requires plain arrays)
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
      
      // Wrap in the expected format for Quill.fromJson
      resolve({
        files: quillObj
      });
    });
  });
}
