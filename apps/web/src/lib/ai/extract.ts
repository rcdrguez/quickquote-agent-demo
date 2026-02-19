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
    const customer = text.match(/(?:para|cliente)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\spor|\sde|,|$)/i)?.[1]?.trim();
    const customerEmail = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0];
    const customerRnc = text.match(/\b\d{3}-\d{7}-\d\b/)?.[0];
    const customerPhone = text.match(/\b\d{10}\b/)?.[0];
    const title =
      text.match(/(?:por|de)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:,|\d|\sa\s|$)/i)?.[1]?.trim() ||
      'Cotización generada por agente';

    const items = parseItems(text, title || 'Servicio');

    return {
      customer,
      customerEmail,
      customerRnc,
      customerPhone,
      title,
      items
    };
  }

  return {};
}

function parseItems(text: string, fallbackDescription: string) {
  const patterns = [
    /(\d+)\s*(?:unidades?|x)\s*a?\s*(\d+(?:\.\d+)?)/gi,
    /(\d+)\s*(?:unidades?|x)\s*de\s*(\d+(?:\.\d+)?)/gi,
    /qty\s*(\d+)\s*precio\s*(\d+(?:\.\d+)?)/gi,
    /(?:por|a|de)\s*(\d+(?:\.\d+)?)/gi
  ];

  const items: { description: string; qty: number; unitPrice: number }[] = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (pattern.source.startsWith('(?:por|a|de)')) {
        items.push({ description: fallbackDescription, qty: 1, unitPrice: Number(match[1]) });
      } else {
        items.push({ description: fallbackDescription, qty: Number(match[1]), unitPrice: Number(match[2]) });
      }
    }
  }

  return items;
}
