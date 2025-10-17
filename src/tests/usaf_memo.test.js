/**
 * This test loads the usaf_memo Quill, renders it using WASM
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { Quillmark } from '@quillmark-test/wasm'
import { loadQuill, loadQuillMarkdown } from './quillLoader.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths relative to the workspace root
const WORKSPACE_ROOT = path.join(__dirname, '..', '..')
const USAF_MEMO_QUILL_PATH = path.join(WORKSPACE_ROOT, 'tonguetoquill-collection', 'quills', 'usaf_memo')
const WASM_OUTPUT_PATH = path.join(__dirname, 'output', 'usaf_memo_wasm_output.pdf')

describe('WASM usaf_memo smoke test', () => {
  let quillJson
  let markdown

  beforeAll(() => {
    // Ensure output directory exists
    const outputDir = path.dirname(WASM_OUTPUT_PATH)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Load the Quill structure
    console.log('Loading usaf_memo Quill...')
    quillJson = loadQuill(USAF_MEMO_QUILL_PATH)
    
    // Load the markdown example
    markdown = loadQuillMarkdown(USAF_MEMO_QUILL_PATH)
    console.log(`Markdown loaded: ${markdown.length} chars`)
  })

  it('should load usaf_memo Quill successfully', () => {
    expect(quillJson).toBeDefined()
    expect(quillJson.files).toBeDefined()
    expect(quillJson.files['Quill.toml']).toBeDefined()
    expect(quillJson.files['glue.typ']).toBeDefined()
    expect(quillJson.files['usaf_memo.md']).toBeDefined()
  })

  it('should parse usaf_memo markdown', () => {
    const parsed = Quillmark.parseMarkdown(markdown)
    
    expect(parsed).toBeDefined()
    expect(parsed.fields).toBeDefined()
    expect(parsed.quillTag).toBe('usaf_memo')
    expect(parsed.fields.subject).toBeDefined()
    expect(parsed.fields.memo_for).toBeDefined()
    expect(parsed.fields.memo_from).toBeDefined()
  })

  it('should register usaf_memo Quill', () => {
    const engine = new Quillmark()
    
    expect(() => {
      engine.registerQuill('usaf_memo', quillJson)
    }).not.toThrow()
    
    const quills = engine.listQuills()
    expect(quills).toContain('usaf_memo')
  })

  it('should get usaf_memo Quill info', () => {
    const engine = new Quillmark()
    engine.registerQuill('usaf_memo', quillJson)
    
    const info = engine.getQuillInfo('usaf_memo')
    
    expect(info).toBeDefined()
    expect(info.name).toBe('usaf_memo')
    expect(info.backend).toBe('typst')
    expect(info.supportedFormats).toContain('pdf')
  })

  it('should render usaf_memo to PDF via WASM', () => {
    const parsed = Quillmark.parseMarkdown(markdown)
    const engine = new Quillmark()
    engine.registerQuill('usaf_memo', quillJson)
    
    const result = engine.render(parsed, { format: 'pdf' })
    
    expect(result).toBeDefined()
    expect(result.artifacts).toBeDefined()
    expect(result.artifacts.length).toBe(1)
    expect(result.artifacts[0].format).toBe('pdf')
    expect(result.artifacts[0].bytes).toBeDefined()
    expect(result.artifacts[0].bytes.length).toBeGreaterThan(0)
    expect(result.artifacts[0].mimeType).toBe('application/pdf')

    // Save WASM output for comparison
    const wasmPdf = Buffer.from(result.artifacts[0].bytes)
    fs.writeFileSync(WASM_OUTPUT_PATH, wasmPdf)
    console.log(`WASM PDF saved: ${wasmPdf.length} bytes`)
  })

  it('rendering via wasm', () => {
    // Render via WASM
    const parsed = Quillmark.parseMarkdown(markdown)
    const engine = new Quillmark()
    engine.registerQuill('usaf_memo', quillJson)
    
    const result = engine.render(parsed, { format: 'pdf' })
    const wasmPdf = Buffer.from(result.artifacts[0].bytes)

    // Compare file sizes
    console.log(`WASM PDF: ${wasmPdf.length} bytes`)

    // Compute hashes for comparison
    const wasmHash = crypto.createHash('sha256').update(wasmPdf).digest('hex')

    console.log(`WASM PDF SHA256: ${wasmHash}`)

    // PDFs are functionally identical but not byte-identical due to:
    // 1. Random font subset prefixes (e.g., QGBEVL vs DYJZLR)
    // 2. Random document IDs and instance IDs in XMP metadata
    // These are generated fresh on each Typst compilation.
    
    // Verify both PDFs are valid and similar size
    expect(wasmPdf.length).toBeGreaterThan(1000000) // At least 1MB
    
    // should be valid PDFs (start with %PDF-1.7)
    const wasmHeader = wasmPdf.toString('utf8', 0, 10)
    expect(wasmHeader).toMatch(/^%PDF-1\.\d/)
    
    // should have same Typst creator
    const wasmCreator = wasmPdf.toString('utf8').includes('Creator (Typst 0.13.1)')
    expect(wasmCreator).toBe(true)
  })
})
