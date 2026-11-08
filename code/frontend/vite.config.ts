import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

// Design system compartido del repositorio (design-system/ en la raíz).
const designSystem = fileURLToPath(new URL('../../design-system', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: { '@ds': designSystem },
  },
  server: {
    // Permite servir el design system, que está fuera de code/frontend.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), designSystem] },
    // La aplicación llama a /api/...; en desarrollo se redirige a la API NestJS.
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:3000',
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    // El sprite de íconos del design system se usa con <use href="sprite.svg#icono">,
    // que no funciona con data: URLs: se emite siempre como archivo.
    assetsInlineLimit: (archivo) => (archivo.endsWith('sprite.svg') ? false : undefined),
    // Dos páginas: la landing pública (/) y la aplicación por roles (/app/).
    rolldownOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
      },
    },
  },
})
