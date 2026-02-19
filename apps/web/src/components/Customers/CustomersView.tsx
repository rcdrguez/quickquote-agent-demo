import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

interface Customer {
  id: string;
  name: string;
  rnc?: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

const empty = { id: '', name: '', rnc: '', email: '', phone: '' };

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = () => api.getCustomers().then(setCustomers);
  useEffect(() => {
    load();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.rnc, customer.email, customer.phone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  }, [customers, query]);

  const save = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }

    try {
      if (form.id) {
        await api.updateCustomer(form.id, form);
      } else {
        await api.createCustomer(form);
      }
      setOpen(false);
      setForm(empty);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-blue-700">Gestión de clientes</p>
            <h2 className="mt-1 text-3xl font-semibold text-slate-900">Directorio inteligente</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Consulta datos clave de cada cliente, localiza información en segundos y mantén la base lista para crear
              cotizaciones sin errores.
            </p>
          </div>
          <button
            className="rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white shadow hover:bg-blue-700"
            onClick={() => setOpen(true)}
          >
            + Nuevo cliente
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Buscar cliente</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none ring-blue-500 transition focus:ring-2"
              placeholder="Nombre, RNC, correo o teléfono"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Clientes totales</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{customers.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Resultados</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{filteredCustomers.length}</p>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 text-left font-semibold">Nombre</th>
              <th className="p-4 text-left font-semibold">RNC</th>
              <th className="p-4 text-left font-semibold">Email</th>
              <th className="p-4 text-left font-semibold">Teléfono</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-blue-50/40">
                <td className="p-4 font-medium text-slate-900">{c.name}</td>
                <td className="p-4 text-slate-700">{c.rnc || '-'}</td>
                <td className="p-4 text-slate-700">{c.email || '-'}</td>
                <td className="p-4 text-slate-700">{c.phone || '-'}</td>
                <td className="p-4 text-right">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setForm({ ...c, rnc: c.rnc || '', email: c.email || '', phone: c.phone || '' });
                      setOpen(true);
                    }}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={5}>
                  No se encontraron clientes con ese criterio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <p className="text-sm text-slate-500">Completa los datos mínimos para usar este cliente en próximas cotizaciones.</p>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-300 p-2.5"
                placeholder="Nombre completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-300 p-2.5"
                placeholder="RNC"
                value={form.rnc}
                onChange={(e) => setForm({ ...form, rnc: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-300 p-2.5"
                placeholder="Correo"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-300 p-2.5"
                placeholder="Teléfono"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 px-3 py-2"
                onClick={() => {
                  setOpen(false);
                  setForm(empty);
                }}
              >
                Cancelar
              </button>
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={save}>
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
