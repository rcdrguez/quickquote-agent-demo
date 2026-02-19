import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/customers', label: 'Clientes' },
  { to: '/quotes', label: 'Cotizaciones' },
  { to: '/agent', label: 'Asistente IA' }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const location = useLocation();

  return (
    <div className={clsx('min-h-screen bg-slate-100', dark && 'dark')}>
      <div className="flex min-h-screen">
        <aside
          className={clsx(
            'fixed z-20 h-full w-72 bg-gradient-to-b from-slate-900 to-slate-800 p-5 text-slate-100 shadow-2xl transition md:static md:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <h1 className="text-lg font-semibold">QuickQuote</h1>
            <p className="text-xs text-slate-300">Plataforma de cotizaciones con IA</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={clsx(
                  'block rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  location.pathname.startsWith(item.to)
                    ? 'bg-blue-500 text-white shadow'
                    : 'text-slate-200 hover:bg-white/10'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center gap-3">
              <button className="rounded border px-2 py-1 md:hidden" onClick={() => setOpen((prev) => !prev)}>
                Menu
              </button>
              <div>
                <p className="font-semibold">Centro de operaciones de cotizaciones</p>
                <p className="text-xs text-green-600">Asistente IA activo</p>
              </div>
            </div>
            <button className="rounded-lg border px-3 py-1.5 text-sm dark:border-slate-700" onClick={() => setDark((prev) => !prev)}>
              {dark ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
