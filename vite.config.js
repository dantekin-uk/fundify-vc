import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all env variables from .env files
  const env = loadEnv(mode, process.cwd(), '');

  // Create a define block to inject env variables
  const define = {};
  for (const key in env) {
    if (key.startsWith('VITE_') || key.startsWith('REACT_APP_')) {
      define[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  // Explicitly expose Paystack public key if provided (do NOT expose secrets)
  if (env.PAYSTACK_PUBLIC_KEY) {
    define['import.meta.env.PAYSTACK_PUBLIC_KEY'] = JSON.stringify(env.PAYSTACK_PUBLIC_KEY);
  }

  return {
    plugins: [
      react({ jsxRuntime: 'automatic' })
    ],
    define,
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
  };
});
