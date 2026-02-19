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
  'las',
  'quiero',
  'necesito',
  'articulo',
  'artículos',
  'articulos'
]);

const NUMBER_CONNECTORS = new Set(['y']);
const NUMBER_UNITS: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiun: 21,
  veintiuna: 21,
  veintidos: 22,
  veintidós: 22,
  veintitres: 23,
  veintitrés: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintiséis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29
};
const NUMBER_TENS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90
};
const NUMBER_HUNDREDS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900
};

const NUMBER_WORD_PATTERN =
  /^(?:cero|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|dieciséis|diecisiete|dieciocho|diecinueve|veinte|veinti(?:uno|un|una|dos|dós|tres|trés|cuatro|cinco|seis|séis|siete|ocho|nueve)|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|millon|millón|millones|coma|punto|y)$/i;

const cleanText = (value: string) =>
  value
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const parseSpanishNumberPhrase = (phrase: string) => {
  const words = cleanText(phrase)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return undefined;
  if (words.length === 1 && ['un', 'uno', 'una'].includes(words[0])) return undefined;

  let total = 0;
  let current = 0;
  let decimalDigits = '';
  let decimalMode = false;
  let consumed = false;

  for (const word of words) {
    if (NUMBER_CONNECTORS.has(word)) continue;
    if (word === 'coma' || word === 'punto') {
      decimalMode = true;
      continue;
    }

    const unitValue = NUMBER_UNITS[word] ?? NUMBER_TENS[word] ?? NUMBER_HUNDREDS[word];
    if (decimalMode) {
      if (unitValue === undefined) return undefined;
      if (unitValue >= 10 && unitValue % 10 === 0) {
        decimalDigits += String(unitValue / 10);
      } else {
        decimalDigits += String(unitValue);
      }
      consumed = true;
      continue;
    }

    if (unitValue !== undefined) {
      current += unitValue;
      consumed = true;
      continue;
    }

    if (word === 'mil') {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
      consumed = true;
      continue;
    }

    if (word === 'millon' || word === 'millón' || word === 'millones') {
      current = (current || 1) * 1_000_000;
      total += current;
      current = 0;
      consumed = true;
      continue;
    }

    return undefined;
  }

  if (!consumed) return undefined;
  const integerPart = total + current;
  if (!decimalDigits) return integerPart;
  return Number(`${integerPart}.${decimalDigits}`);
};

const normalizeSpeechNumbers = (input: string) =>
  input.replace(/\b([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,6})\b/gi, (segment) => {
    const normalizedSegment = segment
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (!normalizedSegment.length || !normalizedSegment.every((token) => NUMBER_WORD_PATTERN.test(token))) {
      return segment;
    }

    const parsed = parseSpanishNumberPhrase(segment);
    return parsed === undefined || Number.isNaN(parsed) ? segment : String(parsed);
  });

const parseNumber = (value: string) => {
  const compact = value.replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (!compact) return Number.NaN;

  const commaCount = (compact.match(/,/g) || []).length;
  const dotCount = (compact.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const decimalSeparator = compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? /\./g : /,/g;
    const normalized = compact.replace(thousandsSeparator, '').replace(decimalSeparator, '.');
    return Number(normalized);
  }

  if (commaCount > 1 || dotCount > 1) {
    return Number(compact.replace(/[,.]/g, ''));
  }

  const uniqueSeparator = commaCount === 1 ? ',' : dotCount === 1 ? '.' : '';
  if (!uniqueSeparator) return Number(compact);

  const [left, right = ''] = compact.split(uniqueSeparator);
  const looksLikeThousands = right.length === 3 && left.length >= 1;
  const normalized = looksLikeThousands ? `${left}${right}` : `${left}.${right}`;
  return Number(normalized);
};

const normalizeRnc = (value?: string) => {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return undefined;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
};

const normalizePhone = (value?: string) => {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits.length >= 10 ? digits.slice(-10) : undefined;
};

const detectCurrency = (text: string) => {
  if (/(usd|dolares|dólares|us\$|\$\s*usd)/i.test(text)) return 'USD';
  if (/(eur|euros?)/i.test(text)) return 'EUR';
  if (/(dop|rd\$|peso(?:s)?\s*dominicano(?:s)?)/i.test(text)) return 'DOP';
  return 'DOP';
};

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


