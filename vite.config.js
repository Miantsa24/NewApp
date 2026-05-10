import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/prestashop_edition_classic_version_8.2.6',
        changeOrigin: true,
      }
    }
  },
  define: {
    'import.meta.env.VITE_PRESTASHOP_URL': JSON.stringify(
      'http://localhost/prestashop_edition_classic_version_8.2.6'
    )
  }
})