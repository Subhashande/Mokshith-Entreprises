const AdminStats = ({ stats }) => {
  if (!stats) return null;

  return (
    <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
      <div>Users: {stats.totalUsers}</div>
      <div>Orders: {stats.totalOrders}</div>
      <div>Pending: {stats.pendingApprovals}</div>
    </div>
  );
};

export default AdminStats;