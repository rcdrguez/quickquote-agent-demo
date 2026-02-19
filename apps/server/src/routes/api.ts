import { Router } from 'express';
import { ZodError } from 'zod';
import { createCustomer, listCustomers, updateCustomer } from '../services/customers.js';
import { createQuote, getQuote, listQuotes } from '../services/quotes.js';
import { customerPayloadSchema, quotePayloadSchema } from '../schemas.js';
import { AppError } from '../utils/errors.js';
import { addServerLog, listServerLogs } from '../logs.js';

const router = Router();

router.get('/customers', async (_req, res, next) => {
  try {
    res.json(await listCustomers());
  } catch (error) {
    next(error);
  }
});

router.post('/customers', async (req, res, next) => {
  try {
    const payload = customerPayloadSchema.parse(req.body);
    res.status(201).json(await createCustomer(payload));
  } catch (error) {
    next(error);
  }
});

router.put('/customers/:id', async (req, res, next) => {
  try {
    const payload = customerPayloadSchema.parse(req.body);
    const customer = await updateCustomer(req.params.id, payload);
    if (!customer) throw new AppError('Cliente no encontrado', 404);
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.get('/quotes', async (_req, res, next) => {
  try {
    res.json(await listQuotes());
  } catch (error) {
    next(error);
  }
});

router.post('/quotes', async (req, res, next) => {
  try {
    const payload = quotePayloadSchema.parse(req.body);
    res.status(201).json(await createQuote(payload));
  } catch (error) {
    next(error);
  }
});

router.get('/quotes/:id', async (req, res, next) => {
  try {
    const quote = await getQuote(req.params.id);
    if (!quote) throw new AppError('Cotización no encontrada', 404);
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

router.get('/logs', (_req, res) => {
  res.json(listServerLogs());
});

export const apiRouter = router;

export const errorHandler = (error: unknown, req: any, res: any, _next: any) => {
  addServerLog({
    level: 'error',
    event: `error ${req.method} ${req.path}`,
    details: { message: error instanceof Error ? error.message : 'unknown_error' }
  });

  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Validación inválida', details: error.flatten() });
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, details: error.details });
  }

  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor' });
};
