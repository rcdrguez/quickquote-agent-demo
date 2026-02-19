import { Router } from 'express';
import { ZodError, z } from 'zod';
import { createCustomer, listCustomers } from '../services/customers.js';
import { createQuoteByCustomerNameOrId, getQuote, listQuotes } from '../services/quotes.js';
import { mcpCreateCustomerSchema, mcpCreateQuoteSchema, mcpGetQuoteSchema } from '../schemas.js';
import { AppError } from '../utils/errors.js';

const LEGACY_TOOL_NAMES = ['create_customer', 'list_customers', 'create_quote', 'list_quotes', 'get_quote'] as const;
type LegacyTool = (typeof LEGACY_TOOL_NAMES)[number];

type ToolResult = Awaited<ReturnType<typeof listCustomers>> | Awaited<ReturnType<typeof listQuotes>> | unknown;

const legacyBodySchema = z.object({
  tool: z.enum(LEGACY_TOOL_NAMES),
  input: z.record(z.any()).optional().default({})
});

const jsonRpcBodySchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.record(z.any()).optional().default({})
});

const router = Router();

async function executeLegacyTool(tool: LegacyTool, input: Record<string, unknown>): Promise<ToolResult> {
  if (tool === 'create_customer') {
    const payload = mcpCreateCustomerSchema.parse(input);
    return createCustomer(payload);
  }

  if (tool === 'list_customers') {
    return listCustomers();
  }

  if (tool === 'create_quote') {
    const payload = mcpCreateQuoteSchema.parse(input);
    return createQuoteByCustomerNameOrId(payload);
  }

  if (tool === 'list_quotes') {
    return listQuotes();
  }

  const payload = mcpGetQuoteSchema.parse(input);
  const result = await getQuote(payload.id);
  if (!result) throw new AppError('Cotización no encontrada', 404);
  return result;
}

router.post('/', async (req, res) => {
  try {
    const parsedJsonRpc = jsonRpcBodySchema.safeParse(req.body);

    if (parsedJsonRpc.success) {
      const { id = null, method, params } = parsedJsonRpc.data;

      if (method === 'initialize') {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'quickquote-mcp', version: '1.0.0' },
            capabilities: { tools: {} }
          }
        });
      }

      if (method === 'tools/list') {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              { name: 'create_customer', description: 'Crea un cliente', inputSchema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, rnc: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' } } } },
              { name: 'list_customers', description: 'Lista clientes', inputSchema: { type: 'object', properties: {} } },
              { name: 'create_quote', description: 'Crea una cotización por nombre o id de cliente', inputSchema: { type: 'object', required: ['customerNameOrId', 'title', 'items'], properties: { customerNameOrId: { type: 'string' }, customer: { type: 'object' }, title: { type: 'string' }, currency: { type: 'string' }, createdBy: { type: 'string', enum: ['human', 'ai_agent'] }, items: { type: 'array' } } } },
              { name: 'list_quotes', description: 'Lista cotizaciones', inputSchema: { type: 'object', properties: {} } },
              { name: 'get_quote', description: 'Obtiene una cotización por id', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } }
            ]
          }
        });
      }

      if (method === 'tools/call') {
        const toolName = z.enum(LEGACY_TOOL_NAMES).parse(params.name);
        const input = z.record(z.any()).parse(params.arguments ?? {});
        const result = await executeLegacyTool(toolName, input);

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            structuredContent: result,
            isError: false
          }
        });
      }

      return res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      });
    }

    const { tool, input } = legacyBodySchema.parse(req.body);
    const result = await executeLegacyTool(tool, input);
    return res.json({ ok: true, result });
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
