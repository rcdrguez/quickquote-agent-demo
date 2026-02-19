const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://quickquote-agent-demo-server.onrender.com'
  : 'http://localhost:8787';
const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error?.message || 'Error de servidor');
  }
  return data;
}

let jsonRpcId = 0;

export const api = {
  getCustomers: () => request<any[]>('/api/customers'),
  createCustomer: (payload: any) => request('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  updateCustomer: (id: string, payload: any) =>
    request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getQuotes: () => request<any[]>('/api/quotes'),
  createQuote: (payload: any) => request('/api/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  getQuote: (id: string) => request<any>(`/api/quotes/${id}`),
  getLogs: () => request<any[]>('/api/logs'),
  callMcp: async (tool: string, input: any) => {
    jsonRpcId += 1;
    const response = await request<any>('/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: jsonRpcId,
        method: 'tools/call',
        params: { name: tool, arguments: input }
      })
    });

    if (response.error) {
      throw new Error(response.error?.message || 'Error MCP');
    }

    return response.result?.structuredContent ?? response.result;
  }
};
