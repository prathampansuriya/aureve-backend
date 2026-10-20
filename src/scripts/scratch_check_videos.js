import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { Product } from '../models/Product.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const products = await Product.find({ 'videos.0': { $exists: true } }).select('title sku videos images').lean();
  console.log(`\nFound ${products.length} products with videos:`);
  products.forEach(p => {
    console.log(`\nProduct: ${p.title} (${p._id}) - SKU: ${p.sku}`);
    p.videos?.forEach((v, i) => {
      console.log(`  [Video ${i}] type=${v.videoType} aspectRatio=${v.aspectRatio} duration=${v.durationSeconds}`);
      console.log(`    url=${v.url}`);
      console.log(`    thumbnail=${v.thumbnail}`);
    });
  });

  await mongoose.disconnect();
}

main().catch(console.error);
