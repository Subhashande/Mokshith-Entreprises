const LedgerTable = ({ ledger }) => {
  return (
    <table border="1" width="100%" cellPadding="5">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        {ledger.map((entry) => (
          <tr key={entry.id}>
            <td>{new Date(entry.date).toLocaleDateString()}</td>
            <td>{entry.type}</td>
            <td>₹{entry.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LedgerTable;