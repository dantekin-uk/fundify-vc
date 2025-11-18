import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config to support CRA-style envs and process.env usage
export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' })
  ],
  // Allow using REACT_APP_* just like CRA
  envPrefix: ['VITE_', 'REACT_APP_'],
  define: {
    'process.env': 'import.meta.env',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
});
