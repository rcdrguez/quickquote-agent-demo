import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { AgentRoute } from './routes/AgentRoute';
import { CustomersRoute } from './routes/CustomersRoute';
import { QuoteDetailRoute } from './routes/QuoteDetailRoute';
import { QuotesRoute } from './routes/QuotesRoute';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/customers" element={<CustomersRoute />} />
        <Route path="/quotes" element={<QuotesRoute />} />
        <Route path="/quotes/:id" element={<QuoteDetailRoute />} />
        <Route path="/agent" element={<AgentRoute />} />
        <Route path="*" element={<Navigate to="/customers" replace />} />
      </Routes>
    </Layout>
  );
}
