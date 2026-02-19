import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface Customer {
  id: string;
  name: string;
}

interface QuoteItemInput {
  description: string;
  qty: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  customerId: string;
  title: string;
  currency: string;
  total: number;
  createdAt: string;
}

const emptyItem = { description: '', qty: 1, unitPrice: 0 };

export function QuotesView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    title: '',
    currency: 'DOP',
    items: [emptyItem] as QuoteItemInput[]
  });

  const customersById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers]);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [quotesData, customersData] = await Promise.all([api.getQuotes(), api.getCustomers()]);
      setQuotes(quotesData);
      setCustomers(customersData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las cotizaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setItem = (index: number, partial: Partial<QuoteItemInput>) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...partial } : item))
    }));
  };

  const addItem = () => {
    setForm((previous) => ({ ...previous, items: [...previous.items, emptyItem] }));
  };

  const removeItem = (index: number) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const validate = () => {
    if (!form.customerId || !form.title.trim()) {
      return 'Selecciona un cliente e ingresa el título de la cotización.';
    }

    if (form.items.length === 0) {
      return 'Agrega al menos un item.';
    }

    const invalidItem = form.items.find(
      (item) => !item.description.trim() || Number(item.qty) <= 0 || Number(item.unitPrice) < 0
    );

    if (invalidItem) {
      return 'Cada item debe tener descripción, cantidad mayor a 0 y precio válido.';
    }

    return '';
  };

  const totalPreview = form.items.reduce((acc, item) => acc + Number(item.qty) * Number(item.unitPrice), 0);

  const create = async () => {
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await api.createQuote({
        customerId: form.customerId,
        title: form.title.trim(),
        currency: form.currency,
        items: form.items.map((item) => ({
          description: item.description.trim(),
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice)
        }))
      });

      setForm({ customerId: '', title: '', currency: 'DOP', items: [emptyItem] });
      setSuccess('Cotización creada correctamente.');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear la cotización.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <h2 className="text-2xl font-semibold">Cotizaciones claras y profesionales</h2>
        <p className="mt-1 text-sm text-blue-100">
          Crea propuestas con múltiples items, valida errores en tiempo real y descarga el detalle en PDF.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <article className="rounded-2xl bg-white p-5 shadow dark:bg-slate-900">
          <h3 className="text-lg font-semibold">Nueva cotización</h3>
          <p className="mt-1 text-sm text-slate-500">Completa la información principal y agrega los items necesarios.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Cliente</span>
              <select
                className="w-full rounded-lg border p-2.5 bg-transparent"
                value={form.customerId}
                onChange={(event) => setForm((previous) => ({ ...previous, customerId: event.target.value }))}
              >
                <option value="">Selecciona cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Moneda</span>
              <select
                className="w-full rounded-lg border p-2.5 bg-transparent"
                value={form.currency}
                onChange={(event) => setForm((previous) => ({ ...previous, currency: event.target.value }))}
              >
                <option value="DOP">DOP (RD$)</option>
                <option value="USD">USD ($)</option>
              </select>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium">Título</span>
              <input
                className="w-full rounded-lg border p-2.5 bg-transparent"
                placeholder="Ej: Cotización diseño y desarrollo web"
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              />
            </label>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Items</h4>
              <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={addItem} type="button">
                + Agregar item
              </button>
            </div>

            {form.items.map((item, index) => (
              <div key={`${index}-${item.description}`} className="grid gap-2 rounded-xl border p-3 md:grid-cols-12">
                <input
                  className="rounded-lg border p-2 bg-transparent md:col-span-6"
                  placeholder="Descripción del item"
                  value={item.description}
                  onChange={(event) => setItem(index, { description: event.target.value })}
                />
                <input
                  className="rounded-lg border p-2 bg-transparent md:col-span-2"
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(event) => setItem(index, { qty: Number(event.target.value) })}
                />
                <input
                  className="rounded-lg border p-2 bg-transparent md:col-span-3"
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  onChange={(event) => setItem(index, { unitPrice: Number(event.target.value) })}
                />
                <button
                  className="rounded-lg border border-red-200 px-2 text-sm text-red-600 md:col-span-1"
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={form.items.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
            <span>Subtotal estimado</span>
            <strong>
              {form.currency} {totalPreview.toFixed(2)}
            </strong>
          </div>

          <button
            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            onClick={create}
            disabled={saving}
          >
            {saving ? 'Creando cotización...' : 'Crear cotización'}
          </button>

          {error && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-950/30">{error}</p>}
          {success && <p className="mt-3 rounded-lg bg-green-50 p-2.5 text-sm text-green-700 dark:bg-green-950/30">{success}</p>}
        </article>

        <article className="rounded-2xl bg-white p-5 shadow dark:bg-slate-900">
          <h3 className="text-lg font-semibold">Historial de cotizaciones</h3>
          <p className="mt-1 text-sm text-slate-500">Consulta, revisa y abre cada cotización para descargarla en PDF.</p>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Cargando cotizaciones...</p>
            ) : quotes.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay cotizaciones creadas.</p>
            ) : (
              quotes.map((quote) => (
                <div key={quote.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{quote.title}</p>
                      <p className="text-xs text-slate-500">
                        {customersById.get(quote.customerId) ?? 'Cliente no disponible'} •{' '}
                        {new Date(quote.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-blue-600">
                      {quote.currency} {quote.total.toFixed(2)}
                    </p>
                  </div>
                  <Link className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:text-blue-800" to={`/quotes/${quote.id}`}>
                    Ver detalle →
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
