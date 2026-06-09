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
    description: "Fortune Everyday Basmati Rice is a fine variety of Basmati that you can enjoy every day. It has a sweet taste and rich aroma.",
    price: 495,
    oldPrice: 550,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Fortune")],
    stock: 100
  },
  {
    name: "Daawat Rozana Gold Basmati Rice",
    description: "Daawat Rozana Gold is the finest Basmati Rice in the mid-price segment. It is specially processed for daily consumption.",
    price: 375,
    oldPrice: 420,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Daawat")],
    stock: 150
  },
  {
    name: "India Gate Basmati Rice Mogra",
    description: "India Gate Basmati Rice Mogra is a budget-friendly basmati rice for everyday use.",
    price: 325,
    oldPrice: 380,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("India Gate")],
    stock: 200
  },
  {
    name: "Tata Sampann Unpolished Toor Dal",
    description: "Tata Sampann Toor Dal is unpolished and does not undergo any artificial polishing with water, oil or leather.",
    price: 185,
    oldPrice: 210,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Tata Sampann")],
    stock: 300
  },
  {
    name: "Organic Tattva Moong Dal Split",
    description: "Organic Tattva Moong Dal is grown without the use of chemical pesticides and fertilizers.",
    price: 195,
    oldPrice: 225,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Organic Tattva")],
    stock: 250
  },
  {
    name: "24 Mantra Organic Chana Dal",
    description: "24 Mantra Organic Chana Dal is unpolished and chemical-free, keeping its natural nutrients intact.",
    price: 110,
    oldPrice: 130,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("24 Mantra")],
    stock: 400
  },
  {
    name: "Catch Kabuli Chana",
    description: "Catch Kabuli Chana is premium quality white chickpeas, sorted and cleaned.",
    price: 165,
    oldPrice: 190,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Catch")],
    stock: 180
  },
  {
    name: "Tata Sampann Urad Dal Split",
    description: "Premium quality split Urad Dal, unpolished and naturally grown.",
    price: 175,
    oldPrice: 200,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Tata Sampann")],
    stock: 220
  },
  {
    name: "Organic Tattva Rajma Chitra",
    description: "Rajma Chitra is premium kidney beans, rich in protein and delicious in taste.",
    price: 210,
    oldPrice: 240,
    unit: "1 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Organic Tattva")],
    stock: 150
  },
  {
    name: "Fortune Kolam Rice",
    description: "Fortune Kolam Rice is a short-grain variety that is soft and easy to digest.",
    price: 345,
    oldPrice: 390,
    unit: "5 kg",
    moq: 1,
    categoryName: "Rice & Pulses",
    images: [getLocalImage("Fortune")],
    stock: 300
  }
];

const seedRicePulses = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Ensure category exists
    let category = await Category.findOne({ name: "Rice & Pulses" });
    if (!category) {
      category = await Category.create({ name: "Rice & Pulses", slug: "rice-pulses" });
      console.log('Created category: Rice & Pulses');
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
    console.log(`Successfully seeded ${productsToInsert.length} products into Rice & Pulses.`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding Rice & Pulses:', err);
    process.exit(1);
  }
};

seedRicePulses();
