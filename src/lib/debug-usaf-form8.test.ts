import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { Quillmark } from '@quillmark-test/wasm';
import * as loaders from './loaders';

describe('usaf_form_8 debugging', () => {
  it('should load and inspect usaf_form_8', async () => {
    const zipData = await readFile('./public/quills/usaf_form_8.zip');
    const quillJson = await loaders.fromZip(zipData);
    
    console.log('\n=== Quill JSON Structure ===');
    console.log('Top-level keys:', Object.keys(quillJson));
    console.log('Files keys:', Object.keys(quillJson.files));
    
    const formPdf = quillJson.files['form.pdf'];
    console.log('\n=== form.pdf ===');
    console.log('Type:', formPdf?.contents?.constructor?.name);
    console.log('Length:', formPdf?.contents?.length);
    console.log('First 10 bytes:', formPdf?.contents?.slice(0, 10));
    
    // Register with engine
    const engine = new Quillmark();
    engine.registerQuill('usaf_form_8', quillJson);
    
    console.log('\n=== Engine Status ===');
    console.log('Registered quills:', engine.listQuills());
    
    const info = engine.getQuillInfo('usaf_form_8');
    console.log('\n=== Quill Info ===');
    console.log(JSON.stringify(info, null, 2));
    
    // Parse example markdown
    const markdown = quillJson.files['usaf_form_8.md'].contents;
    const parsed = Quillmark.parseMarkdown(markdown);
    
    console.log('\n=== Parsed Document ===');
    console.log('Quill tag:', parsed.quillTag);
    console.log('Fields keys:', Object.keys(parsed.fields));
    console.log('Sample field (dod_id):', parsed.fields.dod_id);
    console.log('Sample field (examinee):', JSON.stringify(parsed.fields.examinee));
    
    // Render
    const result = engine.render(parsed, { format: 'pdf' });
    
    console.log('\n=== Render Result ===');
    console.log('Artifacts count:', result.artifacts?.length);
    console.log('First artifact bytes length:', result.artifacts[0]?.bytes?.length);
    
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts.length).toBeGreaterThan(0);
  });
});
