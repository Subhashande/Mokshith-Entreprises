import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import { 
  Package, 
  Warehouse, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Edit3,
  TrendingUp,
  History,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const InventoryPage = () => {
  const { inventory: rawInventory, lowStockItems: rawLowStockItems, stats, loading, error, updateStock } = useInventory();
  const inventory = Array.isArray(rawInventory) ? rawInventory : [];
  const lowStockItems = Array.isArray(rawLowStockItems) ? rawLowStockItems : [];
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stockToUpdate, setStockToUpdate] = useState({ quantity: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditStock = (item) => {
    setSelectedItem(item);
    setStockToUpdate({ quantity: item.available });
    setIsModalOpen(true);
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await updateStock(selectedItem._id, stockToUpdate);
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error("Failed to update stock:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockStatus = (item) => {
    const stock = item.stock || 0;
    const reserved = item.reserved || 0;
    const available = item.available || 0;
    if (stock <= reserved) return 'out-of-stock';
    if (available < 10) return 'low';
    return 'in-stock';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'in-stock': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', label: 'In Stock' },
      'low': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', label: 'Low Stock' },
      'out-of-stock': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', label: 'Out of Stock' }
    };
    return badges[status] || badges['in-stock'];
  };

  const tableHeaders = [
    "Product Details",
    "Total Stock",
    "Reserved",
    "Available",
    "Warehouse",
    "Status",
    "Actions"
  ];

  if (loading && !inventory.length) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between animate-pulse">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-5 w-96 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="h-12 w-44 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-[2rem] animate-pulse"></div>)}
        </div>
        <div className="h-[600px] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="text-center py-24 border-none bg-white">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} className="text-red-400" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Inventory Sync Error</h3>
          <p className="text-gray-500 font-bold max-w-md mx-auto mb-10">{error}</p>
          <Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl">Retry Sync</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Inventory <span className="text-blue-600">Control</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            Real-time stock monitoring and distribution management
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary" className="h-14 px-8 rounded-2xl flex items-center gap-3 bg-white border-gray-200 shadow-sm">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <Card className="flex items-center gap-5 border-none bg-white hover:shadow-xl transition-all duration-300">
          <div className="p-5 bg-blue-50 rounded-[1.5rem]">
            <Package size={32} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Total SKUs</p>
            <p className="text-3xl font-black text-gray-900">{stats?.totalProducts || inventory.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-5 border-none bg-white hover:shadow-xl transition-all duration-300">
          <div className="p-5 bg-yellow-50 rounded-[1.5rem]">
            <AlertTriangle size={32} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-yellow-500 mb-1">Low Stock</p>
            <p className="text-3xl font-black text-gray-900">{stats?.lowStockCount || lowStockItems.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-5 border-none bg-white hover:shadow-xl transition-all duration-300">
          <div className="p-5 bg-green-50 rounded-[1.5rem]">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-green-500 mb-1">Healthy Stock</p>
            <p className="text-3xl font-black text-gray-900">{stats?.inStockCount || inventory.filter(i => getStockStatus(i) === 'in-stock').length}</p>
          </div>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-10 p-6 bg-yellow-50/50 border-2 border-dashed border-yellow-200 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-xl">
              <AlertTriangle size={20} className="text-yellow-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Critical Stock Alerts</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {lowStockItems.slice(0, 8).map((item) => (
              <span key={item._id} className="px-4 py-2 bg-white border border-yellow-100 text-yellow-700 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                {item.product?.name || 'Unknown'}: <span className="text-yellow-900">{item.available} units</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Card className="border-none bg-white shadow-sm overflow-hidden rounded-[2.5rem]">
        <Table headers={tableHeaders}>
          {inventory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={40} className="text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900">No Inventory Items</h3>
                <p className="text-gray-500 font-bold">Your stock will appear here once products are added.</p>
              </TableCell>
            </TableRow>
          ) : (
            inventory.map((item) => {
              const status = getStockStatus(item);
              const badge = getStatusBadge(status);
              return (
                <TableRow key={item._id} className="group transition-colors hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-white transition-colors">
                        {item.product?.images?.[0] ? (
                          <img src={item.product.images[0]} alt="" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <Package size={24} className="text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 truncate leading-tight">{item.product?.name || 'Unknown Product'}</p>
                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">{item.product?.sku || 'SKU N/A'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-lg font-black text-gray-900">{(item.stock || 0).toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-gray-500">{(item.reserved || 0).toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${item.available < 10 ? 'text-red-600' : 'text-blue-600'}`}>
                        {(item.available || 0).toLocaleString()}
                      </span>
                      {item.available < 10 && <TrendingUp size={14} className="text-red-400 rotate-180" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600 font-bold">
                      <Warehouse size={16} className="text-gray-400" />
                      <span className="truncate max-w-[150px]">
                        {typeof item.warehouse === 'object' 
                          ? (item.warehouse?.name || item.warehouse?.city || 'N/A')
                          : (item.warehouse || 'N/A')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleEditStock(item)}
                      className="h-10 px-4 rounded-xl flex items-center gap-2 ml-auto group/btn bg-white hover:bg-blue-600 hover:text-white transition-all border-gray-200"
                    >
                      <Edit3 size={14} className="group-hover/btn:scale-110 transition-transform" />
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </Table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        title="Update Stock Levels"
        size="lg"
      >
        {selectedItem && (
          <form onSubmit={handleUpdateStock} className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Package size={32} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-black text-gray-900 leading-tight">{selectedItem.product?.name}</p>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">SKU: {selectedItem.product?.sku || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-black text-gray-900">{selectedItem.stock}</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Reserved</p>
                <p className="text-2xl font-black text-gray-900">{selectedItem.reserved}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1">Available</p>
                <p className="text-2xl font-black text-blue-600">{selectedItem.available}</p>
              </div>
            </div>

            <Input
              label="New Available Quantity"
              type="number"
              min="0"
              value={stockToUpdate.quantity}
              onChange={(e) => setStockToUpdate({ quantity: parseInt(e.target.value) || 0 })}
              required
              disabled={isSubmitting}
              placeholder="Enter new stock count..."
              helperText="This will update the available quantity in real-time across all channels."
            />

            <div className="flex gap-4 pt-8 border-t border-gray-100 mt-8">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 h-14 rounded-2xl font-black border-2 border-gray-100 hover:bg-gray-50 transition-all"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                loading={isSubmitting}
                className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                Confirm Update
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;