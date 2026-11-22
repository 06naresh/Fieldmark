import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig, type Plugin } from 'vitest/config';

const buildId =
  process.env.FIELDMARK_PWA_BUILD_ID ?? process.env.GITHUB_SHA ?? `${Date.now().toString(36)}-${process.pid}`;
const previewBackendPort =
  process.env.SMOKE_BACKEND_PORT ?? process.env.E2E_BACKEND_PORT ?? '8000';

/** Mirror the Vercel response headers so local smoke checks validate the deployed policy. */
function vercelPreviewHeaders(): Plugin {
  return {
    name: 'fieldmark-vercel-preview-headers',
    apply: 'serve',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0];
        if (['/sw.js', '/asset-manifest.json', '/index.html'].includes(path)) {
          response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (path.startsWith('/assets/')) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (path === '/manifest.webmanifest') {
          response.setHeader('Cache-Control', 'public, max-age=3600');
        }
        next();
      });
    },
  };
}

function pwaAssetManifest(): Plugin {
  let base = '/';

  return {
    name: 'fieldmark-pwa-asset-manifest',
    apply: 'build',
    configResolved(config) {
      base = config.base || '/';
    },
    generateBundle(_options, bundle) {
      const normalizedBase = base.endsWith('/') ? base : `${base}/`;
      const assets = Object.keys(bundle)
        .filter((fileName) => /\.(?:js|css|png|svg|webp|woff2?|ttf)$/i.test(fileName))
        .filter((fileName) => fileName !== 'sw.js' && !fileName.endsWith('/sw.js'))
        .map((fileName) => `${normalizedBase}${fileName}`);

      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify({ assets }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaAssetManifest(), vercelPreviewHeaders()],
  define: {
    __FIELDMARK_BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    // Local production-style smoke checks use the same-origin API path that
    // the Vercel rewrite provides. E2E tests override VITE_API_BASE_URL and
    // call the backend directly instead.
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${previewBackendPort}`,
        changeOrigin: true,
      },
      '/health': {
        target: `http://127.0.0.1:${previewBackendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sw: fileURLToPath(new URL('./src/pwa/sw.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
