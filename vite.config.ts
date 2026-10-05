import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { handleApiRequest } from './server/apiHandler.mjs';

function cloudflareProxyDevPlugin(): Plugin {
  return {
    name: 'cloudflare-proxy-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] ?? '';
        if (!urlPath.startsWith('/api') && urlPath !== '/health') {
          return next();
        }

        try {
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const host = req.headers.host || 'localhost:5173';
          const fullUrl = `${protocol}://${host}${req.url}`;

          const headers = new Headers();
          for (const [key, val] of Object.entries(req.headers)) {
            if (val != null) {
              if (Array.isArray(val)) {
                val.forEach(v => headers.append(key, v));
              } else {
                headers.set(key, val);
              }
            }
          }

          const webReq = new Request(fullUrl, {
            method: req.method,
            headers,
          });

          const webRes = await handleApiRequest(webReq, process.env);

          res.statusCode = webRes.status;
          webRes.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });

          if (req.method === 'HEAD' || !webRes.body) {
            res.end();
            return;
          }

          const reader = webRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Vite proxy middleware error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), cloudflareProxyDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  },
});
