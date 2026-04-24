import React, { useState } from 'react';
import { useCompany } from '../hooks/useCompany';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Building2, MapPin, Phone, Mail, FileText, Save, Edit3 } from 'lucide-react';

const CompanyPage = () => {
  const { company, loading, error, updateSuccess, updateCompany } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setFormData(company);
    setIsEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCompany(formData);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update company:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setFormData(null);
  };

  if (loading && !company) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load company</h3>
          <p className="text-gray-500">{error}</p>
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No company found</h3>
          <p className="text-gray-500">Please contact support to set up your company profile.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-500 mt-1">Manage your company information</p>
        </div>
        <Button onClick={handleEdit} className="flex items-center gap-2">
          <Edit3 size={16} />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building2 size={32} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
              <p className="text-gray-500 text-sm mt-1">Company ID: {company._id}</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <FileText size={18} className="text-gray-400" />
                  <span>GST: {company.gstNumber || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail size={18} className="text-gray-400" />
                  <span>{company.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone size={18} className="text-gray-400" />
                  <span>{company.phone || 'No phone'}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <MapPin size={32} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Address</h3>
              <div className="space-y-2 text-gray-600">
                <p>{company.address?.street || 'No street address'}</p>
                <p>{company.address?.city ? `${company.address.city}, ` : ''}{company.address?.state || ''}</p>
                <p>{company.address?.pincode || ''}</p>
                <p className="text-gray-500">{company.address?.country || 'India'}</p>
              </div>
            </div>
          </div>
        </Card>

        {company.bankDetails && (
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{company.bankDetails.bankName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-medium text-gray-900">{company.bankDetails.accountNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IFSC Code</p>
                <p className="font-medium text-gray-900">{company.bankDetails.ifscCode || 'N/A'}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Modal isOpen={isEditing} onClose={handleClose} title="Edit Company Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                name="name"
                value={formData?.name || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                name="gstNumber"
                value={formData?.gstNumber || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData?.email || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData?.phone || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                name="street"
                value={formData?.address?.street || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData?.address?.city || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData?.address?.state || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData?.address?.pincode || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, pincode: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center gap-2">
              {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CompanyPage;