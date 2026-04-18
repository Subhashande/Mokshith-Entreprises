import { useInvoice } from "../hooks/useInvoice";
import InvoicePreview from "../components/InvoicePreview";

const InvoicePage = () => {
  const { invoices, loading, error } = useInvoice();

  if (loading) return <p>Loading invoices...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Invoices</h1>

      {invoices.map((invoice) => (
        <InvoicePreview key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );
};

export default InvoicePage;