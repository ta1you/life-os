import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/life-os/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Life OS',
        short_name: 'Life OS',
        description: 'あなた専用のスケジュール＆収支管理アプリ',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})