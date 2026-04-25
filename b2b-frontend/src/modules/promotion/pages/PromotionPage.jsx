import React, { useState } from 'react';
import { usePromotion } from '../hooks/usePromotion';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Table, { TableRow, TableCell } from '../../../components/ui/Table';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { 
  Tag, 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Percent,
  Clock,
  Zap,
  Ticket,
  AlertCircle,
  X
} from 'lucide-react';

const PromotionPage = () => {
  const { promotions: rawPromotions, loading, error, createPromotion, updatePromotion, deletePromotion, toggleStatus } = usePromotion();
  const promotions = Array.isArray(rawPromotions) ? rawPromotions : [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    value: 0,
    maxDiscount: '',
    expiresAt: '',
    isActive: true
  });

  const handleOpenModal = (promo = null) => {
    setLocalError(null);
    if (promo) {
      setSelectedPromo(promo);
      setFormData({
        code: promo.code,
        discountType: promo.discountType || 'PERCENTAGE',
        value: promo.value || 0,
        maxDiscount: promo.maxDiscount || '',
        expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().split('T')[0] : '',
        isActive: promo.isActive ?? true
      });
    } else {
      setSelectedPromo(null);
      setFormData({ code: '', discountType: 'PERCENTAGE', value: 0, maxDiscount: '', expiresAt: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      setIsSubmitting(true);
      if (selectedPromo) {
        await updatePromotion(selectedPromo._id, formData);
      } else {
        await createPromotion(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      setLocalError(err.message || "Failed to save promotion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePromotion(deleteId);
      setDeleteId(null);
    } catch (err) {
      console.error("Failed to delete promotion:", err);
    }
  };

  const tableHeaders = [
    "Promotion Code",
    "Discount Offer",
    "Expiry Timeline",
    "Current Status",
    "Actions"
  ];

  if (loading && !promotions.length) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between animate-pulse">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-5 w-96 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="h-12 w-44 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="h-[600px] bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Marketing <span className="text-blue-600">Growth</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            <Zap size={18} className="text-blue-400" />
            Launch and manage high-converting promotional campaigns
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="shadow-xl shadow-blue-200 h-14 px-8 text-lg rounded-2xl flex items-center gap-3">
          <Plus size={24} strokeWidth={3} />
          New Promotion
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

      <Card className="border-none bg-white shadow-sm overflow-hidden rounded-[2.5rem]">
        <Table headers={tableHeaders}>
          {promotions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-32 text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Ticket size={48} className="text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Promotions</h3>
                <p className="text-gray-500 font-bold max-w-md mx-auto mb-10">
                  Ready to boost sales? Create your first discount code to start rewarding your customers.
                </p>
                <Button onClick={() => handleOpenModal()} variant="secondary" className="h-12 px-8 rounded-xl">
                  Get Started
                </Button>
              </TableCell>
            </TableRow>
          ) : (
            promotions.map((promo) => (
              <TableRow key={promo._id} className="group transition-colors hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-all duration-300">
                      <Tag size={24} className="text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <span className="font-black text-gray-900 text-lg tracking-widest block uppercase">{promo.code}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5 block">Promo Code</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-black text-2xl text-green-600">
                      <span>{promo.value}</span>
                      {promo.discountType === 'PERCENTAGE' ? (
                        <Percent size={20} strokeWidth={3} />
                      ) : (
                        <span className="text-lg ml-1">₹</span>
                      )}
                      <span className="text-sm uppercase tracking-widest ml-1">Off</span>
                    </div>
                    {promo.maxDiscount && (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Up to ₹{promo.maxDiscount}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-black text-gray-700">
                      <Calendar size={16} className="text-blue-400" />
                      <span>{promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Lifetime'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Clock size={12} />
                      <span>{promo.expiresAt && new Date(promo.expiresAt) < new Date() ? 'Campaign Expired' : 'Active Timeline'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <button 
                    onClick={() => toggleStatus(promo._id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                      promo.isActive 
                        ? 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' 
                        : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                    }`}
                  >
                    {promo.isActive ? (
                      <><CheckCircle size={14} strokeWidth={3} /> Active</>
                    ) : (
                      <><XCircle size={14} strokeWidth={3} /> Inactive</>
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      onClick={() => handleOpenModal(promo)} 
                      className="p-3 hover:bg-blue-50 rounded-2xl text-gray-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                      title="Edit Campaign"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(promo._id)} 
                      className="p-3 hover:bg-red-50 rounded-2xl text-gray-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                      title="Terminate Campaign"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={selectedPromo ? "Edit Campaign" : "New Campaign"}
        size="lg"
        preventClose={isSubmitting}
        footer={
          <div className="flex gap-4 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)} 
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              loading={isSubmitting}
              className="flex-1 sm:flex-none shadow-lg shadow-blue-200"
            >
              {selectedPromo ? "Update Campaign" : "Launch Campaign"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input 
              label="Campaign Code" 
              placeholder="E.g. SUMMER50" 
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              helperText="Alphanumeric code customers enter at checkout"
            />
            <Input 
              label="Discount Value (%)" 
              type="number" 
              min="0" 
              max="100"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) })}
              required
              helperText="Percentage reduction on order total"
            />
          </div>
          <Input 
            label="Expiry Date" 
            type="date" 
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            required
            helperText="When this promotion should automatically end"
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default PromotionPage;