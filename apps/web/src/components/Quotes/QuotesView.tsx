import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Customer { id: string; name: string }

export function QuotesView() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customerId: '', title: '', currency: 'DOP', description: '', qty: 1, unitPrice: 0 });

  const load = async () => {
    const [q, c] = await Promise.all([api.getQuotes(), api.getCustomers()]);
    setQuotes(q);
    setCustomers(c);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError('');
    if (!form.customerId || !form.title || !form.description || form.unitPrice <= 0) {
      setError('Completa cliente, título, descripción y precio.');
      return;
    }

    await api.createQuote({
      customerId: form.customerId,
      title: form.title,
      currency: form.currency,
      items: [{ description: form.description, qty: Number(form.qty), unitPrice: Number(form.unitPrice) }]
    });

    setForm({ customerId: '', title: '', currency: 'DOP', description: '', qty: 1, unitPrice: 0 });
    load();
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Cotizaciones</h2>
      <div className="grid gap-3 rounded bg-white p-4 shadow dark:bg-slate-900 md:grid-cols-6">
        <select className="rounded border p-2 bg-transparent md:col-span-2" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">Selecciona cliente</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="rounded border p-2 bg-transparent md:col-span-2" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="rounded border p-2 bg-transparent" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="rounded border p-2 bg-transparent" type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
        <input className="rounded border p-2 bg-transparent" type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
        <button className="rounded bg-blue-600 px-4 py-2 text-white md:col-span-6" onClick={create}>Crear cotización</button>
        {error && <p className="text-red-600 md:col-span-6">{error}</p>}
      </div>
      <div className="overflow-auto rounded bg-white shadow dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3 text-left">Título</th><th className="p-3">Total</th><th className="p-3">Fecha</th><th className="p-3" /></tr></thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t dark:border-slate-800">
                <td className="p-3">{q.title}</td>
                <td className="p-3">{q.currency} {q.total.toFixed(2)}</td>
                <td className="p-3">{new Date(q.createdAt).toLocaleString()}</td>
                <td className="p-3 text-right"><Link className="text-blue-600" to={`/quotes/${q.id}`}>Ver detalle</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
