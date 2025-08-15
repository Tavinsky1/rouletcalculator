import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Root path for Vercel deployment
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
})
