// Сборка прототипа в ОДИН самодостаточный index.html (всё инлайнено):
//   npm run build:single  →  dist/index.html  (двойной клик → открывается в браузере)
// Карты/шрифты тянутся из сети; код, стили и данные — внутри файла.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-single', assetsInlineLimit: 100000000, cssCodeSplit: false },
})
