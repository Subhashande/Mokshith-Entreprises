import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import styles from './ApprovalCard.module.css';

const ApprovalCard = ({ approval, onApprove, onReject }) => {
  const isPending = approval.status === "pending";

  const getStatusClass = () => {
    if (approval.status === 'approved') return styles.statusApproved;
    if (approval.status === 'rejected') return styles.statusRejected;
    return styles.statusPending;
  };

  return (
    <Card className={styles.card}>
      <div className={styles.contentWrapper}>
        <div className={styles.headerRow}>
          <span className={styles.typeBadge}>
            {approval.type}
          </span>
          <span className={`${styles.status} ${getStatusClass()}`}>
            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
          </span>
        </div>
        <h4 className={styles.title}>{approval.title}</h4>
        <p className={styles.date}>
          Requested on {new Date(approval.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </p>
      </div>

      {isPending && (
        <div className={styles.actions}>
          <Button onClick={() => onApprove(approval.id)} size="small">
            Approve
          </Button>
          <Button 
            onClick={() => onReject(approval.id)} 
            size="small" 
            variant="secondary"
            className={styles.rejectButton}
          >
            Reject
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ApprovalCard;
