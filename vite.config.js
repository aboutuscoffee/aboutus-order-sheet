import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/aboutus-order-sheet/',
  server: { port: 5181 },
});
