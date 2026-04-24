import React, { useState } from 'react';
import { usePromotion } from '../hooks/usePromotion';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { 
  Tag, 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Percent,
  Clock
} from 'lucide-react';

const PromotionPage = () => {
  const { promotions: rawPromotions, loading, error, createPromotion, updatePromotion, deletePromotion } = usePromotion();
  const promotions = Array.isArray(rawPromotions) ? rawPromotions : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount: 0,
    expiryDate: '',
    status: 'ACTIVE'
  });

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setSelectedPromo(promo);
      setFormData({
        code: promo.code,
        discount: promo.discount,
        expiryDate: promo.expiryDate ? new Date(promo.expiryDate).toISOString().split('T')[0] : '',
        status: promo.status
      });
    } else {
      setSelectedPromo(null);
      setFormData({ code: '', discount: 0, expiryDate: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedPromo) {
        await updatePromotion(selectedPromo._id, formData);
      } else {
        await createPromotion(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save promotion:", err);
    }
  };

  if (loading && !promotions.length) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions & Coupons</h1>
          <p className="text-gray-500 mt-1">Create and manage marketing offers and discount codes</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} />
          New Promotion
        </Button>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-600">Promo Code</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-600">Discount</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-600">Expiry Date</th>
                <th className="text-left py-4 px-6 text-sm font-bold text-gray-600">Status</th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Tag size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No active promotions</p>
                    <p className="text-sm">Create your first discount code to start saving your customers money.</p>
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Tag size={18} className="text-blue-600" />
                        </div>
                        <span className="font-bold text-gray-900 tracking-wider">{promo.code}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 font-bold text-green-600">
                        <Percent size={16} />
                        <span>{promo.discount}% Off</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{promo.expiryDate ? new Date(promo.expiryDate).toLocaleDateString() : 'No Expiry'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => toggleStatus(promo._id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${
                          promo.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {promo.status === 'ACTIVE' ? (
                          <><CheckCircle size={14} /> Active</>
                        ) : (
                          <><XCircle size={14} /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(promo)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => deletePromotion(promo._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedPromo ? 'Edit Promotion' : 'Create New Promotion'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold tracking-widest"
              placeholder="e.g. SUMMER50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage (%)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Percent size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <div className="relative">
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedPromo ? 'Save Changes' : 'Create Promo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PromotionPage;