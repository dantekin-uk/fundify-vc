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
    'process.env': {}, // Ensure process.env is an object
    'process.env.REACT_APP_FIREBASE_API_KEY': JSON.stringify(import.meta.env.VITE_FIREBASE_API_KEY),
    'process.env.REACT_APP_FIREBASE_AUTH_DOMAIN': JSON.stringify(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    'process.env.REACT_APP_FIREBASE_PROJECT_ID': JSON.stringify(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    'process.env.REACT_APP_FIREBASE_STORAGE_BUCKET': JSON.stringify(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    'process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'process.env.REACT_APP_FIREBASE_APP_ID': JSON.stringify(import.meta.env.VITE_FIREBASE_APP_ID),
    'process.env.REACT_APP_FIREBASE_MEASUREMENT_ID': JSON.stringify(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
    'process.env.REACT_APP_USE_FIREBASE_EMULATORS': JSON.stringify(import.meta.env.VITE_USE_FIREBASE_EMULATORS || 'false'),
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
