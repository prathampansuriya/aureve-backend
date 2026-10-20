import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Coupon } from '../models/Coupon.js';
import { StoreLocation } from '../models/StoreLocation.js';

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const user = await User.findOne({ email: 'prathampansuriya444@gmail.com' }).lean();
  console.log('User found:', user ? { id: user._id, name: user.name, email: user.email, phone: user.phone, addresses: user.addresses } : 'NOT FOUND');

  const coupon = await Coupon.findOne({ code: 'FIRSTHEIRLOOM' }).lean();
  console.log('Coupon FIRSTHEIRLOOM:', coupon);

  const stores = await StoreLocation.find({ isActive: true }).select('name slug city addressLine phone email').lean();
  console.log('Stores count:', stores.length);
  stores.forEach(s => console.log(' Store:', s.name, s.city, s._id));

  const choker = await Product.findOne({ title: /Noor-e-Jahan/i }).lean();
  console.log('Choker product:', choker ? { id: choker._id, title: choker.title, sku: choker.sku, pricing: choker.pricing, images: choker.images?.[0]?.url } : 'NOT FOUND');

  if (choker) {
    const chokerVariants = await ProductVariant.find({ productId: choker._id }).lean();
    console.log('Choker variants count:', chokerVariants.length);
    chokerVariants.forEach(v => console.log('  Variant:', v.sku, v.variantName, v.priceInPaise, v.metalType, v.metalPurity));
  }

  const otherProducts = await Product.find({ title: { $not: /Noor-e-Jahan/i }, status: 'PUBLISHED' }).limit(5).lean();
  for (const p of otherProducts) {
    const v = await ProductVariant.findOne({ productId: p._id }).lean();
    console.log('Other Product:', p.title, 'SKU:', p.sku, 'Variant:', v ? { id: v._id, sku: v.sku, price: v.priceInPaise } : 'No variant');
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
