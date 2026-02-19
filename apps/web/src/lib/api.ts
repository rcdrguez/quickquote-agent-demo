const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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

export const api = {
  getCustomers: () => request<any[]>('/api/customers'),
  createCustomer: (payload: any) => request('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  updateCustomer: (id: string, payload: any) =>
    request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getQuotes: () => request<any[]>('/api/quotes'),
  createQuote: (payload: any) => request('/api/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  getQuote: (id: string) => request<any>(`/api/quotes/${id}`),
  callMcp: (tool: string, input: any) => request('/mcp', { method: 'POST', body: JSON.stringify({ tool, input }) })
};
