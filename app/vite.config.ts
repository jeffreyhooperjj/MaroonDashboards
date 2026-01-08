import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite config (vite.config.js)
  server: {
    proxy: {
      //'/admin': 'http://localhost:8069'
      '/admin': 'https://h9mgp2jta3.us-east-2.awsapprunner.com/'
    }
  }
})
