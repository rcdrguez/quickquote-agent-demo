import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/customers', label: 'Clientes', hint: 'Base de datos y contacto', icon: '👥' },
  { to: '/quotes', label: 'Cotizaciones', hint: 'Crear y gestionar documentos', icon: '🧾' },
  { to: '/agent', label: 'Asistente IA', hint: 'Prompts y automatización', icon: '🤖' }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const location = useLocation();

  const containerClass = useMemo(
    () =>
      clsx(
        'min-h-screen transition-colors',
        dark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 text-slate-900'
      ),
    [dark]
  );

  return (
    <div className={containerClass}>
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-30 w-80 border-r border-slate-800/70 bg-slate-950/95 p-5 text-slate-100 shadow-2xl backdrop-blur transition md:static md:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-200">QuickQuote</p>
            <h1 className="mt-2 text-2xl font-semibold">Panel operativo</h1>
            <p className="mt-2 text-sm text-slate-300">Gestiona clientes, cotizaciones y tareas con una interfaz más clara.</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'block rounded-2xl border px-4 py-3 transition',
                    active
                      ? 'border-blue-400/40 bg-blue-500/20 shadow-lg shadow-blue-950/40'
                      : 'border-transparent bg-white/0 hover:border-white/10 hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-slate-300">{item.hint}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {open && <button className="fixed inset-0 z-20 bg-slate-900/50 md:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

        <div className="flex-1">
          <header
            className={clsx(
              'sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:px-8',
              dark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/80'
            )}
          >
            <div className="flex items-center gap-3">
              <button
                className={clsx(
                  'rounded-lg border px-3 py-1.5 text-sm md:hidden',
                  dark ? 'border-slate-700' : 'border-slate-300'
                )}
                onClick={() => setOpen((prev) => !prev)}
              >
                Menú
              </button>
              <div>
                <p className="text-sm font-medium text-emerald-600">Asistente IA activo</p>
                <p className="text-lg font-semibold">Centro de operaciones de cotizaciones</p>
              </div>
            </div>
            <button
              className={clsx(
                'rounded-xl border px-3 py-1.5 text-sm',
                dark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'
              )}
              onClick={() => setDark((prev) => !prev)}
            >
              {dark ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </header>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
