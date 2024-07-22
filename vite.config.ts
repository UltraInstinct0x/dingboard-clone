import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/dingboard-clone/',

  plugins: [
      react(),
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
