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

const formatMoney = (currency: string, amount: number) => `${currency} ${amount.toFixed(2)}`;

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const pdfText = (x: number, y: number, size: number, value: string) => `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;

const buildProfessionalPdf = (quote: Quote, customerName: string, sourceLabel: string) => {
  const baseY = 740;
  const rowStartY = 610;

  const rows = quote.items.flatMap((item, index) => {
    const y = rowStartY - index * 22;
    const lineTotal = item.qty * item.unitPrice;
    return [
      pdfText(54, y, 10, item.description.slice(0, 44)),
      pdfText(356, y, 10, String(item.qty)),
      pdfText(418, y, 10, item.unitPrice.toFixed(2)),
      pdfText(504, y, 10, lineTotal.toFixed(2))
    ];
  });

  const commands = [
    '0.12 0.24 0.58 rg',
    '40 742 532 34 re f',
    '1 1 1 rg',
    pdfText(54, 754, 16, 'QUICKQUOTE · COTIZACIÓN PROFESIONAL'),
    '0 0 0 rg',
    pdfText(54, baseY, 11, `Documento: ${quote.title}`),
    pdfText(54, baseY - 22, 10, `Cliente: ${customerName}`),
    pdfText(54, baseY - 40, 10, `Fecha: ${new Date(quote.createdAt).toLocaleString()}`),
    pdfText(54, baseY - 58, 10, `Canal: ${sourceLabel}`),
    pdfText(54, baseY - 76, 10, `Moneda: ${quote.currency}`),
    '0.95 0.96 0.99 rg',
    '40 620 532 24 re f',
    '0.2 0.23 0.3 rg',
    pdfText(54, 628, 10, 'Descripción'),
    pdfText(356, 628, 10, 'Cant.'),
    pdfText(418, 628, 10, 'Precio'),
    pdfText(504, 628, 10, 'Total'),
    '0 0 0 rg',
    ...rows,
    '0.2 0.23 0.3 RG',
    '40 120 532 0.8 re S',
    pdfText(360, 96, 10, `Subtotal: ${quote.subtotal.toFixed(2)}`),
    pdfText(360, 78, 10, `ITBIS (18%): ${quote.tax.toFixed(2)}`),
    pdfText(360, 56, 12, `TOTAL: ${quote.total.toFixed(2)} ${quote.currency}`),
    pdfText(54, 56, 9, 'Gracias por su confianza. Esta cotización tiene validez de 15 días.')
  ].join('\n');

  const info = `6 0 obj\n<< /Title (${escapePdfText(`Cotización ${quote.title}`)}) /Author (${escapePdfText(
    sourceLabel
  )}) /Creator (QuickQuote Agent Demo) /Producer (QuickQuote PDF UX Edition) /Subject (Cotización comercial profesional) >>\nendobj`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${commands.length} >>\nstream\n${commands}\nendstream\nendobj`,
    info
  ];

  let offset = 9;
  const xref = ['0000000000 65535 f '];
  const body = objects
    .map((object) => {
      const currentOffset = offset;
      offset += object.length + 1;
      xref.push(`${currentOffset.toString().padStart(10, '0')} 00000 n `);
      return object;
    })
    .join('\n');

  const xrefOffset = offset;
  const trailer = `xref\n0 ${objects.length + 1}\n${xref.join('\n')}\ntrailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return `%PDF-1.4\n${body}\n${trailer}`;
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

    const pdfContent = buildProfessionalPdf(quote, customerName, sourceLabel);
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `cotizacion-${quote.id}.pdf`;
    link.click();

    URL.revokeObjectURL(url);
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
          <p className="text-sm text-slate-500">PDF con formato profesional y metadata de trazabilidad.</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" onClick={downloadPdf}>
          Descargar PDF
        </button>
      </header>

      <article className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Título</p>
            <p className="font-semibold">{quote.title}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Cliente</p>
            <p className="font-semibold">{customerName}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Fecha</p>
            <p>{new Date(quote.createdAt).toLocaleString()}</p>
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

        <div className="mt-6 overflow-hidden rounded-xl border">
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

        <div className="mt-4 ml-auto max-w-sm space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
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
