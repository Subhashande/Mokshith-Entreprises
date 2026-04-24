import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Package, Warehouse, AlertTriangle, CheckCircle, RefreshCw, Edit3 } from 'lucide-react';

const InventoryPage = () => {
  const { inventory: rawInventory, lowStockItems: rawLowStockItems, stats, loading, error, updateStock } = useInventory();
  const inventory = Array.isArray(rawInventory) ? rawInventory : [];
  const lowStockItems = Array.isArray(rawLowStockItems) ? rawLowStockItems : [];
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stockToUpdate, setStockToUpdate] = useState({ quantity: 0 });

  const handleEditStock = (item) => {
    setSelectedItem(item);
    setStockToUpdate({ quantity: item.available });
    setIsModalOpen(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      await updateStock(selectedItem._id, stockToUpdate);
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  const getStockStatus = (item) => {
    if (item.stock <= item.reserved) return 'out-of-stock';
    if (item.available < 10) return 'low';
    return 'in-stock';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'in-stock': { bg: 'bg-green-100', text: 'text-green-700', label: 'In Stock' },
      'low': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Low Stock' },
      'out-of-stock': { bg: 'bg-red-100', text: 'text-red-700', label: 'Out of Stock' }
    };
    return badges[status] || badges['in-stock'];
  };

  if (loading && !inventory.length) {
    return (
      <div className="p-6">
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load inventory</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track and manage your product stock levels</p>
        </div>
        <Button onClick={() => window.location.reload()} className="flex items-center gap-2">
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Package size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || inventory.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-xl">
            <AlertTriangle size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Low Stock Items</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.lowStockCount || lowStockItems.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">In Stock</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.inStockCount || inventory.filter(i => getStockStatus(i) === 'in-stock').length}</p>
          </div>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Low Stock Alert</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <span key={item._id} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                {item.product?.name || 'Unknown Product'}: {item.available} left
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Reserved</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Available</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Warehouse</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Package size={32} className="mx-auto mb-2" />
                    <p>No inventory items found</p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const status = getStockStatus(item);
                  const badge = getStatusBadge(status);
                  return (
                    <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.product?.images?.[0] ? (
                            <img src={item.product.images[0]} alt={item.product?.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Package size={20} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</p>
                            <p className="text-xs text-gray-500">{item.product?.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{item.stock || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-600">{item.reserved || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${item.available < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.available || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Warehouse size={16} className="text-gray-400" />
                          <span className="text-gray-600">{item.warehouse?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleEditStock(item)}
                          className="flex items-center gap-1 ml-auto"
                        >
                          <Edit3 size={14} />
                          Update
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Update Stock">
        {selectedItem && (
          <form onSubmit={handleUpdateStock} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{selectedItem.product?.name}</p>
              <p className="text-sm text-gray-500">SKU: {selectedItem.product?.sku || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Current Stock</p>
                <p className="text-lg font-bold text-gray-900">{selectedItem.stock}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Reserved</p>
                <p className="text-lg font-bold text-gray-900">{selectedItem.reserved}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-lg font-bold text-blue-600">{selectedItem.available}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Available Quantity</label>
              <input
                type="number"
                min="0"
                value={stockToUpdate.quantity}
                onChange={(e) => setStockToUpdate({ quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Stock
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;