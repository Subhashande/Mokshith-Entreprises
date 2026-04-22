import React, { useState } from 'react';
import { userService } from '../userService';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Shield, Lock, LogOut, AlertTriangle, Key } from 'lucide-react';

const Security = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      alert('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      alert(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-gray-500 mt-1">Manage your password and account security</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Security Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield size={24} />
              </div>
              <h2 className="text-xl font-bold">Security Tips</h2>
            </div>
            <ul className="space-y-4 text-blue-100 text-sm">
              <li className="flex items-start space-x-2">
                <div className="mt-1 w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0"></div>
                <span>Use a strong password with at least 8 characters.</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="mt-1 w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0"></div>
                <span>Include numbers, symbols, and uppercase letters.</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="mt-1 w-1.5 h-1.5 bg-blue-300 rounded-full flex-shrink-0"></div>
                <span>Avoid using the same password across multiple sites.</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 border-red-100 bg-red-50">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertTriangle size={20} />
              <h3 className="font-bold">Danger Zone</h3>
            </div>
            <p className="text-xs text-red-700 mb-4">
              Logging out from all devices will terminate every active session. You'll need to sign back in everywhere.
            </p>
            <Button 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 bg-white"
              onClick={() => alert('Logout from all devices functionality coming soon!')}
            >
              Logout from All Devices
            </Button>
          </Card>
        </div>

        {/* Right: Change Password Form */}
        <div className="md:col-span-2">
          <Card className="p-0 overflow-hidden shadow-lg border-gray-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-800">
                <Lock size={18} className="text-blue-500" />
                <h3 className="font-bold">Update Password</h3>
              </div>
              <Key size={18} className="text-gray-300" />
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <Input
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  className="focus:ring-2 focus:ring-blue-500"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500 max-w-[250px]">
                  After updating, you may be required to log in again on other devices.
                </p>
                <Button 
                  type="submit" 
                  loading={loading} 
                  className="px-8 py-3 shadow-md hover:shadow-lg transition-all"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Security;
