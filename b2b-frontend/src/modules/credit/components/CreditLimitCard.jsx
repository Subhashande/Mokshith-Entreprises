import Card from "../../../components/ui/Card";

const CreditLimitCard = ({ credit }) => {
  if (!credit) return null;

  return (
    <Card style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Credit Overview</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Credit Limit</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>₹{(credit.creditLimit || 0).toLocaleString()}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Utilized</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--error)' }}>₹{(credit.usedCredit || 0).toLocaleString()}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Available</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>₹{(credit.availableCredit || 0).toLocaleString()}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '800', color: credit.status === 'ACTIVE' ? 'var(--success)' : 'var(--error)' }}>
            {credit.status}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default CreditLimitCard;
