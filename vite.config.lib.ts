import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/lib/**/*'],
      outDir: 'dist/lib',
      copyDtsFiles: true
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
      // Externalize dependencies that shouldn't be bundled
      external: ['@quillmark-test/wasm', 'fflate'],
      output: {
        // Provide global variables for UMD build (if needed later)
        globals: {
          '@quillmark-test/wasm': 'QuillmarkWasm',
          'fflate': 'fflate'
        }
      }
    },
    sourcemap: true,
    outDir: 'dist/lib',
    emptyOutDir: true
  }
});
