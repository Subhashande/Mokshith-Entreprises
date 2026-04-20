import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const AdminOrdersPage = () => {
  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Order Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Track and manage platform orders</p>
        </div>

        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              Order management interface coming soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
