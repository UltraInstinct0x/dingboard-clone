import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/dingboard-clone/',
  server: {
    https: true,
  },
  plugins: [
      react(),
      mkcert(),
      viteStaticCopy({
          targets: [
              {
                  src: 'node_modules/onnxruntime-web/dist/*.wasm',
                  dest: 'wasm-files',
              },
          ]
        }),
    ],
})
