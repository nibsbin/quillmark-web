/**
 * Quill loading utilities
 *
 * The opinionated approach: All Quills must be loaded from .zip files.
 */

import { unzip } from 'fflate';
import { extractZipFiles, buildFileTree } from './fileSources.js';

/**
 * Load a Quill template from a .zip file
 * 
 * This is the primary and opinionated way to load Quills in the browser.
 * All Quill templates should be packaged as .zip files for consistent,
 * portable, and secure distribution.
 * 
 * @param zipFile - Zip file containing Quill template (must include Quill.yaml at root)
 * @returns Quill JSON object ready for registerQuill()
 * @throws Error if zip is invalid or missing Quill.yaml
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

  // Unzip using fflate
  return new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (err, unzipped) => {
      if (err) {
        reject(new Error(`Failed to unzip file: ${err.message}`));
        return;
      }

      // Check if Quill.yaml is nested inside a single top-level folder
      let pathPrefix = '';
      const hasQuillYamlAtRoot = Object.keys(unzipped).some(path => path === 'Quill.yaml' || path === 'Quill.yaml/');

      if (!hasQuillYamlAtRoot) {
        // Find all top-level entries (files and folders)
        const topLevelEntries = new Set<string>();
        for (const path of Object.keys(unzipped)) {
          const firstSlash = path.indexOf('/');
          if (firstSlash > 0) {
            topLevelEntries.add(path.substring(0, firstSlash));
          }
        }

        // If there's only one top-level folder, check if it contains Quill.yaml
        if (topLevelEntries.size === 1) {
          const [topFolder] = Array.from(topLevelEntries);
          const nestedQuillYaml = `${topFolder}/Quill.yaml`;
          if (unzipped[nestedQuillYaml]) {
            pathPrefix = topFolder + '/';
          }
        }
      }

      // Extract files from zip and build tree
      const fileMap = extractZipFiles(unzipped, pathPrefix);
      const files = buildFileTree(fileMap, {
        format: 'nested',
        wrapContents: true,
        detectBinary: true
      });

      // Validate that Quill.yaml exists
      if (!files['Quill.yaml']) {
        reject(new Error('Quill.yaml not found in zip file. Make sure it exists at the root of the archive.'));
        return;
      }

      // Wrap in the expected format for Quill.fromJson
      resolve({
        files: files
      });
    });
  });
}
