import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { apiRouter, errorHandler } from './routes/api.js';
import { mcpRouter } from './routes/mcp.js';

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

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);
  app.use('/mcp', mcpRouter);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});
