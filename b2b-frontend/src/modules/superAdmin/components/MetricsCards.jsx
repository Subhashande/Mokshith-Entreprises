import Card from "../../../components/ui/Card";

const MetricsCards = ({ metrics }) => {
  if (!metrics) return null;

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0.0K";
    return `₹${(val / 1000).toFixed(1)}K`;
  };

  const items = [
    { label: "Total Users", value: metrics.totalUsers || 0, color: "var(--primary)" },
    { label: "Active Vendors", value: metrics.activeVendors || 0, color: "var(--success)" },
    { label: "Orders Today", value: metrics.ordersToday || 0, color: "var(--info)" },
    { label: "Revenue Today", value: formatCurrency(metrics.revenueToday), color: "var(--accent)" },
    { label: "Pending Approvals", value: metrics.pendingApprovals || 0, color: "var(--warning)" }
  ];

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
      gap: "1.5rem", 
      marginBottom: "2.5rem" 
    }}>
      {items.map((item, index) => (
        <Card key={index} style={{ textAlign: 'center' }}>
          <p style={{ 
            fontSize: "0.75rem", 
            fontWeight: "700", 
            color: "var(--text-muted)",
            marginBottom: "0.5rem",
            textTransform: "uppercase"
          }}>
            {item.label}
          </p>
          <p style={{ 
            fontSize: "1.5rem", 
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

export default MetricsCards;
