import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173 },
  // React Native's __DEV__, for code shared with the app.
  define: { __DEV__: JSON.stringify(mode !== 'production') },
}));
