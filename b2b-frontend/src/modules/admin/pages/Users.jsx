import { useState, useEffect } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import { adminService } from "../services/adminService";

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creditLimit, setCreditLimit] = useState(50000);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers();
      setUsers(response.data || response || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateCredit = async () => {
    try {
      await adminService.updateCredit(selectedUser._id, Number(creditLimit));
      alert("Credit limit updated successfully!");
      setShowCreditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const openCreditModal = (user) => {
    setSelectedUser(user);
    setCreditLimit(user.creditLimit || 50000);
    setShowCreditModal(true);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading users...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>User Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage platform users and credit limits</p>
        </div>

        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>USER</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>ROLE</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>STATUS</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>CREDIT LIMIT</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>AVAILABLE CREDIT</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{user.role}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          backgroundColor: user.status === 'ACTIVE' ? 'var(--success)' : '#f1f5f9', 
                          color: user.status === 'ACTIVE' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          {user.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>
                        ₹{user.creditLimit?.toLocaleString() || '50,000'}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}>
                        ₹{user.availableCredit?.toLocaleString() || '50,000'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <Button size="small" variant="secondary" onClick={() => openCreditModal(user)}>
                          Adjust Credit
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {showCreditModal && (
          <Modal title="Adjust Credit Limit" onClose={() => setShowCreditModal(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontWeight: '600' }}>User: {selectedUser?.name}</p>
              <Input 
                label="New Credit Limit (₹)" 
                type="number" 
                value={creditLimit} 
                onChange={(e) => setCreditLimit(e.target.value)} 
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => setShowCreditModal(false)} style={{ flex: 1 }}>Cancel</Button>
                <Button onClick={handleUpdateCredit} style={{ flex: 1 }}>Update Credit</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
