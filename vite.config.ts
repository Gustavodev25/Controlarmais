import { defineConfig, type ViteDevServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const backendPort = process.env.BACKEND_PORT || process.env.PORT || '3000'
const backendTarget = `http://127.0.0.1:${backendPort}`

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
      '.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        configure(proxy) {
          proxy.on('error', (error, _req, res) => {
            const message = error?.message || 'Backend local indisponivel'
            console.warn(`[vite proxy] API indisponivel em ${backendTarget}: ${message}`)

            if (!res || res.headersSent || typeof res.writeHead !== 'function') return
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              error: 'API local indisponivel. Inicie o backend com npm run dev ou npm run server.',
              details: message,
            }))
          })
        },
      }
    }
  }
})
