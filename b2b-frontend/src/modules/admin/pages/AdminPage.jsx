import { useAdmin } from "../hooks/useAdmin";
import ApprovalCard from "../components/ApprovalCard";
import AdminStats from "../components/AdminStats";

const AdminPage = () => {
  const { approvals, stats, loading, error, approve } = useAdmin();

  if (loading) return <p>Loading admin data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <AdminStats stats={stats} />

      <h2>Approvals</h2>

      {approvals.map((a) => (
        <ApprovalCard key={a.id} approval={a} onApprove={approve} />
      ))}
    </div>
  );
};

export default AdminPage;