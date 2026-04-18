import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const ApprovalCard = ({ approval, onApprove, onReject }) => {
  const isPending = approval.status === "pending";

  return (
    <Card style={{ marginBottom: "1rem", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: '700', 
            textTransform: 'uppercase',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '0.25rem 0.5rem',
            borderRadius: 'var(--radius-sm)'
          }}>
            {approval.type}
          </span>
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: approval.status === 'approved' ? 'var(--success)' : 
                   approval.status === 'rejected' ? 'var(--error)' : 'var(--warning)'
          }}>
            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
          </span>
        </div>
        <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.25rem' }}>{approval.title}</h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Requested on {new Date(approval.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </p>
      </div>

      {isPending && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={() => onApprove(approval.id)} size="small">
            Approve
          </Button>
          <Button 
            onClick={() => onReject(approval.id)} 
            size="small" 
            variant="secondary"
            style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
          >
            Reject
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ApprovalCard;
