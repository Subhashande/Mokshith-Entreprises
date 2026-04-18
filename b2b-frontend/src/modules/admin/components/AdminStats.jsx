import Card from "../../../components/ui/Card";

const AdminStats = ({ stats }) => {
  if (!stats) return null;

  const statItems = [
    { label: "Total Users", value: stats.totalUsers, color: "var(--primary)" },
    { label: "Total Orders", value: stats.totalOrders, color: "var(--success)" },
    { label: "Pending Approvals", value: stats.pendingApprovals, color: "var(--warning)" },
    { label: "Revenue (MTD)", value: `₹${(stats.revenue / 100000).toFixed(1)}L`, color: "var(--info)" }
  ];

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
      gap: "1.5rem", 
      marginBottom: "2.5rem" 
    }}>
      {statItems.map((item, index) => (
        <Card key={index} style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: "0.875rem", 
            fontWeight: "600", 
            color: "var(--text-muted)",
            marginBottom: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            {item.label}
          </p>
          <p style={{ 
            fontSize: "2rem", 
            fontWeight: "800", 
            color: item.color 
          }}>
            {item.value}
          </p>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;
