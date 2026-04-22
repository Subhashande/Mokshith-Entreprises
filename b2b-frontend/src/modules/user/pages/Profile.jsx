import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { userService } from '../userService';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { User, Mail, Phone, Building2, MapPin, Edit2, X } from 'lucide-react';

const Profile = () => {
  const { user, updateUserInfo } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    companyName: user?.companyName || '',
    address: user?.address || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await userService.updateProfile(formData);
      updateUserInfo(updatedUser);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 border border-gray-100 transition-all hover:shadow-sm">
      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-gray-900 font-medium">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account details and preferences</p>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)} 
            className="flex items-center space-x-2 px-6 py-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Edit2 size={18} />
            <span>Edit Profile</span>
          </Button>
        ) : (
          <Button 
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              setFormData({
                name: user?.name || '',
                email: user?.email || '',
                phone: user?.phone || '',
                companyName: user?.companyName || '',
                address: user?.address || '',
              });
            }} 
            className="flex items-center space-x-2 px-6 py-2"
          >
            <X size={18} />
            <span>Cancel</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center p-8">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-md"></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{user?.role?.replace('_', ' ')}</p>
            <div className="pt-4 border-t border-gray-100">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active Account
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Details or Form */}
        <div className="md:col-span-2">
          <Card className="p-2 overflow-hidden">
            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                <DetailItem icon={User} label="Full Name" value={formData.name} />
                <DetailItem icon={Mail} label="Email Address" value={formData.email} />
                <DetailItem icon={Phone} label="Phone Number" value={formData.phone} />
                <DetailItem icon={Building2} label="Company Name" value={formData.companyName} />
                <div className="sm:col-span-2">
                  <DetailItem icon={MapPin} label="Address" value={formData.address} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    label="Email Address (Locked)"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50 opacity-70"
                  />
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    label="Company Name"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="4"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                      placeholder="Enter your complete address..."
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button 
                    type="submit" 
                    loading={loading} 
                    className="px-8 py-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
