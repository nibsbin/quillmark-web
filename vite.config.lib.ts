import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/lib'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/**/*.spec.ts'],
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'QuillmarkWeb',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      // Externalize peer dependencies
      external: ['@quillmark-test/wasm'],
      output: {
        globals: {
          '@quillmark-test/wasm': 'QuillmarkWasm'
        }
      }
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true
  }
});
