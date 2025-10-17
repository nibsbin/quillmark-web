/**
 * This test loads the usaf_form_8 Quill (acroform backend), renders it using WASM
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
const USAF_FORM_8_QUILL_PATH = path.join(WORKSPACE_ROOT, 'tonguetoquill-collection', 'quills', 'usaf_form_8')
const WASM_OUTPUT_PATH = path.join(__dirname, 'output', 'usaf_form_8_wasm_output.pdf')

describe('WASM usaf_form_8 smoke test', () => {
  let quillJson
  let markdown

  beforeAll(() => {
    // Ensure output directory exists
    const outputDir = path.dirname(WASM_OUTPUT_PATH)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Load the Quill structure
    console.log('Loading usaf_form_8 Quill...')
    quillJson = loadQuill(USAF_FORM_8_QUILL_PATH)
    
    // Load the markdown example
    markdown = loadQuillMarkdown(USAF_FORM_8_QUILL_PATH)
    console.log(`Markdown loaded: ${markdown.length} chars`)
  })

  it('should load usaf_form_8 Quill successfully', () => {
    expect(quillJson).toBeDefined()
    expect(quillJson.files).toBeDefined()
    expect(quillJson.files['Quill.toml']).toBeDefined()
    expect(quillJson.files['form.pdf']).toBeDefined()
    expect(quillJson.files['usaf_form_8.md']).toBeDefined()
  })

  it('should parse usaf_form_8 markdown', () => {
    const parsed = Quillmark.parseMarkdown(markdown)
    
    expect(parsed).toBeDefined()
    expect(parsed.fields).toBeDefined()
    expect(parsed.quillTag).toBe('usaf_form_8')
    expect(parsed.fields.examinee).toBeDefined()
    expect(parsed.fields.dod_id).toBeDefined()
  })

  it('should register usaf_form_8 Quill', () => {
    const engine = new Quillmark()
    
    expect(() => {
      engine.registerQuill('usaf_form_8', quillJson)
    }).not.toThrow()
    
    const quills = engine.listQuills()
    expect(quills).toContain('usaf_form_8')
  })

  it('should get usaf_form_8 Quill info', () => {
    const engine = new Quillmark()
    engine.registerQuill('usaf_form_8', quillJson)
    
    const info = engine.getQuillInfo('usaf_form_8')
    
    expect(info).toBeDefined()
    expect(info.name).toBe('usaf_form_8')
    expect(info.backend).toBe('acroform')
    expect(info.supportedFormats).toContain('pdf')
  })

  it('should render usaf_form_8 to PDF via WASM', () => {
    const parsed = Quillmark.parseMarkdown(markdown)
    const engine = new Quillmark()
    engine.registerQuill('usaf_form_8', quillJson)
    
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

  it('renderin', () => {
    // Render via WASM
    const parsed = Quillmark.parseMarkdown(markdown)
    const engine = new Quillmark()
    engine.registerQuill('usaf_form_8', quillJson)
    
    const result = engine.render(parsed, { format: 'pdf' })
    const wasmPdf = Buffer.from(result.artifacts[0].bytes)

    // Compare file sizes
    console.log(`WASM PDF: ${wasmPdf.length} bytes`)

    // Compute hashes for comparison
    const wasmHash = crypto.createHash('sha256').update(wasmPdf).digest('hex')

    console.log(`WASM PDF SHA256: ${wasmHash}`)
  })
})
