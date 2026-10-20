import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Product } from '../models/index.js';

async function check() {
  await connectDatabase();
  const emeralds = await Product.find({
    $or: [
      { title: { $regex: 'emerald|choker', $options: 'i' } },
      { slug: { $regex: 'emerald|choker', $options: 'i' } }
    ]
  }).select('title slug images videos');

  console.log('Emerald/Choker products count:', emeralds.length);
  for (const p of emeralds) {
    console.log(`Product: ${p.title} (${p.slug})`);
    console.log('Images:', p.images);
    console.log('Videos:', p.videos);
  }

  await disconnectDatabase();
}

check().catch(console.error);
