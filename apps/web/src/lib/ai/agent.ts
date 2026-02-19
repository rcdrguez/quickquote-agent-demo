import { detectIntent } from './intent';
import { extractEntities } from './extract';
import type { AgentResult } from './types';

function getMissingFields(tool: string, payload: Record<string, unknown>) {
  const missing: string[] = [];

  if (tool === 'create_customer') {
    if (!payload.name) missing.push('name');
  }

  if (tool === 'create_quote') {
    if (!payload.customerNameOrId) missing.push('customerNameOrId');
    if (!payload.title) missing.push('title');
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      missing.push('items');
    }
  }

  return missing;
}

export async function buildAgentResult(text: string): Promise<AgentResult & { backend: string }> {
  const { intent, backend, confidence, alternatives } = await detectIntent(text);
  const extracted = extractEntities(intent, text);

  if (intent === 'CREATE_CUSTOMER') {
    const payload = {
      name: extracted.name,
      rnc: extracted.rnc,
      email: extracted.email,
      phone: extracted.phone
    };

    const missingFields = getMissingFields('create_customer', payload as Record<string, unknown>);
    return {
      intent,
      extracted,
      tool: 'create_customer',
      payload,
      confidence,
      alternatives,
      missingFields,
      requiresConfirmation: confidence < 0.72 || missingFields.length > 0,
      backend
    };
  }

  if (intent === 'CREATE_QUOTE') {
    const customerPayload = {
      name: extracted.customer,
      email: extracted.customerEmail,
      rnc: extracted.customerRnc,
      phone: extracted.customerPhone
    };

    const payload = {
      customerNameOrId: extracted.customer,
      customer: customerPayload,
      title: extracted.title,
      currency: extracted.currency || 'DOP',
      createdBy: 'ai_agent',
      items: extracted.items
    };

    const missingFields = getMissingFields('create_quote', payload as Record<string, unknown>);

    return {
      intent,
      extracted,
      tool: 'create_quote',
      payload,
      confidence,
      alternatives,
      missingFields,
      requiresConfirmation: confidence < 0.72 || missingFields.length > 0,
      backend
    };
  }

  if (intent === 'LIST_QUOTES') {
    return {
      intent,
      extracted,
      tool: 'list_quotes',
      payload: {},
      confidence,
      alternatives,
      missingFields: [],
      requiresConfirmation: false,
      backend
    };
  }

  return {
    intent,
    extracted,
    tool: 'list_customers',
    payload: {},
    confidence,
    alternatives,
    missingFields: [],
    requiresConfirmation: false,
    backend
  };
}
