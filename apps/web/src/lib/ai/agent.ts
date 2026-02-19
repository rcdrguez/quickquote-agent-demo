import { detectIntent } from './intent';
import { extractEntities } from './extract';
import type { AgentResult } from './types';

export async function buildAgentResult(text: string): Promise<AgentResult & { backend: string }> {
  const { intent, backend } = await detectIntent(text);
  const extracted = extractEntities(intent, text);

  if (intent === 'CREATE_CUSTOMER') {
    return {
      intent,
      extracted,
      tool: 'create_customer',
      payload: {
        name: extracted.name,
        rnc: extracted.rnc,
        email: extracted.email,
        phone: extracted.phone
      },
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

    return {
      intent,
      extracted,
      tool: 'create_quote',
      payload: {
        customerNameOrId: extracted.customer,
        customer: customerPayload,
        title: extracted.title,
        currency: extracted.currency || 'DOP',
        createdBy: 'ai_agent',
        items: extracted.items
      },
      backend
    };
  }

  if (intent === 'LIST_QUOTES') {
    return { intent, extracted, tool: 'list_quotes', payload: {}, backend };
  }

  return { intent, extracted, tool: 'list_customers', payload: {}, backend };
}