const normalizeCustomer = (value?: string) => {
  if (!value) return undefined;
  const cleaned = normalizeDescription(value);
  if (!cleaned || /^(?:una|un)\s+(?:cotizaci[oó]n|factura|presupuesto)$/i.test(cleaned)) return undefined;
  if (/(?:cotizaci[oó]n|factura|presupuesto)/i.test(cleaned)) return undefined;
  return cleaned;
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
  const normalizedText = cleanText(text);

  if (intent === 'CREATE_CUSTOMER') {
    const email = normalizedText.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0];
    const rnc = normalizeRnc(normalizedText.match(/(?:rnc\s*)?(\d{3}[-\s]?\d{7}[-\s]?\d)/i)?.[1]);
    const phone = normalizePhone(normalizedText.match(/(?:\+?1[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/)?.[0]);
    const nameMatch =
      normalizedText.match(/(?:cliente|empresa)\s+(?:llamad[oa]\s+)?"?([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)"?(?:,|\sRNC|\scorreo|\semail|\steléfono|$)/i) ||
      normalizedText.match(/(?:crear|registrar|agregar)\s+(?:un\s+)?(?:cliente|empresa)\s+"?([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)"?(?:,|\sRNC|\scorreo|\semail|\steléfono|$)/i);

    return {
      name: nameMatch?.[1]?.trim(),
      email,
      rnc,
      phone
    };
  }

  if (intent === 'CREATE_QUOTE') {
    const customer = normalizeCustomer(
      normalizedText.match(/(?:para|cliente)\s+"?([A-Za-zÁÉÍÓÚÑáéíóúñ\s0-9]+?)"?(?:\spor|\sde|,|$)/i)?.[1]?.trim() ||
        normalizedText.match(/cliente\s+#?(\d+)/i)?.[1]?.trim()
    );
    const customerEmail = normalizedText.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0];
    const customerRnc = normalizeRnc(normalizedText.match(/(?:rnc\s*)?(\d{3}[-\s]?\d{7}[-\s]?\d)/i)?.[1]);
    const customerPhone = normalizePhone(normalizedText.match(/(?:\+?1[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/)?.[0]);
    const items = parseItems(normalizedText, 'Servicio');
    const title = buildTitle(normalizedText, items);
    const currency = detectCurrency(normalizedText);

    return {
      customer,
      customerEmail,
      customerRnc,
      customerPhone,
      title,
      currency,
      items
    };
  }

  return {};
}

function parseItems(text: string, fallbackDescription: string) {
  const normalizedFallback = normalizeDescription(fallbackDescription);
  const workingText = normalizeSpeechNumbers(cleanText(text)).replace(/\s+y\s+/gi, ', ');
  const unitLabelPattern = '(?:unidades?|uds?|x|art[ií]culos?|piezas?|servicios?)';
  const priceSuffix = `(?:\\s*(?:usd|us\\$|dolares?|dólares?|rd\\$|dop|eur|euros?))?(?:\\s*(?:c\\/u|cada\\s*(?:uno|una|unidad)|por\\s*unidad|${unitLabelPattern}))?`;
  const directPatterns = [
    new RegExp(
      `(\\d+)\\s*${unitLabelPattern}\\s*(?:de)?\\s*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\\s-]{3,}?)\\s*(?:a|por)\\s*(\\d+(?:[\\.,]\\d+)?)${priceSuffix}(?:,|$)`,
      'gi'
    ),
    new RegExp(`([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\\s-]{3,}?)\\s*(?:x|por)\\s*(\\d+)\\s*${unitLabelPattern}(?:\\s*(?:a|por)\\s*(\\d+(?:[\\.,]\\d+)?))?`, 'gi'),
    /(?:por|de)\s*(\d+(?:[\.,]\d+)?)\s*(?:para\s+(?:un|una))\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]+?)(?:,|$)/gi,
    new RegExp(`(?:de\\s+)?(\\d+)\\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\\s-]{3,}?)\\s+a\\s*(\\d+(?:[\\.,]\\d+)?)${priceSuffix}(?:,|$)`, 'gi'),
    new RegExp(
      `(\\d+)\\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\\s-]{3,}?)\\s+a\\s+un\\s+precio\\s*(?:de\\s*)?(\\d+(?:[\\.,]\\d+)?)${priceSuffix}(?:,|$)`,
      'gi'
    ),
    new RegExp(
      `(?:quiero\\s+)?(\\d+)\\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\\s-]{3,}?)\\s+a\\s+un\\s+precio\\s+de\\s*(\\d+(?:[\\.,]\\d+)?)${priceSuffix}(?=\\s+(?:para|en|con)\\b|,|$)`,
      'gi'
    )
  ];

  const directItems: { description: string; qty: number; unitPrice: number }[] = [];

  for (const match of workingText.matchAll(directPatterns[0])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: parseNumber(match[3]) });
  }

  for (const match of workingText.matchAll(directPatterns[1])) {
    const description = normalizeDescription(match[1]);
    const qty = Number(match[2]);
    const unitPrice = parseNumber(match[3] || '0');
    if (unitPrice > 0) {
      directItems.push({ description, qty, unitPrice });
    }
  }

  for (const match of workingText.matchAll(directPatterns[2])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: 1, unitPrice: parseNumber(match[1]) });
  }

  for (const match of workingText.matchAll(directPatterns[3])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: parseNumber(match[3]) });
  }

  for (const match of workingText.matchAll(directPatterns[4])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: parseNumber(match[3]) });
  }

  for (const match of workingText.matchAll(directPatterns[5])) {
    directItems.push({ description: normalizeDescription(match[2]), qty: Number(match[1]), unitPrice: parseNumber(match[3]) });
  }

  if (directItems.length > 0) {
    return Array.from(new Map(directItems.map((item) => [`${item.description}-${item.qty}-${item.unitPrice}`, item])).values());
  }

  const segmentedItems: { description: string; qty: number; unitPrice: number }[] = [];
  const segments = workingText.split(/[,;\n]/).map((segment) => segment.trim());

  for (const segment of segments) {
    const inlineItemMatch = segment.match(
    /(?:de\s+)?(\d+)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s-]{3,}?)\s+(?:a|por)\s*([\d.,]+)/i
    );
    const qty = Number(inlineItemMatch?.[1] ?? segment.match(/(?:cantidad|cant\.?|qty)\s*(?:de\s*)?(\d+)/i)?.[1] ?? 1);
    const unitPrice = parseNumber(inlineItemMatch?.[3] ?? segment.match(/(?:precio|valor|costo|a|por)\s*(?:de\s*)?([\d.,]+)/i)?.[1] ?? '');
    const description = normalizeDescription(
      inlineItemMatch?.[2] ??
        segment
          .replace(/^(?:crear|crea|generar|genera|hacer|haz|emitir|registrar)\s+(?:una\s+)?(?:cotizaci[oó]n|factura|presupuesto)\s+para\s+[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+/gi, ' ')
          .replace(/(?:cantidad|cant\.?|qty)\s*(?:de\s*)?\d+/gi, ' ')
          .replace(/(?:precio|valor|costo|a|por)\s*(?:de\s*)?[\d.,]+(?:\s*(?:usd|us\$|dolares?|dólares?|rd\$|dop|eur|euros?))?(?:\s*(?:c\/u|cada\s*(?:uno|una|unidad)|por\s*unidad|unidad(?:es)?))?/gi, ' ')
          .replace(/(?:x)\s*\d+/gi, ' ')
          .replace(/^(?:quiero|necesito)\s+/gi, ' ')
    );

    if (!Number.isFinite(unitPrice) || unitPrice < 0.01 || qty < 1) continue;
    segmentedItems.push({ description, qty, unitPrice });
  }

  if (segmentedItems.length > 0) {
    return Array.from(new Map(segmentedItems.map((item) => [`${item.description}-${item.qty}-${item.unitPrice}`, item])).values());
  }

  const patterns = [
    /(\d+)\s*(?:unidades?|x)\s*a?\s*(\d+(?:[\.,]\d+)?)/gi,
    /(\d+)\s*(?:unidades?|x)\s*de\s*(\d+(?:[\.,]\d+)?)/gi,
    /qty\s*(\d+)\s*precio\s*(\d+(?:[\.,]\d+)?)/gi,
    /(?:por|a|de)\s*(\d+(?:[\.,]\d+)?)/gi
  ];

  const items: { description: string; qty: number; unitPrice: number }[] = [];

  for (const pattern of patterns) {
    for (const match of workingText.matchAll(pattern)) {
      if (pattern.source.startsWith('(?:por|a|de)')) {
        items.push({ description: normalizedFallback, qty: 1, unitPrice: parseNumber(match[1]) });
      } else {
        items.push({ description: normalizedFallback, qty: Number(match[1]), unitPrice: parseNumber(match[2]) });
      }
    }
  }

  return Array.from(new Map(items.map((item) => [`${item.description}-${item.qty}-${item.unitPrice}`, item])).values());
}
