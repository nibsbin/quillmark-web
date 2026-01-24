#!/usr/bin/env node

/**
 * Package Quills Script
 * 
 * This script packages quill templates from the tonguetoquill-collection
 * subtree into zip files for use in the playground.
 * 
 * Usage: node scripts/package-quills.js
 */

import { readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { zipSync } from 'fflate';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readDirectoryAsync, buildFileTree } from '../src/lib/fileSources.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QUILLS_SOURCE_DIR = join(__dirname, '../tonguetoquill-collection/quills');
const QUILLS_OUTPUT_DIR = join(__dirname, '../public/quills');

/**
 * Package a single quill into a zip file
 */
async function packageQuill(quillName) {
  const quillDir = join(QUILLS_SOURCE_DIR, quillName);
  const outputPath = join(QUILLS_OUTPUT_DIR, `${quillName}.zip`);

  console.log(`Packaging ${quillName}...`);

  // Read directory and build flat tree for zipping
  const fileMap = await readDirectoryAsync(quillDir, fs, path);
  const files = buildFileTree(fileMap, {
    format: 'flat',
    rawBuffers: true
  });

  // Check if Quill.yaml exists
  if (!files['Quill.yaml']) {
    throw new Error(`Quill.yaml not found in ${quillName}`);
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
