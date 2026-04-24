import React, { useState } from 'react';
import { useWarehouse } from '../hooks/useWarehouse';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { 
  Warehouse, 
  MapPin, 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Activity,
  Box
} from 'lucide-react';

const WarehouseCard = ({ warehouse, onEdit, onDelete }) => {
  const loadPercentage = (warehouse.currentLoad / warehouse.capacity) * 100;
  const isFull = loadPercentage >= 90;
  const isModerate = loadPercentage >= 60 && loadPercentage < 90;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-blue-100 rounded-xl">
          <Warehouse size={24} className="text-blue-600" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(warehouse)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Edit3 size={16} />
          </button>
          <button onClick={() => onDelete(warehouse._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">{warehouse.name}</h3>
      <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <MapPin size={14} />
        <span>{warehouse.location}</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Current Load</span>
            <span className={`font-bold ${isFull ? 'text-red-600' : isModerate ? 'text-yellow-600' : 'text-green-600'}`}>
              {Math.round(loadPercentage)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : isModerate ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${loadPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Layers size={12} /> Capacity
            </p>
            <p className="font-bold text-gray-900">{warehouse.capacity} units</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Box size={12} /> Available
            </p>
            <p className="font-bold text-gray-900">{warehouse.capacity - warehouse.currentLoad} units</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

const WarehousePage = () => {
  const { warehouses: rawWarehouses, loading, error, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouse();
  const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', capacity: 0 });

  const handleOpenModal = (warehouse = null) => {
    if (warehouse) {
      setSelectedWarehouse(warehouse);
      setFormData({ name: warehouse.name, location: warehouse.location, capacity: warehouse.capacity });
    } else {
      setSelectedWarehouse(null);
      setFormData({ name: '', location: '', capacity: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await updateWarehouse(selectedWarehouse._id, formData);
      } else {
        await createWarehouse(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save warehouse:", err);
    }
  };

  if (loading && !warehouses.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-gray-500 mt-1">Manage storage locations and inventory distribution</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} />
          Add Warehouse
        </Button>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
            <Warehouse size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No warehouses found</h3>
            <p className="text-gray-500 mb-6">Start by adding your first storage location.</p>
            <Button onClick={() => handleOpenModal()} variant="secondary">
              Add First Warehouse
            </Button>
          </Card>
        ) : (
          warehouses.map((warehouse) => (
            <WarehouseCard 
              key={warehouse._id} 
              warehouse={warehouse} 
              onEdit={handleOpenModal}
              onDelete={deleteWarehouse}
            />
          ))
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Central Distribution Center"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Mumbai, Maharashtra"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Units)</label>
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedWarehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WarehousePage;