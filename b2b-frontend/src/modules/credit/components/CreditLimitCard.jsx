import Card from "../../../components/ui/Card";

const CreditLimitCard = ({ credit }) => {
  if (!credit) return null;

  return (
    <Card style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Credit Overview</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Credit Limit</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>₹{(credit.limit / 100000).toFixed(1)}L</p>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Utilized</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--error)' }}>₹{(credit.used / 100000).toFixed(1)}L</p>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Available</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>₹{(credit.available / 100000).toFixed(1)}L</p>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Due Amount</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--warning)' }}>₹{credit.dueAmount.toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
};

export default CreditLimitCard;
