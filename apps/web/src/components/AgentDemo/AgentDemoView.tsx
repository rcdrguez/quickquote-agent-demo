import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { buildAgentResult } from '../../lib/ai/agent';

const examples = [
  'Crea un cliente Juan Pérez, RNC 131-1234567-8, correo juan@correo.com, teléfono 8095551234',
  'Haz una factura para Juan Pérez por Mantenimiento mensual, 2 unidades a 7500',
  'Crear cotización para cliente Juan Pérez por soporte, 1 x 5000',
  'Lista las cotizaciones'
];

const smartPromptSuggestions = [
  'Crear cotización para cliente [NOMBRE] por [SERVICIO], [CANTIDAD] unidades a [PRECIO]',
  'Haz una factura para [NOMBRE] por mantenimiento mensual, 1 unidad a 12000',
  'Crear cliente [NOMBRE], correo [EMAIL], teléfono [TELÉFONO]',
  'Lista las cotizaciones del día',
  'Crear cotización en USD para [NOMBRE] por consultoría, 3 unidades a 150'
];

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function AgentDemoView() {
  const [input, setInput] = useState('');
  const [trace, setTrace] = useState<any>(null);
  const [draftResult, setDraftResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const filteredSuggestions = useMemo(() => {
    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return smartPromptSuggestions;
    return smartPromptSuggestions.filter((suggestion) => suggestion.toLowerCase().includes(normalizedInput)).slice(0, 4);
  }, [input]);

  const inlineSuggestions = useMemo(() => {
    if (!draftResult?.payload || !input.trim()) return [];

    const payload = draftResult.payload as any;
    const tips: string[] = [];

    if (draftResult.intent === 'CREATE_QUOTE') {
      if (!payload.customerNameOrId) tips.push('Agrega el nombre del cliente, por ejemplo: "para María Pérez".');
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        tips.push('Agrega cantidad y precio, por ejemplo: "2 unidades a 5500".');
      }
      if ((payload.customer?.email || payload.customer?.phone) && payload.customer?.name) {
        tips.push('Detecté datos del cliente. Si no existe, la IA lo creará automáticamente.');
      }
    }

    if (draftResult.intent === 'CREATE_CUSTOMER' && !payload.name) {
      tips.push('Incluye un nombre para crear el cliente.');
    }

    if (tips.length === 0) {
      tips.push('Se ve bien. Puedes ejecutar cuando quieras.');
    }

    return tips;
  }, [draftResult, input]);

  const canUseVoice = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const scheduleAutoStop = () => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      recognitionRef.current?.stop();
    }, 1400);
  };

  const toggleVoiceInput = () => {
    if (!canUseVoice) {
      setError('Tu navegador no soporta reconocimiento de voz en tiempo real.');
      return;
    }

    const SpeechRecognition = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SpeechRecognitionCtor;

    if (listening) {
      recognitionRef.current?.stop();
      clearSilenceTimer();
      setListening(false);
      return;
    }

    setError('');
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'es-DO';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setInput(transcript);
      scheduleAutoStop();
    };

    recognition.onerror = () => {
      clearSilenceTimer();
      setError('No se pudo capturar el audio. Verifica permisos del micrófono.');
      setListening(false);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setListening(true);
  };

  const autocompleteSuggestion = useMemo(() => {
    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return '';
    return smartPromptSuggestions.find((suggestion) => suggestion.toLowerCase().startsWith(normalizedInput) && suggestion.length > input.trim().length) ?? '';
  }, [input]);

  const applyAutocomplete = () => {
    if (autocompleteSuggestion) {
      setInput(autocompleteSuggestion);
    }
  };

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
    api
      .getLogs()
      .then((serverLogs) => setLogs(serverLogs.slice(0, 15)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setDraftResult(null);
      return;
    }

    const id = setTimeout(async () => {
      try {
        const result = await buildAgentResult(input);
        setDraftResult(result);
      } catch {
        setDraftResult(null);
      }
    }, 250);

    return () => clearTimeout(id);
  }, [input]);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-600 to-blue-600 p-6 text-white shadow-lg">
        <h2 className="text-3xl font-semibold">Asistente de cotizaciones</h2>
        <p className="mt-2 max-w-3xl text-sm text-violet-100">
          Escribe en lenguaje natural y ejecuta acciones reales. El sistema interpreta intención, extrae entidades y llama la
          herramienta adecuada automáticamente.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">¿Qué quieres hacer?</span>
            <textarea
              className="min-h-48 w-full rounded-xl border border-slate-300 bg-white p-4 text-slate-800 outline-none ring-blue-500 transition placeholder:text-slate-400 focus:ring-2"
              value={input}
              placeholder='Ejemplo: "Crear factura para Ana López por Diseño web, 1 unidad a 15000"'
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && autocompleteSuggestion) {
                  e.preventDefault();
                  applyAutocomplete();
                }
              }}
            />
            {autocompleteSuggestion && (
              <button className="text-xs text-blue-600 hover:text-blue-700" onClick={applyAutocomplete} type="button">
                Sugerencia: {autocompleteSuggestion} (Tab para autocompletar)
              </button>
            )}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-xl border px-4 py-2 ${listening ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300'}`}
              onClick={toggleVoiceInput}
              type="button"
            >
              {listening ? 'Detener micrófono' : '🎙️ Dictar con micrófono'}
            </button>
            <button className="rounded-xl border border-slate-300 px-4 py-2" onClick={() => setInput(examples.join('\n'))}>
              Cargar ejemplos
            </button>
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-70"
              onClick={run}
              disabled={!input.trim() || loading}
            >
              {loading ? 'Procesando...' : 'Ejecutar asistente'}
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">Sugerencias en tiempo real</p>
            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  onClick={() => setInput(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-blue-900">
              {inlineSuggestions.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2 text-xs text-slate-600">
            {examples.map((example) => (
              <button key={example} className="rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50" onClick={() => setInput(example)}>
                {example}
              </button>
            ))}
          </div>
          {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Logs del servidor</h3>
          <p className="text-xs text-slate-500">Últimos eventos para entender qué ejecutó el backend.</p>
          <div className="max-h-96 space-y-2 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-green-300">
            {logs.length === 0 && <p>No hay logs todavía.</p>}
            {logs.map((log, idx) => (
              <p key={`${log.timestamp}-${idx}`}>
                [{new Date(log.timestamp).toLocaleTimeString()}] {log.level.toUpperCase()} {log.event}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Trazabilidad del agente</h3>
        {!trace && <p className="text-sm text-slate-500">Ejecuta una instrucción para ver el resultado.</p>}
        {trace && (
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="font-medium">Intent detectado</p>
              <pre>{trace.intent}</pre>
            </div>
            <div>
              <p className="font-medium">Tool llamada</p>
              <pre>{trace.tool}</pre>
            </div>
            <div>
              <p className="font-medium">Entidades (JSON)</p>
              <pre className="overflow-auto rounded bg-slate-100 p-2">{JSON.stringify(trace.extracted, null, 2)}</pre>
            </div>
            <div>
              <p className="font-medium">Payload final</p>
              <pre className="overflow-auto rounded bg-slate-100 p-2">{JSON.stringify(trace.payload, null, 2)}</pre>
            </div>
            <div className="md:col-span-2">
              <p className="font-medium">Respuesta del servidor</p>
              <pre className="overflow-auto rounded bg-slate-100 p-2">{JSON.stringify(trace.response, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
