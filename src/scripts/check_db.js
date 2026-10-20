import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';

async function check() {
  await connectDatabase();

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:', collections.map(c => c.name));

  for (const coll of collections) {
    const name = coll.name;
    const cursor = mongoose.connection.db.collection(name).find();
    let found = [];
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const str = JSON.stringify(doc);
      if (str.includes('iez9vm') || str.includes('ptmpr0') || str.includes('Emerald_and_Diamond_Gold_Choker') || str.includes('Model_wearing_emerald_choker')) {
        found.push({ id: doc._id, name: doc.name || doc.title || doc.slug, str: str.slice(0, 300) });
      }
    }

    if (found.length > 0) {
      console.log(`FOUND in collection ${name}:`, found);
    }
  }

  await disconnectDatabase();
}

check().catch(console.error);
