import Card from "../../../components/ui/Card";

const AuditTable = ({ logs }) => {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>USER</th>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>ACTION</th>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>TARGET</th>
            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '700' }}>TIMESTAMP</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(logs) && logs.length > 0 ? (
            logs.map((log) => (
              <tr key={log.id || log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '500' }}>{log.user}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    backgroundColor: '#f1f5f9', 
                    fontSize: '0.75rem', 
                    fontWeight: '700' 
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{log.target}</td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp || log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No audit logs available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
};

export default AuditTable;
