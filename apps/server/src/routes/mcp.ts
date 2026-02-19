import { Router } from 'express';
import { ZodError, z } from 'zod';
import { createCustomer, listCustomers } from '../services/customers.js';
import { createQuoteByCustomerNameOrId, getQuote, listQuotes } from '../services/quotes.js';
import { mcpCreateCustomerSchema, mcpCreateQuoteSchema, mcpGetQuoteSchema } from '../schemas.js';
import { AppError } from '../utils/errors.js';

const bodySchema = z.object({
  tool: z.string().min(1),
  input: z.record(z.any()).optional().default({})
});

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { tool, input } = bodySchema.parse(req.body);

    if (tool === 'create_customer') {
      const payload = mcpCreateCustomerSchema.parse(input);
      const result = await createCustomer(payload);
      return res.json({ ok: true, result });
    }

    if (tool === 'list_customers') {
      const result = await listCustomers();
      return res.json({ ok: true, result });
    }

    if (tool === 'create_quote') {
      const payload = mcpCreateQuoteSchema.parse(input);
      const result = await createQuoteByCustomerNameOrId(payload);
      return res.json({ ok: true, result });
    }

    if (tool === 'list_quotes') {
      const result = await listQuotes();
      return res.json({ ok: true, result });
    }

    if (tool === 'get_quote') {
      const payload = mcpGetQuoteSchema.parse(input);
      const result = await getQuote(payload.id);
      if (!result) {
        return res.status(404).json({ ok: false, error: { message: 'Cotización no encontrada' } });
      }
      return res.json({ ok: true, result });
    }

    return res.status(400).json({ ok: false, error: { message: `Tool no soportado: ${tool}` } });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Validación inválida', details: error.flatten() }
      });
    }
    if (error instanceof AppError) {
      return res.status(error.status).json({ ok: false, error: { message: error.message, details: error.details } });
    }

    console.error(error);
    return res.status(500).json({ ok: false, error: { message: 'Error interno del servidor' } });
  }
});

export const mcpRouter = router;
