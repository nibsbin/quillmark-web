#!/usr/bin/env node

/**
 * Package Quills Script
 * 
 * This script packages quill templates from the tonguetoquill-collection
 * subtree into zip files for use in the playground.
 * 
 * Usage: node scripts/package-quills.js
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative } from 'path';
import { zipSync } from 'fflate';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QUILLS_SOURCE_DIR = join(__dirname, '../public/tonguetoquill-collection/quills');
const QUILLS_OUTPUT_DIR = join(__dirname, '../public/quills');

/**
 * Recursively read all files in a directory
 */
async function readDirectoryRecursive(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = {};

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      const subFiles = await readDirectoryRecursive(fullPath, baseDir);
      Object.assign(files, subFiles);
    } else {
      const content = await readFile(fullPath);
      files[relativePath] = content;
    }
  }

  return files;
}

/**
 * Package a single quill into a zip file
 */
async function packageQuill(quillName) {
  const quillDir = join(QUILLS_SOURCE_DIR, quillName);
  const outputPath = join(QUILLS_OUTPUT_DIR, `${quillName}.zip`);

  console.log(`Packaging ${quillName}...`);

  // Read all files in the quill directory
  const files = await readDirectoryRecursive(quillDir);

  // Check if Quill.toml exists
  if (!files['Quill.toml']) {
    throw new Error(`Quill.toml not found in ${quillName}`);
  }

  // Create zip file
  const zipped = zipSync(files, { level: 9 });

  // Ensure output directory exists
  await mkdir(QUILLS_OUTPUT_DIR, { recursive: true });

  // Write zip file
  await writeFile(outputPath, zipped);

  console.log(`✓ Created ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Packaging quills from tonguetoquill-collection...\n');

    // Get list of quills
    const quills = await readdir(QUILLS_SOURCE_DIR, { withFileTypes: true });
    const quillDirs = quills.filter(entry => entry.isDirectory()).map(entry => entry.name);

    console.log(`Found ${quillDirs.length} quills: ${quillDirs.join(', ')}\n`);

    // Package each quill
    for (const quillName of quillDirs) {
      await packageQuill(quillName);
    }

    console.log('\n✓ All quills packaged successfully!');
  } catch (error) {
    console.error('Error packaging quills:', error);
    process.exit(1);
  }
}

main();
