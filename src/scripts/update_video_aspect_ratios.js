import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { Product } from '../models/Product.js';

const VIDEO_UPDATES = [
  // 16:9 Landscape - Product 360 & Artisanal Craft
  { sku: 'AV-RING-001', videoType: 'PRODUCT_360', aspectRatio: '16:9' },
  { sku: 'AV-KADA-001', videoType: 'CRAFTING_STORY', aspectRatio: '16:9' },
  { sku: 'AV-PEND-001', videoType: 'PRODUCT_360', aspectRatio: '16:9' },
  { sku: 'AV-MEN-001', videoType: 'PRODUCT_360', aspectRatio: '16:9' },
  { sku: 'AV-KADA-014', videoType: 'PRODUCT_360', aspectRatio: '16:9' },
  { sku: 'AV-MRING-017', videoType: 'PRODUCT_360', aspectRatio: '16:9' },

  // 9:16 Portrait - Model Showcase Reels
  { sku: 'AV-CHOK-001', videoType: 'MODEL_WEARING', aspectRatio: '9:16' },
  { sku: 'AV-EAR-001', videoType: 'MODEL_WEARING', aspectRatio: '9:16' },
  { sku: 'AV-HAAR-001', videoType: 'MODEL_WEARING', aspectRatio: '9:16' },
  { sku: 'AV-TIK-001', videoType: 'MODEL_WEARING', aspectRatio: '9:16' },
  { sku: 'AV-MANG-001', videoType: 'MODEL_WEARING', aspectRatio: '9:16' }
];

async function updateAspectRatios() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  for (const item of VIDEO_UPDATES) {
    const product = await Product.findOne({ sku: item.sku });
    if (!product) {
      console.log(`Product with SKU ${item.sku} not found.`);
      continue;
    }

    if (product.videos && product.videos.length > 0) {
      for (const v of product.videos) {
        v.aspectRatio = item.aspectRatio;
        v.videoType = item.videoType;
        // Ensure thumbnail is present, if not, use primary product image
        if (!v.thumbnail || v.thumbnail.includes('unsplash')) {
          const primaryImg = product.images?.find(i => i.isPrimary) || product.images?.[0];
          if (primaryImg?.url && !primaryImg.url.includes('unsplash')) {
            v.thumbnail = primaryImg.url;
          }
        }
      }
      product.markModified('videos');
      await product.save();
      console.log(`Updated ${product.sku} (${product.title}): type=${item.videoType}, ratio=${item.aspectRatio}, thumbnail=${product.videos[0].thumbnail?.substring(0, 60)}...`);
    } else {
      console.log(`Product ${product.sku} has no videos to update.`);
    }
  }

  // Also verify any remaining products with videos
  const allWithVideos = await Product.find({ 'videos.0': { $exists: true } }).lean();
  console.log(`\nTotal products with videos in DB: ${allWithVideos.length}`);
  for (const p of allWithVideos) {
    console.log(`- ${p.sku} | ${p.title} | ratio=${p.videos[0]?.aspectRatio} | type=${p.videos[0]?.videoType} | thumb=${p.videos[0]?.thumbnail?.substring(0, 50)}`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

updateAspectRatios().catch(console.error);
