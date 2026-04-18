import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const AdminManagement = ({ admins }) => {
  return (
    <Card style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Admin Management</h3>
        <Button size="small">Create Admin</Button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem' }}>NAME</th>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem' }}>EMAIL</th>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem' }}>STATUS</th>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>{admin.name}</td>
              <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{admin.email}</td>
              <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                <span style={{ 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  backgroundColor: admin.status === 'ACTIVE' ? 'var(--success)' : '#f1f5f9', 
                  color: admin.status === 'ACTIVE' ? 'white' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  {admin.status}
                </span>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                <Button size="small" variant="secondary" style={{ marginRight: '0.5rem' }}>Edit</Button>
                <Button size="small" variant="secondary" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default AdminManagement;
