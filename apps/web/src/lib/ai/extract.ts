import type { Intent } from './types';

const TITLE_STOP_WORDS = new Set([
  'para',
  'cliente',
  'cotizacion',
  'cotización',
  'factura',
  'presupuesto',
  'con',
  'por',
  'de',
  'del',
  'la',
  'el',
  'los',
  'las'
]);

const cleanText = (value: string) =>
  value
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDescription = (value: string) => {
  const cleaned = cleanText(value).replace(/^[,:;\-]+|[,:;\-]+$/g, '').trim();
  if (!cleaned) return 'Servicio';

  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  while (tokens.length > 1 && TITLE_STOP_WORDS.has(tokens[0].toLowerCase())) {
    tokens.shift();
  }

  const normalized = tokens.join(' ').replace(/\s{2,}/g, ' ').trim();
  return normalized.length > 2 ? normalized : 'Servicio';
};

const buildTitle = (text: string, parsedItems: { description: string }[]) => {
  const directTitle = text.match(/(?:por|de)\s+([^,\n]+?)(?:,|\b\d+\s*(?:unidad|x)|$)/i)?.[1];
  const fromText = directTitle ? normalizeDescription(directTitle) : '';
  const containsAmbiguousWords = /\d|precio|cada\s+uno|cada\s+una/i.test(fromText);
  if (fromText && fromText !== 'Servicio' && !containsAmbiguousWords) return `Cotización de ${fromText}`;

  if (parsedItems.length > 0) {
    return `Cotización de ${normalizeDescription(parsedItems[0].description)}`;
  }

  return 'Cotización generada por agente';
};

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
    const normalizedText = cleanText(text);
    const customer = text.match(/(?:para|cliente)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\spor|\sde|,|$)/i)?.[1]?.trim();
    const customerEmail = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0];
    const customerRnc = text.match(/\b\d{3}-\d{7}-\d\b/)?.[0];
    const customerPhone = text.match(/\b\d{10}\b/)?.[0];
    const items = parseItems(normalizedText, 'Servicio');
    const title = buildTitle(normalizedText, items);

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
  const normalizedFallback = normalizeDescription(fallbackDescription);
  const workingText = cleanText(text);
  const directPatterns = [
    /(\d+)\s*(?:unidades?|uds?|x)\s*(?:de)?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]{3,}?)\s*(?:a|por)\s*(\d+(?:\.\d+)?)(?:,|$)/gi,
    /([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]{3,}?)\s*(?:x|por)\s*(\d+)\s*(?:unidades?|uds?)(?:\s*(?:a|por)\s*(\d+(?:\.\d+)?))?/gi,
    /(?:por|de)\s*(\d+(?:\.\d+)?)\s*(?:para\s+(?:un|una))\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]+?)(?:,|$)/gi,
    /(\d+)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]{3,}?)\s+a\s*(\d+(?:\.\d+)?)(?:,|$)/gi,
    /(\d+)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]{3,}?)\s+a\s+un\s+precio\s*(?:de\s*)?(\d+(?:\.\d+)?)(?:\s*cada\s*(?:uno|una))?(?:,|$)/gi
  ];

  const directItems: { description: string; qty: number; unitPrice: number }[] = [];

  for (const match of workingText.matchAll(directPatterns[0])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: Number(match[3]) });
  }

  for (const match of workingText.matchAll(directPatterns[1])) {
    const description = normalizeDescription(match[1]);
    const qty = Number(match[2]);
    const unitPrice = Number(match[3] || 0);
    if (unitPrice > 0) {
      directItems.push({ description, qty, unitPrice });
    }
  }

  for (const match of workingText.matchAll(directPatterns[2])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: 1, unitPrice: Number(match[1]) });
  }

  for (const match of workingText.matchAll(directPatterns[3])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: Number(match[3]) });
  }

  for (const match of workingText.matchAll(directPatterns[4])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: Number(match[3]) });
  }

  if (directItems.length > 0) {
    return Array.from(new Map(directItems.map((item) => [`${item.description}-${item.qty}-${item.unitPrice}`, item])).values());
  }

  const patterns = [
    /(\d+)\s*(?:unidades?|x)\s*a?\s*(\d+(?:\.\d+)?)/gi,
    /(\d+)\s*(?:unidades?|x)\s*de\s*(\d+(?:\.\d+)?)/gi,
    /qty\s*(\d+)\s*precio\s*(\d+(?:\.\d+)?)/gi,
    /(?:por|a|de)\s*(\d+(?:\.\d+)?)/gi
  ];

  const items: { description: string; qty: number; unitPrice: number }[] = [];

  for (const pattern of patterns) {
    for (const match of workingText.matchAll(pattern)) {
      if (pattern.source.startsWith('(?:por|a|de)')) {
        items.push({ description: normalizedFallback, qty: 1, unitPrice: Number(match[1]) });
      } else {
        items.push({ description: normalizedFallback, qty: Number(match[1]), unitPrice: Number(match[2]) });
      }
    }
  }

  return Array.from(new Map(items.map((item) => [`${item.description}-${item.qty}-${item.unitPrice}`, item])).values());
}
