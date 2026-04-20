import { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";

const AdminManagement = ({ admins, onCreateAdmin, onDeleteAdmin }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', mobile: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const success = await onCreateAdmin(form);
      if (success) {
        setShowModal(false);
        setForm({ name: '', email: '', password: '', mobile: '' });
        alert("Admin created successfully!");
      } else {
        alert("Failed to create admin. Please check the details.");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Card style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Admin Management</h3>
        <Button size="small" onClick={() => setShowModal(true)}>Create Admin</Button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem' }}>NAME</th>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem' }}>EMAIL</th>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem' }}>STATUS</th>
            <th style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(admins) && admins.length > 0 ? (
            admins.map((admin) => (
              <tr key={admin.id || admin._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>{admin.name}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{admin.email}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    backgroundColor: admin.status === 'ACTIVE' ? 'var(--success)' : '#f1f5f9', 
                    color: admin.status === 'ACTIVE' ? 'white' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    {admin.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <Button size="small" variant="secondary" style={{ marginRight: '0.5rem' }}>Edit</Button>
                  <Button 
                    size="small" 
                    variant="secondary" 
                    style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={async () => {
                      if(window.confirm('Are you sure you want to delete this admin?')) {
                        try {
                          const success = await onDeleteAdmin(admin.id || admin._id);
                          if (success) {
                            alert("Admin deleted successfully!");
                          } else {
                            alert("Failed to delete admin.");
                          }
                        } catch (error) {
                          alert(error.message);
                        }
                      }
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No administrators found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <Modal title="Create New Admin" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} required />
            <Input label="Mobile Number" name="mobile" value={form.mobile} onChange={handleChange} required />
            <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange} required />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button type="submit" style={{ flex: 1 }}>Create Admin</Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
};

export default AdminManagement;
