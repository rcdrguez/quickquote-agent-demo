import { z } from 'zod';

export const customerPayloadSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  rnc: z.string().optional(),
  email: z.string().email('Correo inválido').optional(),
  phone: z.string().optional()
});

export const createQuoteItemSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria'),
  qty: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.coerce.number().nonnegative('El precio no puede ser negativo')
});

export const quotePayloadSchema = z.object({
  customerId: z.string().uuid('CustomerId inválido'),
  title: z.string().min(1, 'El título es obligatorio'),
  currency: z.string().default('DOP'),
  items: z.array(createQuoteItemSchema).min(1, 'Debe incluir al menos un item')
});

export const mcpCreateCustomerSchema = customerPayloadSchema;

export const mcpCreateQuoteSchema = z.object({
  customerNameOrId: z.string().min(1, 'customerNameOrId es obligatorio'),
  title: z.string().min(1, 'title es obligatorio'),
  currency: z.string().default('DOP'),
  items: z.array(createQuoteItemSchema).min(1, 'Debe incluir al menos un item')
});

export const mcpGetQuoteSchema = z.object({
  id: z.string().uuid('id inválido')
});

export type CustomerPayload = z.infer<typeof customerPayloadSchema>;
export type QuotePayload = z.infer<typeof quotePayloadSchema>;
export type QuoteItem = z.infer<typeof createQuoteItemSchema>;
export type McpCreateQuotePayload = z.infer<typeof mcpCreateQuoteSchema>;
