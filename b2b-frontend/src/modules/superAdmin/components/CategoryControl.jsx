import { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";

const CategoryControl = ({ categories, onCreateCategory, onDeleteCategory }) => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', subcategories: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      subcategories: form.subcategories.split(',').map(s => s.trim()).filter(s => s !== '')
    };
    try {
      const success = await onCreateCategory(payload);
      if (success) {
        setShowModal(false);
        setForm({ name: '', description: '', subcategories: '' });
        alert("Category created successfully!");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Card style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Category Control</h3>
        <Button size="small" onClick={() => setShowModal(true)}>Create Category</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {Array.isArray(categories) && categories.length > 0 ? (
          categories.map((category) => (
            <Card key={category.id || category._id} style={{ padding: '1.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--primary-light)' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--primary)' }}>{category.name}</h4>
              <div style={{ marginBottom: '1.5rem' }}>
                {Array.isArray(category.subcategories) && category.subcategories.map((sub, index) => (
                  <span key={index} style={{ 
                    display: 'inline-block', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    backgroundColor: 'white', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    marginRight: '0.5rem',
                    marginBottom: '0.5rem',
                    border: '1px solid var(--border)'
                  }}>
                    {sub}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button size="small" variant="secondary" style={{ flex: 1 }}>Edit</Button>
                <Button 
                  size="small" 
                  variant="secondary" 
                  style={{ flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }}
                  onClick={async () => {
                    if(window.confirm('Are you sure you want to delete this category?')) {
                      try {
                        await onDeleteCategory(category.id || category._id);
                        alert("Category deleted successfully!");
                      } catch (error) {
                        alert(error.message);
                      }
                    }
                  }}
                >
                  Disable
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', width: '100%' }}>
            No categories defined.
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Create New Category" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input label="Category Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="Description" name="description" value={form.description} onChange={handleChange} />
            <Input label="Subcategories (comma separated)" name="subcategories" value={form.subcategories} onChange={handleChange} placeholder="Electronics, Mobile, Laptop" />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button type="submit" style={{ flex: 1 }}>Create Category</Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
};

export default CategoryControl;
