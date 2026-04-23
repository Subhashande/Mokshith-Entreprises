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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockValue, setStockValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: 0,
    categoryId: '',
    moq: 1,
    isActive: true
  });

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', stock: 0, categoryId: '', moq: 1, isActive: true });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    resetForm();
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setSelectedProduct(null);
  };

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
      setSubmitting(true);
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        moq: Number(form.moq),
        categoryId: form.categoryId
      };
      
      await productService.createProduct(payload);
      alert("Product created successfully!");
      closeModal();
      fetchProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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
      setSubmitting(true);
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
      closeModal();
      fetchProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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
      setSubmitting(true);
      await productService.updateStock(selectedProduct._id, Number(stockValue));
      alert("Stock updated successfully!");
      closeStockModal();
      fetchProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "" || product.categoryId?._id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) return (
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
    <div style={{ padding: '1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Product Inventory</h2>
            <p style={{ color: 'var(--text-muted)' }}>Monitor stock levels and manage your product catalog</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ Add New Product</Button>
        </div>

        <Card style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search products by name or description..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                🔍
              </span>
            </div>
            <div style={{ width: '200px' }}>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 0 }}>
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>PRODUCT DETAILS</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>STOCK LEVEL</th>
                  <th>MOQ</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '300px' }}>
                          {product.description?.substring(0, 80)}{product.description?.length > 80 ? '...' : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {product.categoryId?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        ₹{product.price?.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontWeight: '800', 
                            color: product.stock > 10 ? 'var(--success)' : product.stock > 0 ? 'var(--warning)' : 'var(--error)' 
                          }}>
                            {product.stock}
                          </span>
                          {product.stock === 0 && <span className="badge badge-error">OUT</span>}
                          {product.stock > 0 && product.stock <= 10 && <span className="badge badge-warning">LOW</span>}
                        </div>
                      </td>
                      <td>{product.moq || 1}</td>
                      <td>
                        <span 
                          onClick={() => handleToggleStatus(product)}
                          className={`badge ${product.isActive ? 'badge-success' : 'badge-muted'}`}
                          style={{ cursor: 'pointer' }}
                          title="Click to toggle status"
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button size="small" variant="secondary" onClick={() => handleStockClick(product)} title="Update Stock">
                            Stock
                          </Button>
                          <Button size="small" variant="secondary" onClick={() => handleEdit(product)} title="Edit Product">
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            variant="secondary" 
                            style={{ color: 'var(--error)' }} 
                            onClick={() => handleDelete(product._id)}
                            title="Delete Product"
                          >
                            🗑️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                      <h3 style={{ fontWeight: '700', color: 'var(--text-main)' }}>No Products Found</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters to find what you're looking for.</p>
                      {searchTerm || filterCategory ? (
                        <Button variant="secondary" style={{ marginTop: '1rem' }} onClick={() => { setSearchTerm(""); setFilterCategory(""); }}>
                          Clear All Filters
                        </Button>
                      ) : (
                        <Button style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>
                          Add Your First Product
                        </Button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {showModal && (
          <Modal title={selectedProduct ? "Edit Product" : "Create New Product"} onClose={closeModal}>
            <form onSubmit={selectedProduct ? handleUpdate : handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="Product Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Premium Basmati Rice"
                required
              />
              
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                  Product Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the product features, quality, etc..."
                  rows="4"
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
                  label="Available Stock"
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
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Minimum Order Quantity"
                  name="moq"
                  type="number"
                  value={form.moq}
                  onChange={handleChange}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  style={{ width: '1.25rem', height: '1.25rem' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Make product visible on marketplace</span>
              </label>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button type="button" variant="secondary" onClick={closeModal} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} style={{ flex: 1 }}>
                  {selectedProduct ? 'Save Changes' : 'Create Product'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {showStockModal && (
          <Modal title="Update Stock Level" onClose={closeStockModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.25rem' }}>PRODUCT</p>
                <p style={{ fontSize: '1.125rem', fontWeight: '800' }}>{selectedProduct?.name}</p>
              </div>
              
              <Input
                label="Current Quantity in Stock"
                name="stock"
                type="number"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
              />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button variant="secondary" onClick={closeStockModal} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateStock} loading={submitting} style={{ flex: 1 }}>
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