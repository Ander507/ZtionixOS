import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/os/',
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    open: '/os/',
  },
})
