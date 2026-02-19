export type Intent = 'CREATE_CUSTOMER' | 'CREATE_QUOTE' | 'LIST_CUSTOMERS' | 'LIST_QUOTES';

export interface IntentAlternative {
  intent: Intent;
  score: number;
}

export interface AgentResult {
  intent: Intent;
  extracted: Record<string, unknown>;
  tool: string;
  payload: Record<string, unknown>;
  confidence: number;
  alternatives: IntentAlternative[];
  requiresConfirmation: boolean;
  missingFields: string[];
}
