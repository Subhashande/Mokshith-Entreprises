import { useState, useEffect } from "react";
import { productService } from "../../product/services/productService";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Table, { TableRow, TableCell } from "../../../components/ui/Table";
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Edit3, 
  Trash2, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

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
      setProducts(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
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
      categoryId: product.categoryId?._id || product.categoryId || '',
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
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredProducts = products.filter(product => {
    const name = product?.name || "";
    const description = product?.description || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          description.toLowerCase().includes(searchTerm.toLowerCase());
    const productCatId = product?.categoryId?._id || product?.categoryId || "";
    const matchesCategory = filterCategory === "" || productCatId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading products...</p>
      </div>
    </div>
  );

  const headers = [
    { label: 'Product Details' },
    { label: 'Category' },
    { label: 'Price' },
    { label: 'Stock Level' },
    { label: 'MOQ' },
    { label: 'Status' },
    { label: 'Actions', className: 'text-right' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Product Inventory</h1>
          <p className="text-gray-500 mt-1 font-medium">Monitor stock levels and manage your product catalog</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6">
          <Plus size={20} />
          Add New Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="md:col-span-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search products by name or description..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div className="sm:w-64 relative">
              <Filter size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
        <Card className="flex items-center justify-between p-6 bg-blue-600 text-white border-none">
          <div>
            <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">Total Products</p>
            <p className="text-3xl font-black mt-1">{products.length}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-2xl">
            <TrendingUp size={28} />
          </div>
        </Card>
      </div>

      <Table headers={headers}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const isLowStock = product.stock > 0 && product.stock <= 10;
            const isOutOfStock = product.stock === 0;
            
            return (
              <TableRow key={product._id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <Package size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight mb-1">{product.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 max-w-[250px]">
                        {product.description || 'No description available'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    {product.categoryId?.name || 'Uncategorized'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-black text-gray-900">₹{product.price?.toLocaleString()}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-black ${
                      isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.stock}
                    </span>
                    {isOutOfStock && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-black uppercase">OUT</span>
                    )}
                    {isLowStock && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-black uppercase">LOW</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-gray-600">{product.moq || 1}</span>
                </TableCell>
                <TableCell>
                  <button 
                    onClick={() => handleToggleStatus(product)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      product.isActive 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {product.isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {product.isActive ? 'Active' : 'Inactive'}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleStockClick(product)}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                      title="Update Stock"
                    >
                      <TrendingUp size={18} />
                    </button>
                    <button 
                      onClick={() => handleEdit(product)}
                      className="p-2 hover:bg-gray-100 text-gray-500 rounded-xl transition-all"
                      title="Edit Product"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product._id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                      title="Delete Product"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan="7" className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                  <Package size={40} className="text-gray-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">No Products Found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
                {searchTerm || filterCategory ? (
                  <Button variant="secondary" onClick={() => { setSearchTerm(""); setFilterCategory(""); }} className="mt-2">
                    Clear All Filters
                  </Button>
                ) : (
                  <Button onClick={() => setShowModal(true)} className="mt-2">
                    Add Your First Product
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        )}
      </Table>

      <Modal 
        isOpen={showModal} 
        onClose={closeModal}
        title={selectedProduct ? "Edit Product" : "Create New Product"}
        size="lg"
      >
        <form onSubmit={selectedProduct ? handleUpdate : handleSubmit} className="space-y-6">
          <Input
            label="Product Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Premium Basmati Rice"
            required
          />
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Product Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the product features, quality, etc..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <div className="relative">
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none bg-white cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
                <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <Input
              label="Minimum Order Quantity"
              name="moq"
              type="number"
              value={form.moq}
              onChange={handleChange}
            />
          </div>

          <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-5 h-5 border-2 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
              Make product visible on marketplace
            </span>
          </label>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              {selectedProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showStockModal} 
        onClose={closeStockModal}
        title="Update Stock Level"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Product</p>
            <p className="text-xl font-black text-blue-900">{selectedProduct?.name}</p>
          </div>
          
          <Input
            label="Current Quantity in Stock"
            name="stock"
            type="number"
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            className="text-lg font-bold"
          />
          
          <div className="flex gap-4 pt-4">
            <Button variant="secondary" onClick={closeStockModal} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpdateStock} loading={submitting} className="flex-1">
              Update Stock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProductsPage;