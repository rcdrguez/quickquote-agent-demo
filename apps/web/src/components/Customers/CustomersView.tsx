import { useEffect, useState } from 'react';
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

  const load = () => api.getCustomers().then(setCustomers);
  useEffect(() => {
    load();
  }, []);

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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Clientes</h2>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setOpen(true)}>
          Nuevo cliente
        </button>
      </div>

      <div className="overflow-auto rounded bg-white shadow dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="p-3 text-left">Nombre</th><th className="p-3 text-left">RNC</th><th className="p-3 text-left">Email</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t dark:border-slate-800">
                <td className="p-3">{c.name}</td><td className="p-3">{c.rnc || '-'}</td><td className="p-3">{c.email || '-'}</td>
                <td className="p-3 text-right">
                  <button className="rounded border px-3 py-1" onClick={() => { setForm({ ...c, rnc: c.rnc || '', email: c.email || '', phone: c.phone || '' }); setOpen(true); }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg space-y-3 rounded bg-white p-4 shadow dark:bg-slate-900">
            <h3 className="text-lg font-semibold">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <input className="w-full rounded border p-2 bg-transparent" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full rounded border p-2 bg-transparent" placeholder="RNC" value={form.rnc} onChange={(e) => setForm({ ...form, rnc: e.target.value })} />
            <input className="w-full rounded border p-2 bg-transparent" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full rounded border p-2 bg-transparent" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="rounded border px-3 py-1" onClick={() => { setOpen(false); setForm(empty); }}>Cancelar</button>
              <button className="rounded bg-blue-600 px-3 py-1 text-white" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
