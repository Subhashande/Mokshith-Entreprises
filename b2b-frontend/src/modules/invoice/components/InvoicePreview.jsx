const InvoicePreview = ({ invoice }) => {
  return (
    <div style={{ border: "1px solid #ccc", padding: "20px", marginTop: "10px" }}>
      <h2>Invoice #{invoice.id}</h2>

      <p><strong>Customer:</strong> {invoice.customerName}</p>
      <p><strong>Order ID:</strong> {invoice.orderId}</p>
      <p><strong>Date:</strong> {new Date(invoice.createdAt).toLocaleString()}</p>

      <table width="100%" border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>₹{item.price}</td>
              <td>₹{item.quantity * item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Total: ₹{invoice.totalAmount}</h3>
    </div>
  );
};

export default InvoicePreview;