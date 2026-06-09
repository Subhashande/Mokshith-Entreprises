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

const ricePulsesProducts = [
  {
    name: "Fortune Everyday Basmati Rice",
    description: "Fortune Everyday Basmati Rice is a fine variety of Basmati that you can enjoy every day.",
    price: 495,
    oldPrice: 550,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Fortune")],
    stock: 100,
    deliveryTime: "8 MINS"
  },
  {
    name: "Daawat Rozana Gold Basmati Rice",
    description: "Daawat Rozana Gold is the finest Basmati Rice in the mid-price segment.",
    price: 375,
    oldPrice: 420,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Daawat")],
    stock: 150,
    deliveryTime: "8 MINS"
  },
  {
    name: "Tata Sampann Toor Dal",
    description: "Tata Sampann Toor Dal is unpolished and naturally grown.",
    price: 185,
    oldPrice: 210,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Tata Sampann")],
    stock: 300,
    deliveryTime: "8 MINS"
  },
  {
    name: "Organic Tattva Moong Dal",
    description: "Organic Tattva Moong Dal is grown without pesticides.",
    price: 195,
    oldPrice: 225,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Organic Tattva")],
    stock: 250,
    deliveryTime: "8 MINS"
  },
  {
    name: "Catch Kabuli Chana",
    description: "Premium quality white chickpeas.",
    price: 165,
    oldPrice: 190,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Catch")],
    stock: 180,
    deliveryTime: "8 MINS"
  },
  {
    name: "India Gate Super Basmati Rice",
    description: "India Gate Super Basmati Rice is premium aged rice.",
    price: 650,
    oldPrice: 720,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("India Gate")],
    stock: 100,
    deliveryTime: "8 MINS"
  },
  {
    name: "Fortune Biryani Special Basmati",
    description: "Extra long grains for perfect biryani.",
    price: 580,
    oldPrice: 650,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Fortune")],
    stock: 120,
    deliveryTime: "8 MINS"
  },
  {
    name: "Organic Tattva Chana Dal",
    description: "Pure organic Chana Dal.",
    price: 125,
    oldPrice: 145,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Organic Tattva")],
    stock: 300,
    deliveryTime: "8 MINS"
  },
  {
    name: "Tata Sampann Masoor Dal",
    description: "High protein masoor dal.",
    price: 140,
    oldPrice: 165,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Tata Sampann")],
    stock: 200,
    deliveryTime: "8 MINS"
  },
  {
    name: "Fortune Sona Masoori Rice",
    description: "Lightweight and aromatic sona masoori rice.",
    price: 320,
    oldPrice: 380,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Fortune")],
    stock: 400,
    deliveryTime: "8 MINS"
  },
  {
    name: "24 Mantra Organic Urad Dal",
    description: "Split black gram organic.",
    price: 190,
    oldPrice: 220,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("24 Mantra")],
    stock: 150,
    deliveryTime: "8 MINS"
  },
  {
    name: "Organic Tattva Rajma Sharmili",
    description: "Small red kidney beans.",
    price: 240,
    oldPrice: 280,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Organic Tattva")],
    stock: 180,
    deliveryTime: "8 MINS"
  }
];

const seedRicePulses = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let category = await Category.findOne({ name: "Rice & Pulses" });
    if (!category) {
      category = await Category.create({ name: "Rice & Pulses", slug: "rice-pulses" });
    }

    const productsToInsert = ricePulsesProducts.map(p => {
      const imageUrl = p.images && p.images[0] ? p.images[0] : null;
      return {
        ...p,
        categoryId: category._id,
        image: imageUrl,
        imageUrl: imageUrl,
        isActive: true
      };
    });

    await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${productsToInsert.length} products.`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

seedRicePulses();
