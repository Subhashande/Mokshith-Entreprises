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

const additionalProducts = [
  {
    name: "Fortune Sunlite Refined Sunflower Oil",
    description: "Fortune Sunlite Refined Sunflower Oil is a healthy and nutritious oil. It is rich in vitamins and low in saturated fats.",
    price: 145,
    oldPrice: 160,
    unit: "1 L",
    moq: 1,
    categoryName: "Edible Oils",
    images: [getLocalImage("Fortune")],
    stock: 200
  },
  {
    name: "Dhara Kachchi Ghani Mustard Oil",
    description: "Dhara Kachchi Ghani Mustard Oil is a strong and pungent oil that is perfect for traditional Indian cooking.",
    price: 175,
    oldPrice: 195,
    unit: "1 L",
    moq: 1,
    categoryName: "Edible Oils",
    images: [getLocalImage("Dhara")],
    stock: 150
  },
  {
    name: "Everest Turmeric Powder",
    description: "Everest Turmeric Powder is made from premium quality turmeric roots, ground to perfection.",
    price: 55,
    oldPrice: 65,
    unit: "200 g",
    moq: 1,
    categoryName: "Spices",
    images: [getLocalImage("Everest")],
    stock: 500
  },
  {
    name: "MDH Deggi Mirch",
    description: "MDH Deggi Mirch is a unique blend of roasted red chilies that adds a vibrant color and mild heat to your dishes.",
    price: 85,
    oldPrice: 95,
    unit: "100 g",
    moq: 1,
    categoryName: "Spices",
    images: [getLocalImage("MDH")],
    stock: 400
  }
];

const seedAdditional = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const p of additionalProducts) {
      let category = await Category.findOne({ name: p.categoryName });
      if (!category) {
        category = await Category.create({ name: p.categoryName, slug: p.categoryName.toLowerCase().replace(/ /g, '-') });
        console.log(`Created category: ${p.categoryName}`);
      }
      
      const imageUrl = p.images && p.images[0] ? p.images[0] : null;
      
      await Product.create({
        ...p,
        categoryId: category._id,
        image: imageUrl,
        imageUrl: imageUrl,
        isActive: true
      });
      console.log(`Seeded product: ${p.name}`);
    }

    console.log('Successfully seeded additional products.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding additional products:', err);
    process.exit(1);
  }
};

seedAdditional();
