#!/usr/bin/env node
// Simple script to generate a fixtures manifest from node_modules
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'node_modules', '@quillmark-test', 'fixtures', 'resources');
const out = path.join(__dirname, '..', 'public', 'fixtures-manifest.json');

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(full).map(p => path.join(entry.name, p));
      results.push(...sub);
    } else if (entry.isFile()) {
      results.push(entry.name);
    }
  }
  return results;
}

const manifest = {};
const entries = fs.readdirSync(base, { withFileTypes: true });
for (const e of entries) {
  const full = path.join(base, e.name);
  if (e.isDirectory()) {
    const files = walk(full).map(p => p.replace(/\\\\/g, '/'));
    manifest[e.name] = files;
  }
}

fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log('Wrote', out);
