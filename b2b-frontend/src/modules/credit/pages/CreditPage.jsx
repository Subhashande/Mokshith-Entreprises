import { useCredit } from "../hooks/useCredit";
import CreditLimitCard from "../components/CreditLimitCard";
import LedgerTable from "../components/LedgerTable";
import Navbar from "../../../components/common/Navbar";

const CreditPage = () => {
  const { credit, ledger, loading, error } = useCredit();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading credit data...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Credit Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Monitor your business credit limit and transaction history</p>
        </div>

        {error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>{error}</div>
        ) : (
          <>
            <CreditLimitCard credit={credit} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', marginTop: '3rem' }}>Transaction Ledger</h3>
            <LedgerTable ledger={ledger} />
          </>
        )}
      </main>
    </div>
  );
};

export default CreditPage;