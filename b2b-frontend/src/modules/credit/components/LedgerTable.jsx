import Card from "../../../components/ui/Card";

const LedgerTable = ({ ledger }) => {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>DATE</th>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>DESCRIPTION</th>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>TYPE</th>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(ledger) && ledger.length > 0 ? (
            ledger.map((entry) => (
              <tr key={entry.id || entry._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  {new Date(entry.date || entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{entry.description || entry.note}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px',
                    backgroundColor: entry.type === 'CREDIT' ? 'var(--primary-light)' : '#fff1f2',
                    color: entry.type === 'CREDIT' ? 'var(--primary)' : '#e11d48'
                  }}>
                    {entry.type}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700', textAlign: 'right' }}>
                  ₹{(entry.amount || 0).toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No credit transactions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
};

export default LedgerTable;
