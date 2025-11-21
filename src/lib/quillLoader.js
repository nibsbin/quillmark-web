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
    // Try to parse Quill.toml to find example field
    const tomlPath = path.join(quillPath, 'Quill.toml');
    const tomlContent = fs.readFileSync(tomlPath, 'utf8');
    
    // Simple regex to extract example = "filename"
    const match = tomlContent.match(/example\s*=\s*"([^"]+)"/);
    if (match) {
      markdownFile = match[1];
    } else {
      throw new Error('No markdown file specified and no example field found in Quill.toml');
    }
  }

  const mdPath = path.join(quillPath, markdownFile);
  return fs.readFileSync(mdPath, 'utf8');
}
