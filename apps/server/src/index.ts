import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { apiRouter, errorHandler } from './routes/api.js';
import { mcpRouter } from './routes/mcp.js';
import { addServerLog } from './logs.js';

const PORT = Number(process.env.PORT || 8787);

async function bootstrap() {
  await initDb();

  const app = express();
  app.use(
    cors({
      origin: ['http://localhost:5173'],
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
