import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function QuoteDetailView() {
  const { id } = useParams();
  const [quote, setQuote] = useState<any>();

  useEffect(() => {
    if (id) api.getQuote(id).then(setQuote);
  }, [id]);

  const downloadQuote = () => {
    if (!quote) return;
    const lines = [
      `Cotización: ${quote.title}`,
      `Fecha: ${new Date(quote.createdAt).toLocaleString()}`,
      `Moneda: ${quote.currency}`,
      '',
      'Items:',
      ...quote.items.map((item: any, idx: number) => `${idx + 1}. ${item.description} - ${item.qty} x ${item.unitPrice}`),
      '',
      `Subtotal: ${quote.subtotal.toFixed(2)}`,
      `ITBIS: ${quote.tax.toFixed(2)}`,
      `Total: ${quote.total.toFixed(2)}`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizacion-${quote.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!quote) return <p>Cargando...</p>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Detalle de Cotización</h2>
        <button className="rounded-lg bg-blue-600 px-3 py-2 text-white" onClick={downloadQuote}>Descargar cotización</button>
      </div>
      <div className="rounded-xl bg-white p-4 shadow dark:bg-slate-900">
        <p className="font-medium">{quote.title}</p>
        <p className="text-sm text-slate-500">{new Date(quote.createdAt).toLocaleString()}</p>
        <p className="mt-2">Moneda: {quote.currency}</p>
        <ul className="mt-3 list-disc pl-6">
          {quote.items.map((item: any, idx: number) => <li key={idx}>{item.description} - {item.qty} x {item.unitPrice}</li>)}
        </ul>
        <div className="mt-4 space-y-1">
          <p>Subtotal: {quote.subtotal.toFixed(2)}</p>
          <p>ITBIS: {quote.tax.toFixed(2)}</p>
          <p className="font-semibold">Total: {quote.total.toFixed(2)}</p>
        </div>
      </div>
    </section>
  );
}
