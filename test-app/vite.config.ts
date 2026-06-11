import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { piDesignVitePlugin } from '@pi-design/react-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    piDesignVitePlugin({
      projectRoot: import.meta.dirname,
    }),
  ],
})
