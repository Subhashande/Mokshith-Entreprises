const KPIWidget = ({ label, value }) => {
  return (
    <div style={{ border: "1px solid #ddd", padding: "10px", margin: "5px" }}>
      <h4>{label}</h4>
      <p style={{ fontSize: "20px", fontWeight: "bold" }}>{value}</p>
    </div>
  );
};

export default KPIWidget;