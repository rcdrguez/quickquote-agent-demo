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

const sanitizePdfText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ');

const escapePdfText = (value: string) => sanitizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const pdfText = (x: number, y: number, size: number, value: string) => `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;

const wrapPdfText = (value: string, maxChars: number) => {
  const words = sanitizePdfText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
};

const buildProfessionalPdf = (quote: Quote, customerName: string, sourceLabel: string) => {
  const createdAt = new Date(quote.createdAt).toLocaleString('es-DO');
  const commands: string[] = [
    '0.1 0.15 0.35 rg',
    '40 730 532 52 re f',
    '1 1 1 rg',
    pdfText(54, 760, 18, 'QuickQuote'),
    pdfText(54, 742, 10, 'Cotizacion comercial profesional'),
    '0.93 0.96 1 rg',
    '40 648 532 68 re f',
    '0.18 0.22 0.3 rg',
    pdfText(54, 700, 11, `Documento: ${quote.title}`),
    pdfText(54, 684, 10, `Cliente: ${customerName}`),
    pdfText(54, 668, 10, `Fecha de emision: ${createdAt}`),
    pdfText(330, 684, 10, `Canal: ${sourceLabel}`),
    pdfText(330, 668, 10, `Moneda: ${quote.currency}`),
    '0.2 0.24 0.34 rg',
    '40 626 532 20 re f',
    '1 1 1 rg',
    pdfText(54, 632, 9, 'Descripcion'),
    pdfText(370, 632, 9, 'Cant.'),
    pdfText(430, 632, 9, 'Precio unitario'),
    pdfText(514, 632, 9, 'Total'),
    '0 0 0 rg'
  ];

  let currentY = 612;
  quote.items.forEach((item, index) => {
    const lines = wrapPdfText(item.description, 48);
    const rowHeight = Math.max(20, lines.length * 12);
    const lineTotal = item.qty * item.unitPrice;

    if (index % 2 === 0) {
      commands.push('0.98 0.99 1 rg');
      commands.push(`40 ${currentY - rowHeight + 4} 532 ${rowHeight} re f`);
      commands.push('0 0 0 rg');
    }

    lines.forEach((line, lineIndex) => {
      commands.push(pdfText(54, currentY - lineIndex * 11, 9, line));
    });

    commands.push(pdfText(372, currentY, 9, String(item.qty)));
    commands.push(pdfText(430, currentY, 9, formatMoney(quote.currency, item.unitPrice)));
    commands.push(pdfText(514, currentY, 9, formatMoney(quote.currency, lineTotal)));
    currentY -= rowHeight;
  });

  commands.push(
    '0.2 0.23 0.3 RG',
    `40 ${currentY - 16} 532 0.8 re S`,
    pdfText(360, currentY - 34, 10, `Subtotal: ${formatMoney(quote.currency, quote.subtotal)}`),
    pdfText(360, currentY - 50, 10, `ITBIS (18%): ${formatMoney(quote.currency, quote.tax)}`),
    pdfText(360, currentY - 72, 12, `TOTAL: ${formatMoney(quote.currency, quote.total)}`),
    pdfText(54, 52, 9, 'Gracias por su confianza. Esta cotizacion tiene validez de 15 dias.')
  );

  const content = commands.join('\n');

  const info = `6 0 obj\n<< /Title (${escapePdfText(`Cotizacion ${quote.title}`)}) /Author (${escapePdfText(
    sourceLabel
  )}) /Creator (QuickQuote Agent Demo) /Producer (QuickQuote PDF UX Edition) /Subject (Cotizacion comercial profesional) >>\nendobj`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
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
          <p className="text-sm text-slate-500">Diseño premium con PDF estable para caracteres especiales.</p>
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
