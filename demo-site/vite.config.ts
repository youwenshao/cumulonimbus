import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import vike from 'vike/plugin';

export default defineConfig({
  base: '/demo-static/',
  plugins: [react(), vike({ prerender: true })],
});
