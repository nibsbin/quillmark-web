import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
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
