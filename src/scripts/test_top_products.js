import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { getTopProducts } from '../services/analyticsService.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await getTopProducts({ limit: 5 });
  console.log('Top products count:', res.topProducts?.length);
  for (let i = 0; i < (res.topProducts?.length || 0); i++) {
    const p = res.topProducts[i];
    console.log(`[${i}] title: ${p.title}`);
    console.log(`    image type: ${typeof p.image}, isArray: ${Array.isArray(p.image)}`);
    console.log(`    image: ${JSON.stringify(p.image)}`);
  }
  await mongoose.disconnect();
}

main().catch(console.error);
