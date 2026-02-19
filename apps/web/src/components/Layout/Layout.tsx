import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/customers', label: 'Clientes' },
  { to: '/quotes', label: 'Cotizaciones' },
  { to: '/agent', label: 'Agent Demo' }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const location = useLocation();

  return (
    <div className={clsx('min-h-screen', dark && 'dark')}>
      <div className="flex min-h-screen">
        <aside
          className={clsx(
            'fixed z-20 h-full w-64 bg-white p-4 shadow md:static md:translate-x-0 dark:bg-slate-900',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <h1 className="mb-6 text-lg font-semibold">QuickQuote Agent Demo</h1>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={clsx(
                  'block rounded px-3 py-2',
                  location.pathname.startsWith(item.to)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1 md:ml-0">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center gap-3">
              <button className="rounded border px-2 py-1 md:hidden" onClick={() => setOpen((prev) => !prev)}>
                Menu
              </button>
              <div>
                <p className="font-semibold">QuickQuote Agent Demo</p>
                <p className="text-xs text-green-600">Local AI: ON</p>
              </div>
            </div>
            <button
              className="rounded border px-3 py-1 text-sm dark:border-slate-700"
              onClick={() => setDark((prev) => !prev)}
            >
              {dark ? 'Light' : 'Dark'}
            </button>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
