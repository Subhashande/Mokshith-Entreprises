import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const AdminVendorsPage = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Vendor Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage platform vendors and their approvals</p>
        </div>

        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              Vendor management interface coming soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminVendorsPage;
