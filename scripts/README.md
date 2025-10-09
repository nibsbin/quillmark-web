# Scripts

This directory contains utility scripts for the Quillmark Web project.

## package-quills.js

Packages quill templates from the `public/tonguetoquill-collection/quills/` directory into zip files for use in the playground.

### Usage

```bash
npm run package:quills
```

This script:
1. Reads all quill directories from `public/tonguetoquill-collection/quills/`
2. Packages each quill into a zip file
3. Saves the zip files to `public/quills/`

### Requirements

- Each quill directory must contain a `Quill.toml` file at its root
- The script uses `fflate` for zip compression (already a project dependency)

### When to Use

Run this script whenever:
- You update the `tonguetoquill-collection` subtree
- You make changes to quill templates in `public/tonguetoquill-collection/quills/`
- You need to regenerate the playground quill zip files
