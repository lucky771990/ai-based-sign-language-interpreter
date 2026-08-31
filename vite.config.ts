import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// Plugin to create 404.html as a copy of index.html for SPA GitHub Pages fallback
function githubPagesSpaFallback(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      const fallbackPath = path.join(distDir, '404.html');
      // Copy after Vite finishes writing the index.html
      setTimeout(() => {
        try {
          if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, fallbackPath);
          }
        } catch (e) {
          console.warn('Could not copy 404.html fallback:', e);
        }
      }, 100);
    },
  };
}

export default defineConfig(() => {
  // Support custom base path (e.g. /my-repo-name/) or relative path ('./') by default
  const basePath = process.env.BASE_PATH || process.env.VITE_BASE_PATH || './';

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), githubPagesSpaFallback()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      emptyOutDir: false,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
