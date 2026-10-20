import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Product } from '../models/index.js';
import { logger } from '../utils/logger.js';

async function sanitizeDbAssets() {
  await connectDatabase();

  // 1. Repair Noor-e-Jahan Emerald & Polki Choker if empty
  const noorChoker = await Product.findOne({ slug: 'noor-e-jahan-emerald-polki-choker' });
  if (noorChoker) {
    const hasBrokenImage = !noorChoker.images || noorChoker.images.length === 0 || noorChoker.images.some(img => !img.url);
    if (hasBrokenImage) {
      console.log('Restoring verified Cloudinary assets for Noor-e-Jahan Emerald Choker...');
      noorChoker.images = [
        {
          url: 'https://res.cloudinary.com/dbtq4qk6s/image/upload/v1792339744/Emerald_and_Pearl_Gold_Choker_Display_ooxkis.png',
          publicId: 'aureve/products/Emerald_and_Pearl_Gold_Choker_Display_ooxkis',
          alt: 'The Noor-e-Jahan Emerald & Polki Choker Primary View',
          isPrimary: true,
          displayOrder: 0
        },
        {
          url: 'https://res.cloudinary.com/dbtq4qk6s/image/upload/v1792339800/Jewelry_Atelier__Emerald_Choker_Designs_psfbaz.png',
          publicId: 'aureve/products/Jewelry_Atelier__Emerald_Choker_Designs_psfbaz',
          alt: 'The Noor-e-Jahan Emerald & Polki Choker Atelier View',
          isPrimary: false,
          displayOrder: 1
        }
      ];
      noorChoker.videos = [
        {
          url: 'https://res.cloudinary.com/dbtq4qk6s/video/upload/v1783954323/banner-v-2_exipob.mp4',
          publicId: 'aureve/products/banner-v-2_exipob',
          videoType: 'PRODUCT_360',
          durationSeconds: 15,
          thumbnail: 'https://res.cloudinary.com/dbtq4qk6s/image/upload/v1792339744/Emerald_and_Pearl_Gold_Choker_Display_ooxkis.png'
        }
      ];
      await noorChoker.save();
      console.log('Successfully updated Noor-e-Jahan Emerald Choker assets.');
    }
  }

  // 2. Repair Royal Polki Cascade Earrings (video mistakenly placed in images)
  const polkiEarrings = await Product.findOne({ slug: 'royal-polki-cascade-earrings-013' });
  if (polkiEarrings) {
    const videoInImages = (polkiEarrings.images || []).find(img => img.url && (img.url.includes('/video/upload/') || img.url.endsWith('.mp4')));
    if (videoInImages) {
      console.log('Cleaning video from images in Royal Polki Cascade Earrings...');
      const genuineImages = (polkiEarrings.images || []).filter(img => img.url && !img.url.includes('/video/upload/') && !img.url.endsWith('.mp4'));
      if (genuineImages.length > 0) {
        genuineImages[0].isPrimary = true;
      }
      polkiEarrings.images = genuineImages;

      // Ensure video is in videos array
      const videoExists = (polkiEarrings.videos || []).some(v => v.url === videoInImages.url);
      if (!videoExists) {
        polkiEarrings.videos.push({
          url: videoInImages.url,
          publicId: videoInImages.publicId || 'aureve/products/av-ear-013_video',
          videoType: 'PRODUCT_360',
          durationSeconds: 15,
          thumbnail: genuineImages[0]?.url || ''
        });
      }
      await polkiEarrings.save();
      console.log('Successfully repaired Royal Polki Cascade Earrings assets.');
    }
  }

  // 3. Scan all products for any empty url string or broken format
  const all = await Product.find();
  for (const p of all) {
    let changed = false;
    if (p.images && p.images.some(img => !img.url || img.url.trim() === '')) {
      p.images = p.images.filter(img => img.url && img.url.trim() !== '');
      if (p.images.length > 0 && !p.images.some(im => im.isPrimary)) {
        p.images[0].isPrimary = true;
      }
      changed = true;
    }
    if (p.videos && p.videos.some(vid => !vid.url || vid.url.trim() === '')) {
      p.videos = p.videos.filter(vid => vid.url && vid.url.trim() !== '');
      changed = true;
    }
    if (changed) {
      await p.save();
      console.log(`Cleaned up empty assets for product: ${p.slug}`);
    }
  }

  await disconnectDatabase();
}

sanitizeDbAssets().catch(console.error);
