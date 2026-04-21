import { useState, useEffect } from "react";
import { productService } from "../../product/services/productService";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockValue, setStockValue] = useState(0);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: 0,
    categoryId: '',
    moq: 1,
    isActive: true
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts({ limit: 100 });
      setProducts(data.data || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data.data || data || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        moq: Number(form.moq),
        categoryId: form.categoryId
      };
      
      await productService.createProduct(payload);
      alert("Product created successfully!");
      setShowModal(false);
      setForm({ name: '', description: '', price: '', stock: 0, categoryId: '', moq: 1, isActive: true });
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId?._id || '',
      moq: product.moq || 1,
      isActive: product.isActive
    });
    setShowModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: form.categoryId,
        moq: Number(form.moq),
        isActive: form.isActive
      };
      
      await productService.updateProduct(selectedProduct._id, payload);
      alert("Product updated successfully!");
      setShowModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(id);
        alert("Product deleted successfully!");
        fetchProducts();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleStockClick = (product) => {
    setSelectedProduct(product);
    setStockValue(product.stock || 0);
    setShowStockModal(true);
  };

  const handleUpdateStock = async () => {
    try {
      await productService.updateStock(selectedProduct._id, Number(stockValue));
      alert("Stock updated successfully!");
      setShowStockModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      await productService.updateStatus(product._id, !product.isActive);
      alert(`Product ${!product.isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading products...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error}</p>
      <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</Button>
    </div>
  );

  return (
      <div style={{ padding: '1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Product Management</h2>
            <p style={{ color: 'var(--text-muted)' }}>Manage your platform products and inventory</p>
          </div>
          <Button onClick={() => setShowModal(true)}>Add New Product</Button>
        </div>

        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>PRODUCT</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>CATEGORY</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>PRICE</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>STOCK</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>MOQ</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem' }}>STATUS</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {product.description?.substring(0, 50)}...
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {product.categoryId?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>
                        ₹{product.price?.toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          color: product.stock > 0 ? 'var(--success)' : 'var(--error)',
                          fontWeight: '700'
                        }}>
                          {product.stock}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {product.moq || 1}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: product.isActive ? 'var(--success)' : '#f1f5f9',
                          color: product.isActive ? 'white' : 'var(--text-muted)'
                        }}>
                          {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button 
                            size="small" 
                            variant="secondary"
                            onClick={() => handleStockClick(product)}
                          >
                            Stock
                          </Button>
                          <Button 
                            size="small" 
                            variant="secondary"
                            onClick={() => handleToggleStatus(product)}
                          >
                            {product.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button 
                            size="small" 
                            variant="secondary"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            variant="secondary"
                            style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                            onClick={() => handleDelete(product._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No products found. Add your first product to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {showModal && (
          <Modal title={selectedProduct ? "Edit Product" : "Add New Product"} onClose={() => {
            setShowModal(false);
            setSelectedProduct(null);
            setForm({ name: '', description: '', price: '', stock: 0, categoryId: '', moq: 1, isActive: true });
          }}>
            <form onSubmit={selectedProduct ? handleUpdate : handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Product Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Price (₹)"
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Stock Quantity"
                  name="stock"
                  type="number"
                  value={form.stock}
                  onChange={handleChange}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="MOQ (Min Order Qty)"
                  name="moq"
                  type="number"
                  value={form.moq}
                  onChange={handleChange}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Product Active</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button type="button" variant="secondary" onClick={() => {
                  setShowModal(false);
                  setSelectedProduct(null);
                  setForm({ name: '', description: '', price: '', stock: 0, categoryId: '', moq: 1, isActive: true });
                }} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button type="submit" style={{ flex: 1 }}>
                  {selectedProduct ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {showStockModal && (
          <Modal title="Update Stock" onClose={() => {
            setShowStockModal(false);
            setSelectedProduct(null);
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontWeight: '600' }}>Product: {selectedProduct?.name}</p>
              <Input
                label="New Stock Quantity"
                name="stock"
                type="number"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => {
                  setShowStockModal(false);
                  setSelectedProduct(null);
                }} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateStock} style={{ flex: 1 }}>
                  Update Stock
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default AdminProductsPage;
