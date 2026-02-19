import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../db.js';
import type { McpCreateQuotePayload, QuoteItem, QuotePayload } from '../schemas.js';
import { findCustomerByNameOrId } from './customers.js';
import { AppError } from '../utils/errors.js';

const TAX_RATE = 0.18;

export interface Quote {
  id: string;
  customerId: string;
  title: string;
  currency: string;
  createdBy: 'human' | 'ai_agent';
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

const normalizeQuote = (row: Omit<Quote, 'items'> & { items: string }): Quote => ({
  ...row,
  items: JSON.parse(row.items)
});

const computeTotals = (items: QuoteItem[]) => {
  const subtotal = items.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export async function listQuotes() {
  const rows = await all<Omit<Quote, 'items'> & { items: string }>('SELECT * FROM quotes ORDER BY datetime(createdAt) DESC');
  return rows.map(normalizeQuote);
}

export async function getQuote(id: string) {
  const row = await get<Omit<Quote, 'items'> & { items: string }>('SELECT * FROM quotes WHERE id = ?', [id]);
  if (!row) return undefined;
  return normalizeQuote(row);
}

export async function createQuote(input: QuotePayload) {
  const totals = computeTotals(input.items);
  const quote: Quote = {
    id: uuidv4(),
    customerId: input.customerId,
    title: input.title,
    currency: input.currency || 'DOP',
    createdBy: input.createdBy || 'human',
    items: input.items,
    ...totals,
    createdAt: new Date().toISOString()
  };

  await run(
    `INSERT INTO quotes (id, customerId, title, currency, createdBy, items, subtotal, tax, total, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quote.id,
      quote.customerId,
      quote.title,
      quote.currency,
      quote.createdBy,
      JSON.stringify(quote.items),
      quote.subtotal,
      quote.tax,
      quote.total,
      quote.createdAt
    ]
  );

  return quote;
}

export async function createQuoteByCustomerNameOrId(input: McpCreateQuotePayload) {
  const customer = await findCustomerByNameOrId(input.customerNameOrId);
  if (!customer) {
    throw new AppError('Cliente no encontrado para crear la cotización', 404, {
      customerNameOrId: input.customerNameOrId
    });
  }

  return createQuote({
    customerId: customer.id,
    title: input.title,
    currency: input.currency,
    createdBy: input.createdBy,
    items: input.items
  });
}
