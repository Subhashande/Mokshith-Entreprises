import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Product from '../modules/product/product.model.js';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mokshith-b2b';

// Map of keywords to realistic Unsplash packaging images
const IMAGE_MAPPING = {
  'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  'dal': 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&w=800&q=80',
  'pulses': 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&w=800&q=80',
  'oil': 'https://images.unsplash.com/photo-1474979266404-7eaacac88ad5?auto=format&fit=crop&w=800&q=80',
  'spices': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  'turmeric': 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&w=800&q=80',
  'mirch': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  'chana': 'https://images.unsplash.com/photo-1515543904379-3d757afe72e2?auto=format&fit=crop&w=800&q=80',
  'atta': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  'sugar': 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=800&q=80',
  'salt': 'https://images.unsplash.com/photo-1518110903478-24521763139c?auto=format&fit=crop&w=800&q=80',
  'tea': 'https://images.unsplash.com/photo-1544787210-221ca39f4007?auto=format&fit=crop&w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'
};

const updateImages = async () => {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!');

    const products = await Product.find({});
    console.log(`🔍 Found ${products.length} products to update.`);

    let updatedCount = 0;
    for (const product of products) {
      const name = product.name.toLowerCase();
      let selectedImage = IMAGE_MAPPING.default;

      // Match based on keywords
      for (const [keyword, url] of Object.entries(IMAGE_MAPPING)) {
        if (name.includes(keyword)) {
          selectedImage = url;
          break;
        }
      }

      await Product.findByIdAndUpdate(product._id, {
        image: selectedImage,
        imageUrl: selectedImage,
        images: [selectedImage]
      });
      
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`📦 Updated ${updatedCount}/${products.length} products...`);
      }
    }

    console.log('✨ Database update complete! All products now have realistic packaging images.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating database images:', err);
    process.exit(1);
  }
};

updateImages();
