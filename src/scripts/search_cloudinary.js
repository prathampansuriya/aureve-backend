import { cloudinary } from '../config/cloudinary.js';

async function searchCloudinary() {
  try {
    console.log('--- Search by publicId ---');
    const resImage = await cloudinary.api.resource('Emerald_and_Diamond_Gold_Choker_on_Stone_iez9vm', { resource_type: 'image' }).catch(e => ({ error: e.message }));
    console.log('Direct resource image lookup:', resImage);

    const resVideo = await cloudinary.api.resource('Model_wearing_emerald_choker_1080p_20261019011326_ptmpr0', { resource_type: 'video' }).catch(e => ({ error: e.message }));
    console.log('Direct resource video lookup:', resVideo);

    // Also check with folders or search API
    const searchRes = await cloudinary.search
      .expression('iez9vm OR ptmpr0 OR choker')
      .execute()
      .catch(e => ({ error: e.message }));
    console.log('Search API results:', searchRes);

    // List all folders in Cloudinary
    const rootFolders = await cloudinary.api.root_folders();
    console.log('Root folders:', rootFolders);

    // List all subfolders in aureve
    const subFolders = await cloudinary.api.sub_folders('aureve').catch(() => ({ folders: [] }));
    console.log('aureve subfolders:', subFolders);
  } catch (err) {
    console.error('Error:', err);
  }
}

searchCloudinary();
