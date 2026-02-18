import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Detect mode from environment or command line args
const isLib = process.env.BUILD_MODE === 'lib'
const isWebComponent = process.env.BUILD_MODE === 'wc'
const isGitHubPages = process.env.GITHUB_PAGES === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  // Base path for GitHub Pages
  base: isGitHubPages ? '/beatmap-editor/' : '/',
  
  build: isLib ? {
    // Library build configuration (React component library)
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BeatmapEditor',
      fileName: (format) => `beatmap-editor.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Externalize peer dependencies
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        // Ensure CSS is extracted to style.css
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'style.css'
          }
          return assetInfo.name || 'assets/[name][extname]'
        }
      }
    },
    // Generate CSS file - must be false to extract a single CSS file
    cssCodeSplit: false,
    emptyOutDir: false
  } : isWebComponent ? {
    // Web component build configuration (microfrontend)
    lib: {
      entry: resolve(__dirname, 'src/web-component.ts'),
      name: 'BeatmapEditorWC',
      fileName: (format) => `beatmap-editor-wc.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
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
