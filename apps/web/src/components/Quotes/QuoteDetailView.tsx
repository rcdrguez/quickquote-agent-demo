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
        <td class="text-end">${item.qty}</td>
        <td class="text-end">${escapeHtml(formatMoney(quote.currency, item.unitPrice))}</td>
        <td class="text-end fw-semibold">${escapeHtml(formatMoney(quote.currency, item.qty * item.unitPrice))}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cotización ${escapeHtml(quote.title)}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <style>
      @page { size: A4; margin: 14mm; }
      body {
        font-family: Inter, "Segoe UI", system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .sheet {
        background: #ffffff;
        border-radius: 18px;
        border: 1px solid #dbeafe;
        box-shadow: 0 15px 45px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }
      .hero {
        background: radial-gradient(circle at top right, #2563eb, #1e1b4b 68%);
        color: white;
      }
      .hero-subtitle {
        letter-spacing: .12em;
        text-transform: uppercase;
        font-size: 11px;
        opacity: .85;
      }
      .hero-title {
        font-size: 30px;
        font-weight: 700;
      }
      .meta-card {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #f8fafc;
      }
      .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .07em;
        color: #64748b;
      }
      .table thead th {
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 12px;
        border-bottom: 0;
        text-transform: uppercase;
        letter-spacing: .05em;
      }
      .summary {
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
      }
      .summary-total {
        font-size: 1.4rem;
        color: #1d4ed8;
      }
      .watermark {
        position: absolute;
        top: 50%;
        left: 52%;
        transform: translate(-50%, -50%) rotate(-26deg);
        color: rgba(37, 99, 235, 0.06);
        font-size: 92px;
        font-weight: 800;
        pointer-events: none;
        user-select: none;
      }
      @media print {
        body { background: white; }
        .sheet { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main class="container py-3">
      <article class="sheet position-relative p-0">
        <div class="watermark">QUICKQUOTE</div>
        <header class="hero p-4 p-md-5">
          <div class="d-flex justify-content-between align-items-start gap-4 flex-wrap">
            <div>
              <p class="hero-subtitle mb-2">Propuesta comercial</p>
              <h1 class="hero-title mb-0">${escapeHtml(quote.title)}</h1>
            </div>
            <div class="text-md-end">
              <div class="small opacity-75">Documento</div>
              <div class="fs-5 fw-bold">#${escapeHtml(quote.id.slice(0, 8).toUpperCase())}</div>
            </div>
          </div>
        </header>

        <section class="p-4 p-md-5">
          <div class="row g-3 mb-4">
            <div class="col-md-6"><div class="meta-card p-3"><div class="meta-label">Cliente</div><div class="fw-semibold mt-1">${escapeHtml(customerName)}</div></div></div>
            <div class="col-md-6"><div class="meta-card p-3"><div class="meta-label">Fecha emisión</div><div class="fw-semibold mt-1">${escapeHtml(createdAt)}</div></div></div>
            <div class="col-md-6"><div class="meta-card p-3"><div class="meta-label">Moneda</div><div class="fw-semibold mt-1">${escapeHtml(quote.currency)}</div></div></div>
            <div class="col-md-6"><div class="meta-card p-3"><div class="meta-label">Canal</div><div class="fw-semibold mt-1">${escapeHtml(sourceLabel)}</div></div></div>
          </div>

          <div class="table-responsive rounded-4 border border-primary-subtle overflow-hidden">
            <table class="table align-middle mb-0">
              <thead>
                <tr><th>Descripción</th><th class="text-end">Cantidad</th><th class="text-end">Precio unitario</th><th class="text-end">Importe</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>

          <div class="row justify-content-end mt-4">
            <div class="col-md-6 col-lg-5">
              <div class="summary p-3 p-md-4">
                <div class="d-flex justify-content-between small text-secondary mb-2"><span>Subtotal</span><strong>${escapeHtml(formatMoney(quote.currency, quote.subtotal))}</strong></div>
                <div class="d-flex justify-content-between small text-secondary mb-3"><span>ITBIS (18%)</span><strong>${escapeHtml(formatMoney(quote.currency, quote.tax))}</strong></div>
                <div class="d-flex justify-content-between align-items-center border-top pt-3"><span class="fw-semibold">Total</span><strong class="summary-total">${escapeHtml(formatMoney(quote.currency, quote.total))}</strong></div>
              </div>
            </div>
          </div>

          <footer class="mt-4 pt-3 border-top text-secondary small">
            <p class="mb-1">Gracias por su confianza. Esta cotización tiene validez de 15 días naturales.</p>
            <p class="mb-0">Emitido automáticamente por QuickQuote.</p>
          </footer>
        </section>
      </article>
    </main>
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
    const printWindow = window.open('', `quote-print-${quote.id}`, 'width=1100,height=1350');
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
          <p className="text-sm text-slate-500">Plantilla PDF renovada con layout estilo invoice profesional sobre Bootstrap 5.</p>
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
