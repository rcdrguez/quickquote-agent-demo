import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { apiRouter, errorHandler } from './routes/api.js';
import { mcpRouter } from './routes/mcp.js';
import { addServerLog } from './logs.js';

const PORT = Number(process.env.PORT || 8787);

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'https://quickquote-agent-demo-web.vercel.app'];

function getAllowedOrigins() {
  const envOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  return envOrigins?.length ? envOrigins : DEFAULT_ALLOWED_ORIGINS;
}

async function bootstrap() {
  await initDb();

  const app = express();
  const allowedOrigins = getAllowedOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: false
    })
  );
  app.use(express.json());
  app.use((req, _res, next) => {
    addServerLog({
      level: 'info',
      event: `${req.method} ${req.path}`,
      details: Object.keys(req.body || {}).length ? { body: req.body } : undefined
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);
  app.use('/mcp', mcpRouter);
  app.use(errorHandler);

  app.listen(PORT, () => {
    addServerLog({ level: 'info', event: `server_started`, details: { url: `http://localhost:${PORT}` } });
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});
