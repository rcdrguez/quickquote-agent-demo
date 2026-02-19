import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface QuoteItem {
  description: string;
  qty: number;
  unitPrice: number;
}

interface Quote {
  id: string;
  customerId: string;
  title: string;
  currency: string;
  createdBy: 'human' | 'ai_agent';
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
}

const formatMoney = (currency: string, amount: number) =>
  new Intl.NumberFormat('es-DO', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPrintableQuoteHtml = (quote: Quote, customerName: string, sourceLabel: string) => {
  const createdAt = new Date(quote.createdAt).toLocaleString('es-DO');
  const rows = quote.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="text-right">${item.qty}</td>
        <td class="text-right">${escapeHtml(formatMoney(quote.currency, item.unitPrice))}</td>
        <td class="text-right">${escapeHtml(formatMoney(quote.currency, item.qty * item.unitPrice))}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Cotización ${escapeHtml(quote.title)}</title>
    <style>
      @page { size: A4; margin: 20mm; }
      * { box-sizing: border-box; }
      body { font-family: Inter, Segoe UI, Arial, sans-serif; color: #0f172a; }
      .header { background: linear-gradient(135deg, #1e293b, #1d4ed8); color: white; border-radius: 14px; padding: 18px 20px; }
      .title { margin: 8px 0 0; font-size: 24px; }
      .meta { margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .meta-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
      .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .07em; margin-bottom: 4px; }
      table { width: 100%; margin-top: 16px; border-collapse: collapse; }
      thead { background: #eff6ff; }
      th, td { border: 1px solid #dbeafe; padding: 10px 12px; font-size: 13px; }
      th { text-align: left; color: #1e3a8a; }
      .text-right { text-align: right; }
      .totals { margin-top: 16px; margin-left: auto; width: 300px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
      .row { display: flex; justify-content: space-between; padding: 3px 0; }
      .row.total { margin-top: 6px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 18px; font-weight: 700; }
      .footnote { margin-top: 28px; font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <header class="header">
      <div>QuickQuote · Documento comercial</div>
      <h1 class="title">${escapeHtml(quote.title)}</h1>
    </header>

    <section class="meta">
      <div class="meta-card"><div class="meta-label">Cliente</div><strong>${escapeHtml(customerName)}</strong></div>
      <div class="meta-card"><div class="meta-label">Fecha de emisión</div><strong>${escapeHtml(createdAt)}</strong></div>
      <div class="meta-card"><div class="meta-label">Moneda</div><strong>${escapeHtml(quote.currency)}</strong></div>
      <div class="meta-card"><div class="meta-label">Canal</div><strong>${escapeHtml(sourceLabel)}</strong></div>
    </section>

    <table>
      <thead>
        <tr><th>Descripción</th><th class="text-right">Cantidad</th><th class="text-right">Precio unitario</th><th class="text-right">Total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <aside class="totals">
      <div class="row"><span>Subtotal</span><strong>${escapeHtml(formatMoney(quote.currency, quote.subtotal))}</strong></div>
      <div class="row"><span>ITBIS (18%)</span><strong>${escapeHtml(formatMoney(quote.currency, quote.tax))}</strong></div>
      <div class="row total"><span>Total</span><strong>${escapeHtml(formatMoney(quote.currency, quote.total))}</strong></div>
    </aside>

    <p class="footnote">Gracias por su confianza. Esta cotización tiene validez de 15 días.</p>
    <script>window.onload = () => { window.print(); };</script>
  </body>
</html>`;
};

export function QuoteDetailView() {
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setError('');
      try {
        const [quoteData, customersData] = await Promise.all([api.getQuote(id), api.getCustomers()]);
        setQuote(quoteData);
        setCustomers(customersData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la cotización.');
      }
    };

    load();
  }, [id]);

  const customerName = useMemo(
    () => customers.find((customer) => customer.id === quote?.customerId)?.name ?? 'Cliente no disponible',
    [customers, quote?.customerId]
  );

  const sourceLabel = quote?.createdBy === 'ai_agent' ? 'Agente de IA' : 'Persona';

  const downloadPdf = () => {
    if (!quote) return;

    const printableHtml = buildPrintableQuoteHtml(quote, customerName, sourceLabel);
    const printWindow = window.open('', `quote-print-${quote.id}`, 'width=960,height=1200');
    if (!printWindow) {
      setError('No se pudo abrir la vista de impresión. Revisa el bloqueador de popups.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
  };

  if (error) {
    return <p className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/20">{error}</p>;
  }

  if (!quote) return <p>Cargando detalle de cotización...</p>;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Detalle de cotización</h2>
          <p className="text-sm text-slate-500">Plantilla estandarizada de cotización con diseño UI/UX profesional para exportar a PDF.</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" onClick={downloadPdf}>
          Descargar PDF
        </button>
      </header>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-violet-900 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-blue-100">QuickQuote</p>
          <h3 className="mt-2 text-2xl font-semibold">{quote.title}</h3>
          <p className="mt-1 text-sm text-blue-100">Documento comercial listo para compartir con el cliente.</p>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Cliente</p>
            <p className="font-semibold">{customerName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Fecha</p>
            <p>{new Date(quote.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Moneda</p>
            <p className="font-semibold">{quote.currency}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Origen</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                quote.createdBy === 'ai_agent'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-100'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100'
              }`}
            >
              {quote.createdBy === 'ai_agent' ? 'Agente de IA' : 'Persona'}
            </span>
          </div>
        </div>

        <div className="mx-6 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-right">Cantidad</th>
                <th className="p-3 text-right">Precio unitario</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={`${item.description}-${index}`} className="border-t dark:border-slate-800">
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-right">{item.qty}</td>
                  <td className="p-3 text-right">{formatMoney(quote.currency, item.unitPrice)}</td>
                  <td className="p-3 text-right">{formatMoney(quote.currency, item.qty * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="m-6 mt-4 ml-auto max-w-sm space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <strong>{formatMoney(quote.currency, quote.subtotal)}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>ITBIS (18%)</span>
            <strong>{formatMoney(quote.currency, quote.tax)}</strong>
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-base">
            <span>Total</span>
            <strong>{formatMoney(quote.currency, quote.total)}</strong>
          </div>
        </div>
      </article>
    </section>
  );
}
