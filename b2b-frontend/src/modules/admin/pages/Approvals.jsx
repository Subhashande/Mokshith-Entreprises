import { useAdmin } from "../hooks/useAdmin";
import ApprovalCard from "../components/ApprovalCard";
import Button from "../../../components/ui/Button";

const AdminApprovalsPage = () => {
  const { approvals, loading, error, approve, reject } = useAdmin();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading approvals...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error}</p>
      <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</Button>
    </div>
  );

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Pending Approvals</h2>
          <p style={{ color: 'var(--text-muted)' }}>Review and manage user registration requests</p>
        </div>

        <div>
          {approvals.length > 0 ? (
            approvals.map((a) => (
              <ApprovalCard 
                key={a.id} 
                approval={a} 
                onApprove={approve} 
                onReject={reject}
              />
            ))
          ) : (
            <div style={{ 
              padding: '4rem', 
              textAlign: 'center', 
              backgroundColor: 'var(--surface)', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px dashed var(--border)' 
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>
                No pending approvals at this time. Check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminApprovalsPage;
