const ApprovalCard = ({ approval, onApprove }) => {
  return (
    <div style={{ border: "1px solid #ddd", padding: "10px", marginBottom: "10px" }}>
      <p><strong>Type:</strong> {approval.type}</p>
      <p><strong>Status:</strong> {approval.status}</p>
      <p><strong>Date:</strong> {new Date(approval.createdAt).toLocaleString()}</p>

      {approval.status !== "approved" && (
        <button onClick={() => onApprove(approval.id)}>
          Approve
        </button>
      )}
    </div>
  );
};

export default ApprovalCard;