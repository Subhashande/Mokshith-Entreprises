import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { hashPassword } from './src/utils/hashPassword.js';
import User from './src/modules/user/user.model.js';
import Category from './src/modules/category/category.model.js';
import Product from './src/modules/product/product.model.js';
import Company from './src/modules/company/company.model.js';
import Vendor from './src/modules/vendor/vendor.model.js';
import { ROLES } from './src/constants/roles.js';
import { USER_STATUS } from './src/constants/userStatus.js';

dotenv.config();

const seed = async () => {
  try {
    console.log('🌱 Seeding database...');
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clear existing data (optional, but good for fresh start)
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Company.deleteMany({});
    await Vendor.deleteMany({});

    // 1. Create Super Admin
    const adminPassword = await hashPassword('admin123');
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@mokshith.com',
      mobile: '9876543210',
      password: adminPassword,
      role: ROLES.SUPER_ADMIN,
      status: USER_STATUS.ACTIVE,
      isVerified: true
    });
    console.log('✅ Super Admin created');

    // 2. Create Company
    const company = await Company.create({
      name: 'Mokshith Enterprises Ltd',
      email: 'corp@mokshith.com',
      phone: '080-12345678',
      address: 'Industrial Area, Bangalore',
      createdBy: admin._id
    });
    console.log('✅ Company created');

    // 3. Create Vendor
    const vendorUser = await User.create({
      name: 'Apex Vendor',
      email: 'vendor@apex.com',
      mobile: '9988776655',
      password: adminPassword,
      role: ROLES.VENDOR,
      status: USER_STATUS.ACTIVE,
      companyId: company._id,
      isVerified: true
    });
    
    const vendor = await Vendor.create({
      name: 'Apex Industrial Supplies',
      email: 'supplies@apex.com',
      phone: '080-88776655',
      address: 'Peenya Industrial Estate',
      companyId: company._id,
      status: 'APPROVED'
    });
    console.log('✅ Vendor created');

    // 4. Create Categories
    const catHardware = await Category.create({ name: 'Hardware' });
    const catElectrical = await Category.create({ name: 'Electrical' });
    const catMachinery = await Category.create({ name: 'Machinery' });
    console.log('✅ Categories created');

    // 5. Create Products
    await Product.create([
      {
        name: 'Industrial Steel Bolts - M12',
        description: 'High-grade stainless steel bolts for heavy construction.',
        price: 450,
        stock: 500,
        categoryId: catHardware._id,
        vendorId: vendor._id,
        companyId: company._id,
        moq: 10,
        isActive: true
      },
      {
        name: 'Copper Wiring - 100m Roll',
        description: 'Premium quality 2.5mm copper wiring for industrial use.',
        price: 12500,
        stock: 85,
        categoryId: catElectrical._id,
        vendorId: vendor._id,
        companyId: company._id,
        moq: 5,
        isActive: true
      },
      {
        name: 'Hydraulic Jack - 5 Ton',
        description: 'Heavy-duty hydraulic jack with safety bypass valve.',
        price: 3200,
        stock: 120,
        categoryId: catMachinery._id,
        vendorId: vendor._id,
        companyId: company._id,
        moq: 1,
        isActive: true
      }
    ]);
    console.log('✅ Products created');

    console.log('🏁 Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
