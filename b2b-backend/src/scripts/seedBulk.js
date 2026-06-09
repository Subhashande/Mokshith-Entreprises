import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Product from '../modules/product/product.model.js';
import Category from '../modules/category/category.model.js';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mokshith-b2b';

const getLocalImage = (name) => {
  const brand = name.split(' ')[0].toLowerCase();
  const availableBrands = ['fortune', 'dhara', 'tata', 'mdh', 'everest', 'india', 'daawat', 'organic', 'catch', '24'];
  
  if (brand === 'india') return '/uploads/products/india-gate.svg';
  if (brand === 'tata') return '/uploads/products/tata-sampann.svg';
  if (brand === 'organic') return '/uploads/products/organic-tattva.svg';
  if (brand === '24') return '/uploads/products/24-mantra.svg';
  
  if (availableBrands.includes(brand)) return `/uploads/products/${brand}.svg`;
  return '/uploads/products/wholesale.svg';
};

const bulkProducts = [
  // RICE & PULSES (10)
  { name: "India Gate Basmati Rice Feast", price: 420, oldPrice: 480, unit: "5 kg", categoryName: "Rice & Pulses", images: [getLocalImage("India Gate")] },
  { name: "Fortune Rozana Basmati Rice", price: 350, oldPrice: 400, unit: "5 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Fortune")] },
  { name: "Tata Sampann Moong Dal", price: 195, oldPrice: 220, unit: "1 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Tata Sampann")] },
  { name: "Organic Tattva Kabuli Chana", price: 175, oldPrice: 200, unit: "1 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Organic Tattva")] },
  { name: "Catch Black Pepper Whole", price: 120, oldPrice: 150, unit: "100 g", categoryName: "Spices", images: [getLocalImage("Catch")] },
  { name: "Daawat Super Basmati Rice", price: 750, oldPrice: 850, unit: "5 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Daawat")] },
  { name: "Fortune Biryani Classic Rice", price: 620, oldPrice: 700, unit: "5 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Fortune")] },
  { name: "Tata Sampann Chana Dal", price: 115, oldPrice: 130, unit: "1 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Tata Sampann")] },
  { name: "Organic Tattva Urad Dal", price: 180, oldPrice: 210, unit: "1 kg", categoryName: "Rice & Pulses", images: [getLocalImage("Organic Tattva")] },
  { name: "Catch Red Chilli Powder", price: 95, oldPrice: 110, unit: "200 g", categoryName: "Spices", images: [getLocalImage("Catch")] },
  
  // OILS (5)
  { name: "Fortune Rice Bran Oil", price: 155, oldPrice: 175, unit: "1 L", categoryName: "Edible Oils", images: [getLocalImage("Fortune")] },
  { name: "Dhara Sunflower Oil", price: 140, oldPrice: 160, unit: "1 L", categoryName: "Edible Oils", images: [getLocalImage("Dhara")] },
  { name: "Saffola Gold Blended Oil", price: 185, oldPrice: 210, unit: "1 L", categoryName: "Edible Oils", images: [getLocalImage("Saffola")] },
  { name: "Gemini Soyabean Oil", price: 135, oldPrice: 155, unit: "1 L", categoryName: "Edible Oils", images: [getLocalImage("Gemini")] },
  { name: "Dalda Vanaspati", price: 120, oldPrice: 140, unit: "1 L", categoryName: "Edible Oils", images: [getLocalImage("Dalda")] }
];

const seedBulk = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const p of bulkProducts) {
      let category = await Category.findOne({ name: p.categoryName });
      if (!category) {
        category = await Category.create({ name: p.categoryName, slug: p.categoryName.toLowerCase().replace(/ /g, '-') });
      }
      
      const imageUrl = p.images && p.images[0] ? p.images[0] : null;
      
      await Product.create({
        ...p,
        description: `${p.name} - Premium quality for your business.`,
        categoryId: category._id,
        image: imageUrl,
        imageUrl: imageUrl,
        isActive: true,
        stock: 500,
        moq: 1
      });
      console.log(`Seeded: ${p.name}`);
    }

    console.log('Successfully seeded bulk products.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

seedBulk();
