import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function QuoteDetailView() {
  const { id } = useParams();
  const [quote, setQuote] = useState<any>();

  useEffect(() => {
    if (id) api.getQuote(id).then(setQuote);
  }, [id]);

  if (!quote) return <p>Cargando...</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Detalle de Cotización</h2>
      <div className="rounded bg-white p-4 shadow dark:bg-slate-900">
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
