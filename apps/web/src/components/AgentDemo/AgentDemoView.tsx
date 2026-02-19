import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { buildAgentResult } from '../../lib/ai/agent';

const examples = [
  'Crea un cliente Juan Pérez, RNC 131-1234567-8, correo juan@correo.com, teléfono 8095551234',
  'Haz una factura para Juan Pérez por Mantenimiento mensual, 2 unidades a 7500',
  'Crear cotización para cliente Juan Pérez por soporte, 1 x 5000',
  'Lista las cotizaciones'
];

export function AgentDemoView() {
  const [input, setInput] = useState('');
  const [trace, setTrace] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await buildAgentResult(input);

      if (result.tool === 'create_customer' && !(result.payload as any).name) {
        setError('No se puede crear cliente sin nombre. Intenta: "crear cliente María Pérez correo maria@correo.com".');
        setTrace({ ...result, response: null });
        return;
      }

      if (result.tool === 'create_quote') {
        const payload = result.payload as any;
        if (!payload.customerNameOrId || !Array.isArray(payload.items) || payload.items.length === 0) {
          setError('Faltan datos para la cotización/factura. Ejemplo: "crear factura para Juan por Soporte, 2 unidades a 3000".');
          setTrace({ ...result, response: null });
          return;
        }
      }

      const response = await api.callMcp(result.tool, result.payload);
      setTrace({ ...result, response });
      const serverLogs = await api.getLogs();
      setLogs(serverLogs.slice(0, 15));
    } catch (e: any) {
      setError(e.message || 'Error ejecutando agente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getLogs().then((serverLogs) => setLogs(serverLogs.slice(0, 15))).catch(() => undefined);
  }, []);

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
        <h2 className="text-2xl font-semibold">Asistente de cotizaciones</h2>
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          Describe tu solicitud en lenguaje natural. También puedes escribir "factura" y el asistente intentará crear la cotización.
          Incluye: cliente, servicio/producto, cantidad y precio.
        </p>
        <textarea
          className="min-h-40 w-full rounded-lg border border-slate-300 bg-transparent p-3"
          value={input}
          placeholder='Ejemplo: "Crear factura para Ana López por Diseño web, 1 unidad a 15000"'
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border px-3 py-2" onClick={() => setInput(examples.join('\n'))}>Cargar ejemplos</button>
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-70" onClick={run} disabled={!input.trim() || loading}>
            {loading ? 'Procesando...' : 'Ejecutar asistente'}
          </button>
        </div>
        <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
          {examples.map((example) => (
            <button key={example} className="rounded border border-dashed p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setInput(example)}>
              {example}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold">Logs del servidor</h3>
        <p className="text-xs text-slate-500">Últimos eventos para entender qué ejecutó el backend.</p>
        <div className="max-h-96 space-y-2 overflow-auto rounded bg-slate-950 p-3 font-mono text-xs text-green-300">
          {logs.length === 0 && <p>No hay logs todavía.</p>}
          {logs.map((log, idx) => (
            <p key={`${log.timestamp}-${idx}`}>
              [{new Date(log.timestamp).toLocaleTimeString()}] {log.level.toUpperCase()} {log.event}
            </p>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
        <h3 className="text-lg font-semibold">Trazabilidad del agente</h3>
        {!trace && <p className="text-sm text-slate-500">Ejecuta una instrucción para ver el resultado.</p>}
        {trace && (
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div><p className="font-medium">Intent detectado</p><pre>{trace.intent}</pre></div>
            <div><p className="font-medium">Tool llamada</p><pre>{trace.tool}</pre></div>
            <div><p className="font-medium">Entidades (JSON)</p><pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(trace.extracted, null, 2)}</pre></div>
            <div><p className="font-medium">Payload final</p><pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(trace.payload, null, 2)}</pre></div>
            <div className="md:col-span-2"><p className="font-medium">Respuesta del servidor</p><pre className="overflow-auto rounded bg-slate-100 p-2 dark:bg-slate-800">{JSON.stringify(trace.response, null, 2)}</pre></div>
          </div>
        )}
      </div>
    </section>
  );
}
