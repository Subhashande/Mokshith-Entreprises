const CreditLimitCard = ({ credit }) => {
  if (!credit) return null;

  return (
    <div style={{ border: "1px solid #ddd", padding: "15px" }}>
      <h3>Credit Overview</h3>

      <p>Total Limit: ₹{credit.limit}</p>
      <p>Used: ₹{credit.used}</p>
      <p>Available: ₹{credit.available}</p>
    </div>
  );
};

export default CreditLimitCard;