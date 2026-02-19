import type { Intent } from './types';

export function extractEntities(intent: Intent, text: string) {
  if (intent === 'CREATE_CUSTOMER') {
    const email = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0];
    const rnc = text.match(/\b\d{3}-\d{7}-\d\b/)?.[0];
    const phone = text.match(/\b\d{10}\b/)?.[0];
    const nameMatch = text.match(/cliente\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:,|\sRNC|\scorreo|\steléfono|$)/i);
    return {
      name: nameMatch?.[1]?.trim(),
      email,
      rnc,
      phone
    };
  }

  if (intent === 'CREATE_QUOTE') {
    const customer = text.match(/para\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\spor|,|$)/i)?.[1]?.trim();
    const title = text.match(/por\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:,|\d|$)/i)?.[1]?.trim() || 'Cotización generada por agente';

    const items = parseItems(text, title || 'Servicio');

    return { customer, title, items };
  }

  return {};
}

function parseItems(text: string, fallbackDescription: string) {
  const patterns = [
    /(\d+)\s*(?:unidades?|x)\s*a?\s*(\d+(?:\.\d+)?)/gi,
    /qty\s*(\d+)\s*precio\s*(\d+(?:\.\d+)?)/gi,
    /por\s*(\d+(?:\.\d+)?)/gi
  ];

  const items: { description: string; qty: number; unitPrice: number }[] = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (pattern.source.startsWith('por')) {
        items.push({ description: fallbackDescription, qty: 1, unitPrice: Number(match[1]) });
      } else {
        items.push({ description: fallbackDescription, qty: Number(match[1]), unitPrice: Number(match[2]) });
      }
    }
  }

  return items;
}
