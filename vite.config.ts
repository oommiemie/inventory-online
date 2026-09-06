import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/* Built for GitHub Pages, which serves the app from /<repo>/.
   Dev keeps the root path so http://localhost:5173 works unchanged. */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/inventory-online/' : '/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, open: false },
}))
