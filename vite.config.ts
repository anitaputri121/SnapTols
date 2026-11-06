import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
// @ts-ignore - modul server bersama (JS)
import { chat as chatHandler } from './server/handlers.mjs';

function snapingChatPlugin(): Plugin {
  // Dev lokal: /api/chat memakai handler server yang sama dengan Vercel/Netlify (kunci ANITA_API_KEY dari .env).
  return {
    name: 'snaping-chat-endpoint',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url !== '/api/chat') return next();
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          const method = req.method || 'GET';
          const request = new Request(`http://localhost${req.url}`, {
            method,
            headers: { 'content-type': 'application/json' },
            body: method === 'GET' || method === 'HEAD' ? undefined : body,
          });
          const response: Response = await chatHandler(request);
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(await response.text());
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Kunci API hanya dibaca dari file .env / variabel lingkungan (tidak ditulis di kode).
  const env = loadEnv(mode, process.cwd(), '');
  const nexaKey = String(env.ANITA_API_KEY || env.NEXA_KEY || '').trim();
  const zapiKey = String(env.NITA_API_KEY || '').trim();
  if (nexaKey && !process.env.ANITA_API_KEY) process.env.ANITA_API_KEY = nexaKey;
  const withKey = (p: string) => {
    if (!nexaKey) return p;
    const u = new URL(p, 'http://localhost');
    for (const name of ['key', 'apikey', 'apiKey']) u.searchParams.delete(name);
    u.searchParams.set('key', nexaKey);
    return u.pathname + u.search;
  };

  return {
    plugins: [react(), tailwindcss(), snapingChatPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/tikwm': {
          target: 'https://www.tikwm.com',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/api\/tikwm/, '/api/'),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        '/tools-api': {
          target: 'https://api.nexadev.my.id',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => withKey(path.replace(/^\/tools-api/, '')),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        '/anime-api': {
          target: 'https://apii.nexadev.my.id',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => withKey(path.replace(/^\/anime-api/, '')),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        '/zapi-api': {
          target: 'https://api.zapi.ink',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/zapi-api/, '/v1'),
          headers: zapiKey ? { 'x-api-key': zapiKey, Authorization: `Bearer ${zapiKey}` } : {},
        },
        '/zapi-file': {
          target: 'https://api.zapi.ink',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/zapi-file/, ''),
          headers: zapiKey ? { 'x-api-key': zapiKey, Authorization: `Bearer ${zapiKey}` } : {},
        },
        '/image-api': {
          target: 'https://clooud.my.id',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/image-api/, ''),
        },
        '/media-api': {
          target: 'https://api.nexadev.my.id',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => withKey(path.replace(/^\/media-api/, '/api')),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      },
    },
  };
});
