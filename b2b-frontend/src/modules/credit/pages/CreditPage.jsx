import { useCredit } from "../hooks/useCredit";
import CreditLimitCard from "../components/CreditLimitCard";
import LedgerTable from "../components/LedgerTable";

const CreditPage = () => {
  const { credit, ledger, loading, error } = useCredit();

  if (loading) return <p>Loading credit data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Credit Management</h1>

      <CreditLimitCard credit={credit} />

      <h2>Ledger</h2>
      <LedgerTable ledger={ledger} />
    </div>
  );
};

export default CreditPage;