/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@contexts': resolve(__dirname, 'src/contexts'),
    },
  },

  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },

  // Build configuration
  build: {
    // Target modern browsers
    target: 'esnext',
    // Generate sourcemaps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'antd': ['antd'],
          'blockly': ['blockly'],
          'icons': ['lucide-react'],
          'tauri': ['@tauri-apps/api', '@tauri-apps/plugin-shell', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs', '@tauri-apps/plugin-http'],
          'utils': ['styled-components'],
        },
        // 优化chunk命名
        chunkFileNames: (chunkInfo: any) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification in production
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
  },

  // Prevent vite from obscuring rust errors
  clearScreen: false,

  // Development server configuration
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
    // Enable HMR
    hmr: {
      overlay: true,
    },
    watch: {
      // Tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**', '**/target/**', '**/Cargo.lock'],
    },
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'blockly', 'styled-components', 'lucide-react'],
    exclude: ['@tauri-apps/api'],
    // 强制预构建
    force: true,
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}); 