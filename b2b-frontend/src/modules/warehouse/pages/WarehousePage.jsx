import React, { useState } from 'react';
import { useWarehouse } from '../hooks/useWarehouse';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { 
  Warehouse, 
  MapPin, 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Activity,
  Box,
  LayoutGrid,
  Map,
  Truck,
  X,
  AlertCircle
} from 'lucide-react';

const WarehouseCard = ({ warehouse, onEdit, onDelete }) => {
  const currentLoad = warehouse.currentLoad || 0;
  const capacity = warehouse.capacity || 1;
  const loadPercentage = (currentLoad / capacity) * 100;
  const isFull = loadPercentage >= 90;
  const isModerate = loadPercentage >= 60 && loadPercentage < 90;

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-none bg-white group overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(warehouse)} 
            className="p-2 bg-white/90 backdrop-blur shadow-sm hover:bg-blue-50 rounded-xl text-blue-600 transition-all border border-blue-100"
            title="Edit Warehouse"
          >
            <Edit3 size={16} />
          </button>
          <button 
            onClick={() => onDelete(warehouse._id)} 
            className="p-2 bg-white/90 backdrop-blur shadow-sm hover:bg-red-50 rounded-xl text-red-500 transition-all border border-red-100"
            title="Delete Warehouse"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
          <Warehouse size={32} className="text-blue-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-black text-gray-900 truncate leading-tight">
            {typeof warehouse.name === 'object' ? (warehouse.name?.label || warehouse.name?.name || 'Unnamed') : (warehouse.name || 'Unnamed')}
          </h3>
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500 mt-0.5">
            <MapPin size={14} className="text-blue-400" />
            <span className="truncate">
              {typeof warehouse.location === 'object' 
                ? `${warehouse.location.city || ''}${warehouse.location.city && warehouse.location.state ? ', ' : ''}${warehouse.location.state || ''}`.trim() || 'Location N/A'
                : warehouse.location || 'Location N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Occupancy</p>
              <p className={`text-2xl font-black ${isFull ? 'text-red-600' : isModerate ? 'text-yellow-600' : 'text-green-600'}`}>
                {Math.round(loadPercentage)}%
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
              {currentLoad} / {capacity}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isFull ? 'bg-gradient-to-r from-red-500 to-orange-500' : 
                isModerate ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 
                'bg-gradient-to-r from-green-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(loadPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Layers size={10} /> Total Capacity
            </p>
            <p className="font-black text-gray-900 text-lg">{capacity.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-500">Units Total</p>
          </div>
          <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-50">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
              <Box size={10} /> Available
            </p>
            <p className="font-black text-blue-700 text-lg">{(capacity - currentLoad).toLocaleString()}</p>
            <p className="text-[10px] font-bold text-blue-500">Free Slots</p>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [localError, setLocalError] = useState(null);

  const handleOpenModal = (warehouse = null) => {
    setLocalError(null);
    if (warehouse) {
      setSelectedWarehouse(warehouse);
      const locationStr = typeof warehouse.location === 'object' 
        ? `${warehouse.location.address || ''}${warehouse.location.address ? ', ' : ''}${warehouse.location.city || ''}${warehouse.location.city ? ', ' : ''}${warehouse.location.state || ''}`.trim()
        : warehouse.location || '';
      setFormData({ name: warehouse.name, location: locationStr, capacity: warehouse.capacity });
    } else {
      setSelectedWarehouse(null);
      setFormData({ name: '', location: '', capacity: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      setIsSubmitting(true);
      const locationParts = formData.location.split(',').map(s => s.trim());
      const locationObj = {
        address: locationParts[0] || '',
        city: locationParts[1] || '',
        state: locationParts[2] || '',
        country: 'India'
      };

      const submissionData = {
        ...formData,
        location: locationObj
      };

      if (selectedWarehouse) {
        await updateWarehouse(selectedWarehouse._id, submissionData);
      } else {
        await createWarehouse(submissionData);
      }
      setIsModalOpen(false);
    } catch (err) {
      setLocalError(err.message || "Failed to save warehouse");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteWarehouse(deleteId);
      setDeleteId(null);
    } catch (err) {
      console.error("Failed to delete warehouse:", err);
    }
  };

  if (loading && !warehouses.length) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between animate-pulse">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-5 w-96 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="h-12 w-44 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Warehouse <span className="text-blue-600">Network</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            <Truck size={18} className="text-blue-400" />
            Manage storage locations and global inventory distribution
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="shadow-xl shadow-blue-200 h-14 px-8 text-lg rounded-2xl flex items-center gap-3">
          <Plus size={24} strokeWidth={3} />
          Add Warehouse
        </Button>
      </div>

      {(error || localError) && (
        <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-between gap-3 text-red-600 font-bold animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertCircle size={20} />
            </div>
            {error || localError}
          </div>
          <button onClick={() => setLocalError(null)} className="p-2 hover:bg-red-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {warehouses.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <Card className="text-center py-24 border-2 border-dashed border-gray-200 bg-white/50">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Warehouse size={48} className="text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">No Warehouses Found</h3>
              <p className="text-gray-500 font-bold max-w-md mx-auto mb-10">
                You haven't added any storage locations yet. Start building your distribution network today.
              </p>
              <Button onClick={() => handleOpenModal()} variant="secondary" className="h-14 px-10 rounded-2xl">
                Create First Warehouse
              </Button>
            </Card>
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <WarehouseCard 
              key={warehouse._id} 
              warehouse={warehouse} 
              onEdit={handleOpenModal}
              onDelete={setDeleteId}
            />
          ))
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        title={selectedWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
        size="lg"
        preventClose={isSubmitting}
        footer={
          <div className="flex gap-4 w-full sm:w-auto">
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)} 
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-2xl font-black border-2 border-gray-100 hover:bg-gray-50 transition-all"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              loading={isSubmitting}
              className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 text-white transition-all"
            >
              {selectedWarehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <Input
              label="Warehouse Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Central Distribution Center"
              required
              disabled={isSubmitting}
              helperText="Internal name for this storage facility"
            />
            
            <Input
              label="Location (Address, City, State)"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. 123 Industrial Area, Mumbai, Maharashtra"
              required
              disabled={isSubmitting}
              helperText="Format: Address, City, State"
            />

            <Input
              label="Total Capacity (Units)"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              required
              disabled={isSubmitting}
              helperText="Maximum number of product units this facility can hold"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? All inventory associated with it might be affected."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default WarehousePage;