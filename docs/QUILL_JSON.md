# Quill JSON Contract

Summary
- Input to `Quill::from_json` (core) and the WASM wrapper `Quill.fromJson` (JS) is a JSON string whose root value MUST be an object.
- The root object represents the Quill file tree. Two optional, reserved top-level metadata keys are supported: `name` and `base_path`.

Node shapes
- File (UTF‑8 text):
  - `"path/to/file.txt": { "contents": "...utf-8 text..." }`

- File (binary embedded as JSON numbers):
  - `"image.png": { "contents": [137, 80, 78, 71, ...] }`
  - Use this only when embedding binary blobs into JSON. Each element is a byte (0–255).

- Directory (explicit `files` map):
  - `"dir": { "files": { "a.txt": { "contents": "..." } } }`

- Directory (shorthand, nested object):
  - `"dir": { "a.txt": { "contents": "..." }, "sub": { "files": { ... } } }`

Reserved keys
- `name` (optional): default name used if `Quill.toml` does not provide one.
- `base_path` (optional): base path for resolving assets and packages.
  - Deprecated for client payloads: the client SHOULD NOT send `base_path`; servers or the core implementation may set base paths during validation/resolution.

Validation
- After parsing, the implementation MUST validate the Quill. Examples:
  - `Quill.toml` must exist and be valid TOML.
  - The `glue` entry in `Quill.toml` must reference an existing glue file in the parsed tree.
- Any validation errors MUST be returned as failures from `from_json`.

JS / WASM notes
- The WASM wrapper `Quill.fromJson` expects a JSON string. Build a JS object following this contract and call `JSON.stringify(obj)` before passing it into WASM.
  - Helpers that fetch many files should spread the file map into the root object so that file names (for example `Quill.toml`) appear as top-level keys. Reserved keys `name` and `base_path` must also be top-level.
- When embedding binary files into JSON, convert a `Uint8Array` to an array of numeric bytes, e.g. `Array.from(uint8arr)`.
- For runtime APIs that accept binary buffers directly (for example `withAsset`), pass a `Uint8Array`/`Buffer` instead of JSON-encoding the bytes.

Minimal example
```
{
  "name": "my-quill",
  "base_path": "/",
  "Quill.toml": { "contents": "[Quill]\nname = \"my-quill\"\nbackend = \"typst\"\nglue = \"glue.typ\"\n" },
  "glue.typ": { "contents": "= Template\n\n{{ body }}" }
}
```

Binary example (embed image)
```
{
  "Quill.toml": { "contents": "..." },
  "glue.typ": { "contents": "..." },
  "assets": {
    "logo.png": { "contents": [137, 80, 78, 71, ...] }
  }
}
```

Implementation note
- This contract is enforced by `quillmark-core::Quill::from_json` (parsing and merging) and by the WASM binding which exposes `Quill.fromJson` (JS name) that forwards to the same core parser.

That's the canonical contract; keep implementations consistent with this document.