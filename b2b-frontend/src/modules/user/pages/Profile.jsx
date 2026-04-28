import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../auth/hooks/useAuth';
import { userService } from '../userService';
import { profileSchema } from '../../../validations/schemas';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { User, Mail, Phone, Building2, MapPin, Edit2, X, Camera, Loader2 } from 'lucide-react';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, updateUserInfo } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || user?.mobile || '',
      companyName: user?.companyName || '',
      gstNumber: user?.gstNumber || '',
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const response = await userService.updateProfileImage(formData);
      updateUserInfo(response);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        phone: user.phone || user?.mobile || '',
        companyName: user.companyName || '',
        gstNumber: user.gstNumber || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    try {
      const updatedUser = await userService.updateProfile(data);
      updateUserInfo(updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    reset({
      name: user?.name || '',
      phone: user?.phone || user?.mobile || '',
      companyName: user?.companyName || '',
      gstNumber: user?.gstNumber || '',
    });
  };

  const DetailItem = ({ icon: Icon, label, value }) => (
    <div className={styles.detailItem}>
      <div className={styles.detailIcon}>
        <Icon size={20} />
      </div>
      <div className={styles.detailContent}>
        <p className={styles.detailLabel}>{label}</p>
        <p className={value ? styles.detailValue : styles.detailValueEmpty}>
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>My Profile</h1>
          <p className={styles.headerSubtitle}>Manage your account details and preferences</p>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)} 
            className={styles.editButton}
          >
            <Edit2 size={18} />
            <span>Edit Profile</span>
          </Button>
        ) : (
          <Button 
            variant="secondary"
            onClick={handleCancel} 
            className={styles.editButton}
          >
            <X size={18} />
            <span>Cancel</span>
          </Button>
        )}
      </div>

      <div className={styles.grid}>
        {/* Left Column: Avatar & Quick Info */}
        <div>
          <Card className={styles.avatarCard}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatar}>
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.profileImage}`} 
                    alt="Profile" 
                    className={styles.avatarImage}
                  />
                ) : (
                  user?.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <label className={styles.uploadButton} aria-label="Upload profile picture">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                <input 
                  type="file" 
                  className={styles.uploadInput} 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={uploading} 
                  aria-label="Choose profile picture"
                />
              </label>
            </div>
            <h2 className={styles.userName}>{user?.name}</h2>
            <p className={styles.userRole}>{user?.role?.replace('_', ' ')}</p>
            <div className={styles.divider}>
              <span className={styles.badge}>
                Active Account
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column: Details or Form */}
        <div>
          <Card className={styles.detailsCard}>
            {!isEditing ? (
              <div className={styles.detailsGrid}>
                <DetailItem icon={User} label="Full Name" value={user?.name} />
                <DetailItem icon={Mail} label="Email Address" value={user?.email} />
                <DetailItem icon={Phone} label="Phone Number" value={user?.phone || user?.mobile} />
                <DetailItem icon={Building2} label="Company Name" value={user?.companyName} />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <div className={styles.formGrid}>
                  <div>
                    <Input
                      label="Full Name"
                      {...register('name')}
                      error={errors.name?.message}
                    />
                  </div>
                  <div>
                    <Input
                      label="Email Address"
                      value={user?.email}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Input
                      label="Phone Number"
                      {...register('phone')}
                      error={errors.phone?.message}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <Input
                      label="Company Name"
                      {...register('companyName')}
                      error={errors.companyName?.message}
                    />
                  </div>
                  <div className={styles.fullWidth}>
                    <Input
                      label="GST Number (Optional)"
                      {...register('gstNumber')}
                      error={errors.gstNumber?.message}
                      placeholder="15-digit GST number"
                    />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <Button 
                    type="submit" 
                    loading={isSubmitting}
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
