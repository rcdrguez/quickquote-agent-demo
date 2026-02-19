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

export async function detectIntent(input: string): Promise<{ intent: Intent; backend: 'webgpu' | 'wasm' | 'unknown' }> {
  const lowered = input.toLowerCase();
  try {
    const inputVec = await embed(input);
    let bestIntent: Intent = 'LIST_CUSTOMERS';
    let bestScore = -Infinity;

    for (const [intent, sample] of Object.entries(intentExamples) as [Intent, string][]) {
      const sampleVec = await embed(sample);
      const score = cosine(inputVec, sampleVec);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    const backend = (navigator as any).gpu ? 'webgpu' : 'wasm';
    return { intent: bestIntent, backend };
  } catch {
    if (lowered.includes('cotiz')) return { intent: lowered.includes('lista') ? 'LIST_QUOTES' : 'CREATE_QUOTE', backend: 'unknown' };
    if (lowered.includes('cliente')) return { intent: lowered.includes('lista') ? 'LIST_CUSTOMERS' : 'CREATE_CUSTOMER', backend: 'unknown' };
    return { intent: 'LIST_CUSTOMERS', backend: 'unknown' };
  }
}
