const BulkPricingTable = ({ pricing }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Min Qty</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {pricing.map((p, index) => (
          <tr key={index}>
            <td>{p.minQty}</td>
            <td>₹{p.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default BulkPricingTable;