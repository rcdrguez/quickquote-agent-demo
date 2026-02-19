import { pipeline } from '@xenova/transformers';
import type { Intent } from './types';

const intentExamples: Record<Intent, string> = {
  CREATE_CUSTOMER: 'crear cliente con nombre y contacto',
  CREATE_QUOTE: 'crear cotizacion para cliente con items y precio',
  LIST_CUSTOMERS: 'listar clientes existentes',
  LIST_QUOTES: 'listar cotizaciones existentes'
};

let extractor: any;

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
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data as Float32Array);
}

function heuristicScore(intent: Intent, lowered: string) {
  const wantsList = /(lista|listar|mostrar|ver|consulta)/i.test(lowered);
  const mentionsQuote = /(cotiz|factura|presupuesto)/i.test(lowered);
  const mentionsCustomer = /cliente/i.test(lowered);
  const wantsCreate = /(crear|genera|hacer|emitir|registrar|agregar)/i.test(lowered);

  if (intent === 'LIST_QUOTES') return wantsList && mentionsQuote ? 0.2 : 0;
  if (intent === 'CREATE_QUOTE') return wantsCreate && mentionsQuote ? 0.2 : 0;
  if (intent === 'LIST_CUSTOMERS') return wantsList && mentionsCustomer ? 0.2 : 0;
  if (intent === 'CREATE_CUSTOMER') return wantsCreate && mentionsCustomer ? 0.2 : 0;
  return 0;
}

function fallbackIntent(lowered: string): Intent {
  if (/(cotiz|factura|presupuesto)/i.test(lowered)) {
    return /(lista|mostrar|ver|consulta)/i.test(lowered) ? 'LIST_QUOTES' : 'CREATE_QUOTE';
  }

  if (/cliente/i.test(lowered)) {
    return /(lista|mostrar|ver|consulta)/i.test(lowered) ? 'LIST_CUSTOMERS' : 'CREATE_CUSTOMER';
  }

  return 'LIST_CUSTOMERS';
}

export async function detectIntent(input: string): Promise<{ intent: Intent; backend: 'webgpu' | 'wasm' | 'unknown' }> {
  const lowered = input.toLowerCase();

  try {
    const inputVec = await embed(input);
    let bestIntent: Intent = 'LIST_CUSTOMERS';
    let bestScore = -Infinity;

    for (const [intent, sample] of Object.entries(intentExamples) as [Intent, string][]) {
      const sampleVec = await embed(sample);
      const semanticScore = cosine(inputVec, sampleVec);
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
