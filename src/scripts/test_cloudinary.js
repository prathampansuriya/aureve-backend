import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

async function test() {
  console.log('isCloudinaryConfigured:', isCloudinaryConfigured());
  try {
    const ping = await cloudinary.api.ping();
    console.log('Cloudinary Ping:', ping);
  } catch (err) {
    console.error('Cloudinary Ping Failed:', err.message);
  }

  try {
    console.log('\n--- Searching for assets in Cloudinary ---');
    // Search images
    const images = await cloudinary.api.resources({
      resource_type: 'image',
      max_results: 30
    });
    console.log(`Found ${images.resources.length} image resources.`);
    for (const r of images.resources.slice(0, 10)) {
      console.log(`- Image: ${r.public_id} (${r.format}, v${r.version}, ${r.secure_url})`);
    }

    // Search specifically for choker or iez9vm
    const chokerSearch = images.resources.filter(r => r.public_id.includes('choker') || r.public_id.includes('Choker') || r.public_id.includes('iez9vm') || r.public_id.includes('Emerald'));
    console.log('Matching choker/emerald images:', chokerSearch);

    // Search videos
    const videos = await cloudinary.api.resources({
      resource_type: 'video',
      max_results: 30
    });
    console.log(`\nFound ${videos.resources.length} video resources.`);
    for (const v of videos.resources.slice(0, 10)) {
      console.log(`- Video: ${v.public_id} (${v.format}, v${v.version}, ${v.secure_url})`);
    }

    const chokerVidSearch = videos.resources.filter(r => r.public_id.includes('choker') || r.public_id.includes('ptmpr0') || r.public_id.includes('emerald'));
    console.log('Matching choker videos:', chokerVidSearch);

  } catch (err) {
    console.error('Resource search failed:', err.message);
  }
}

test();
