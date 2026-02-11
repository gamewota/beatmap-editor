import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Detect mode from environment or command line args
const isLib = process.env.BUILD_MODE === 'lib';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  // Base path for GitHub Pages
  base: isGitHubPages ? '/beatmap-editor/' : '/',
  
  build: isLib ? {
    // Library build configuration (for microfrontend)
    lib: {
      entry: resolve(__dirname, 'src/web-component.ts'),
      name: 'BeatmapEditor',
      fileName: (format) => `beatmap-editor.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Externalize peer dependencies
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  } : {
    // Regular app build
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  
  // CSS handling
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
})
