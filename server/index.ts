import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createApiApp } from './app.js';

async function bootstrap() {
  const app = createApiApp();
  const httpServer = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const clientDist = path.resolve(process.cwd(), 'dist/client');
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[DutyLens BD] Unified AI HS Code & NBR Tariff Server listening on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
