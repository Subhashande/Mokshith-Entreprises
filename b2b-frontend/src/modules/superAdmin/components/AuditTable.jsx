const AuditTable = ({ logs }) => {
  return (
    <table border="1" width="100%" cellPadding="5">
      <thead>
        <tr>
          <th>User</th>
          <th>Action</th>
          <th>Time</th>
        </tr>
      </thead>

      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>{log.user}</td>
            <td>{log.action}</td>
            <td>{new Date(log.timestamp).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AuditTable;