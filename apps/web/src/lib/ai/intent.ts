import { pipeline } from '@xenova/transformers';
import type { Intent } from './types';

const intentExamples: Record<Intent, string[]> = {
  CREATE_CUSTOMER: [
    'crear cliente con nombre y contacto',
    'registrar nuevo cliente con correo y telefono',
    'agregar empresa cliente con rnc'
  ],
  CREATE_QUOTE: [
    'crear cotizacion para cliente con items y precio',
    'generar factura con productos y cantidades',
    'hacer presupuesto para un cliente'
  ],
  LIST_CUSTOMERS: ['listar clientes existentes', 'mostrar clientes registrados', 'ver lista de clientes'],
  LIST_QUOTES: ['listar cotizaciones existentes', 'mostrar facturas creadas', 'ver presupuestos recientes']
};

let extractor: any;
const embeddingCache = new Map<string, number[]>();

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(text: string) {
  const cacheKey = text.trim().toLowerCase();
  const cached = embeddingCache.get(cacheKey);
  if (cached) return cached;

  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  const vector = Array.from(out.data as Float32Array);
  embeddingCache.set(cacheKey, vector);
  return vector;
}

function heuristicScore(intent: Intent, lowered: string) {
  const wantsList = /(lista|listar|mostrar|ver|consulta|ensena|enseña|dame|cuales|cuáles)/i.test(lowered);
  const mentionsQuote = /(cotiz|factura|presupuesto|propuesta)/i.test(lowered);
  const mentionsCustomer = /(cliente|empresa|cuenta)/i.test(lowered);
  const wantsCreate = /(crear|crea|genera|hacer|haz|emitir|registrar|agregar|nueva|nuevo)/i.test(lowered);
  const wantsUpdate = /(editar|actualizar|modificar|cambiar)/i.test(lowered);

  if (intent === 'LIST_QUOTES') return (wantsList && mentionsQuote ? 0.25 : 0) - (wantsCreate ? 0.05 : 0);
  if (intent === 'CREATE_QUOTE') return (wantsCreate && mentionsQuote ? 0.25 : 0) - (wantsList ? 0.05 : 0);
  if (intent === 'LIST_CUSTOMERS') return (wantsList && mentionsCustomer ? 0.25 : 0) - (wantsCreate ? 0.05 : 0);
  if (intent === 'CREATE_CUSTOMER') {
    return (wantsCreate && mentionsCustomer ? 0.25 : 0) - (wantsList ? 0.05 : 0) - (wantsUpdate ? 0.03 : 0);
  }
  return 0;
}

function strictRuleIntent(lowered: string): Intent | null {
  if (/(lista|listar|mostrar|ver|consulta)/i.test(lowered) && /(cotiz|factura|presupuesto)/i.test(lowered)) {
    return 'LIST_QUOTES';
  }

  if (/(lista|listar|mostrar|ver|consulta)/i.test(lowered) && /(cliente|empresa)/i.test(lowered)) {
    return 'LIST_CUSTOMERS';
  }

  if (/(crear|crea|genera|haz|hacer|emitir|registrar)/i.test(lowered) && /(cotiz|factura|presupuesto)/i.test(lowered)) {
    return 'CREATE_QUOTE';
  }

  if (/(crear|crea|registrar|agregar|nuevo|nueva)/i.test(lowered) && /(cliente|empresa)/i.test(lowered)) {
    return 'CREATE_CUSTOMER';
  }

  return null;
}

function fallbackIntent(lowered: string): Intent {
  const strict = strictRuleIntent(lowered);
  if (strict) return strict;

  if (/(cotiz|factura|presupuesto)/i.test(lowered)) {
    return /(lista|mostrar|ver|consulta)/i.test(lowered) ? 'LIST_QUOTES' : 'CREATE_QUOTE';
  }

  if (/(cliente|empresa)/i.test(lowered)) {
    return /(lista|mostrar|ver|consulta)/i.test(lowered) ? 'LIST_CUSTOMERS' : 'CREATE_CUSTOMER';
  }

  return 'LIST_CUSTOMERS';
}

export async function detectIntent(input: string): Promise<{ intent: Intent; backend: 'webgpu' | 'wasm' | 'unknown' }> {
  const lowered = input.toLowerCase();
  const strict = strictRuleIntent(lowered);
  if (strict) {
    const backend = (navigator as any).gpu ? 'webgpu' : 'wasm';
    return { intent: strict, backend };
  }

  try {
    const inputVec = await embed(input);
    let bestIntent: Intent = 'LIST_CUSTOMERS';
    let bestScore = -Infinity;

    for (const [intent, samples] of Object.entries(intentExamples) as [Intent, string[]][]) {
      const sampleScores: number[] = [];

      for (const sample of samples) {
        const sampleVec = await embed(sample);
        sampleScores.push(cosine(inputVec, sampleVec));
      }

      const semanticScore = sampleScores.reduce((acc, score) => acc + score, 0) / sampleScores.length;
      const score = semanticScore + heuristicScore(intent, lowered);

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const backend = (navigator as any).gpu ? 'webgpu' : 'wasm';
    return { intent: bestIntent, backend };
  } catch {
    return { intent: fallbackIntent(lowered), backend: 'unknown' };
  }
}
