import { useState } from 'react';
import { api } from '../../lib/api';
import { buildAgentResult } from '../../lib/ai/agent';

const examples = [
  'Crea un cliente Juan Pérez, RNC 131-1234567-8, correo juan@correo.com, teléfono 8095551234',
  'Crea una cotización para Juan Pérez por Servicio de logística, 2 unidades a 7500',
  'Lista los clientes',
  'Lista las cotizaciones'
];

export function AgentDemoView() {
  const [input, setInput] = useState('');
  const [trace, setTrace] = useState<any>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    try {
      const result = await buildAgentResult(input);

      if (result.tool === 'create_customer' && !(result.payload as any).name) {
        setError('No se puede crear cliente sin nombre.');
        setTrace({ ...result, response: null });
        return;
      }

      if (result.tool === 'create_quote') {
        const payload = result.payload as any;
        if (!payload.customerNameOrId || !Array.isArray(payload.items) || payload.items.length === 0) {
          setError('No se puede crear cotización sin cliente y al menos 1 item.');
          setTrace({ ...result, response: null });
          return;
        }
      }

      const response = await api.callMcp(result.tool, result.payload);
      setTrace({ ...result, response });
    } catch (e: any) {
      setError(e.message || 'Error ejecutando agente');
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded bg-white p-4 shadow dark:bg-slate-900">
        <h2 className="text-2xl font-semibold">Agent Demo</h2>
        <textarea
          className="min-h-40 w-full rounded border bg-transparent p-3"
          value={input}
          placeholder="Escribe una instrucción en español"
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="rounded border px-3 py-2" onClick={() => setInput(examples.join('\n'))}>Ejemplos</button>
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={run}>Ejecutar</button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-3 rounded bg-white p-4 shadow dark:bg-slate-900">
        <h3 className="text-lg font-semibold">Agent Trace</h3>
        {!trace && <p className="text-sm text-slate-500">Ejecuta una instrucción para ver el trace.</p>}
        {trace && (
          <div className="space-y-3 text-sm">
            <div><p className="font-medium">Detected intent</p><pre>{trace.intent}</pre></div>
            <div><p className="font-medium">Extracted entities (JSON)</p><pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(trace.extracted, null, 2)}</pre></div>
            <div><p className="font-medium">Tool called</p><pre>{trace.tool}</pre></div>
            <div><p className="font-medium">Final payload</p><pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(trace.payload, null, 2)}</pre></div>
            <div><p className="font-medium">Server response</p><pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(trace.response, null, 2)}</pre></div>
          </div>
        )}
      </div>
    </section>
  );
}
