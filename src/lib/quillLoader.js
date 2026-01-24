/**
 * Helper utilities for loading Quill directories into WASM-compatible JSON format
 */

import * as fs from 'fs';
import * as path from 'path';
import { readDirectorySync, buildFileTree } from './fileSources.js';

/**
 * Load a Quill directory into WASM-compatible JSON format
 * @param {string} quillPath - Path to Quill directory
 * @returns {object} - Quill JSON with {files: {...}}
 */
export function loadQuill(quillPath) {
  const fileMap = readDirectorySync(quillPath, fs, path);
  const files = buildFileTree(fileMap, {
    format: 'nested',
    wrapContents: true,
    detectBinary: true
  });

  return { files };
}

/**
 * Load the markdown example from a Quill directory
 * @param {string} quillPath - Path to Quill directory
 * @param {string} markdownFile - Name of markdown file (default: from Quill.toml)
 * @returns {string} - Markdown content
 */
export function loadQuillMarkdown(quillPath, markdownFile = null) {
  if (!markdownFile) {
    // Try to parse Quill.yaml to find example field
    const yamlPath = path.join(quillPath, 'Quill.yaml');

    try {
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');

      // Simple regex to extract example_file: "filename" or example_file: filename
      // Handles both quoted and unquoted values
      const match = yamlContent.match(/example_file\s*:\s*"?([^"\n]+)"?/);
      if (match) {
        markdownFile = match[1].trim();
      } else {
        throw new Error('No example_file field found in Quill.yaml');
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('Quill.yaml not found');
      }
      throw e;
    }
  }

  const mdPath = path.join(quillPath, markdownFile);
  return fs.readFileSync(mdPath, 'utf8');
}
