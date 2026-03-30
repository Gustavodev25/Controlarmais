import { defineConfig, type ViteDevServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'

function fullReloadAlways() {
  return {
    name: 'full-reload-always',
    handleHotUpdate({ server }: { server: ViteDevServer }) {
      server.ws.send({ type: 'full-reload' })
      return []
    }
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    fullReloadAlways(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 150,
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'breanna-fractious-eely.ngrok-free.dev',
      'angelina-unsalvageable-inconceivably.ngrok-free.dev',
      'toney-nonreversing-cedrick.ngrok-free.dev',
      'burseraceous-adalynn-academically.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
