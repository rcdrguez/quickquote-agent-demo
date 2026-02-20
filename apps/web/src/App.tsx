import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { AgentRoute } from './routes/AgentRoute';
import { CustomersRoute } from './routes/CustomersRoute';
import { QuoteDetailRoute } from './routes/QuoteDetailRoute';
import { QuotesRoute } from './routes/QuotesRoute';
import { api } from './lib/api';

export default function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const waitForBackend = async () => {
      const ready = await api.pingServer();
      if (cancelled) {
        return;
      }

      if (ready) {
        setIsBackendReady(true);
        return;
      }

      setTimeout(waitForBackend, 3000);
    };

    void waitForBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isBackendReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="max-w-lg space-y-4 rounded-xl border border-slate-300/60 bg-white/80 p-8 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
          <h1 className="text-xl font-semibold">Cargando QuickQuote…</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            El backend está alojado en una versión gratuita y puede tardar unos segundos en despertar. Por favor
            espera mientras terminamos de cargar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/customers" element={<CustomersRoute />} />
        <Route path="/quotes" element={<QuotesRoute />} />
        <Route path="/quotes/:id" element={<QuoteDetailRoute />} />
        <Route path="/agent" element={<AgentRoute />} />
        <Route path="*" element={<Navigate to="/customers" replace />} />
      </Routes>
    </Layout>
  );
}
