import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  build: {
    outDir: 'dist/playground'
  },
  server: {
    fs: {
      // Allow serving files from node_modules
      allow: ['..']
    }
  },
  optimizeDeps: {
    exclude: ['@quillmark-test/wasm']
  }
});
