import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1', // hanya localhost, tidak expose ke jaringan
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/assets/**',
        '**/dist/**',
        '**/dist_electron/**',
        '**/electron/**',
        '**/*.mp4',
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.wav',
        '**/*.mp3',
        '**/*.ass'
      ]
    }
  },
})

