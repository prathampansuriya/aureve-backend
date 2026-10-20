import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Collection } from '../../src/models/Collection.js';
import { Product } from '../../src/models/Product.js';
import { ProductVariant } from '../../src/models/ProductVariant.js';
import { InventoryLog } from '../../src/models/InventoryLog.js';
import { Order } from '../../src/models/Order.js';
import { Banner } from '../../src/models/Banner.js';
import { HomepageSection } from '../../src/models/HomepageSection.js';
import { Offer } from '../../src/models/Offer.js';
import { StoreLocation } from '../../src/models/StoreLocation.js';

describe('AUREVÉ Catalog, Collections, Inventory & Merchandising Integration Tests', () => {
  let adminUser;
  let customerUser;
  let adminToken;
  let customerToken;

  let testCategory;
  let childCategory;
  let testCollection;
  let testProduct;
  let testVariant;

  const mockImage = {
    url: 'https://res.cloudinary.com/aureve/image/upload/v1/catalog/sample.jpg',
    publicId: 'catalog/sample_id',
    alt: 'AUREVÉ Haute Joaillerie Showcase'
  };

  beforeAll(async () => {
    await connectDatabase();

    // Clean up test data
    await User.deleteMany({
      email: { $in: ['catalog_admin@aureve-test.com', 'catalog_cust@aureve-test.com'] }
    });
    await Category.deleteMany({ slug: { $regex: /^test-/ } });
    await Collection.deleteMany({ slug: { $regex: /^test-/ } });
    await Product.deleteMany({ sku: { $regex: /^TEST-/ } });
    await ProductVariant.deleteMany({ sku: { $regex: /^TEST-VAR-/ } });
    await Banner.deleteMany({ key: { $regex: /^TEST_/ } });
    await HomepageSection.deleteMany({ key: { $regex: /^TEST_/ } });
    await Order.deleteMany({ orderNumber: { $regex: /^TEST-ORD-/ } });
    await Offer.deleteMany({ slug: { $regex: /^test-/ } });
    await StoreLocation.deleteMany({ slug: { $regex: /^test-/ } });

    // Seed test users
    adminUser = await User.create({
      firstName: 'Vikramaditya',
      lastName: 'Singhania',
      email: 'catalog_admin@aureve-test.com',
      passwordHash: 'hashed_admin_pass',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    customerUser = await User.create({
      firstName: 'Ananya',
      lastName: 'Pandey',
      email: 'catalog_cust@aureve-test.com',
      passwordHash: 'hashed_cust_pass',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true
    });

    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: 'ADMIN' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), role: 'CUSTOMER' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup created records
    await User.deleteMany({
      email: { $in: ['catalog_admin@aureve-test.com', 'catalog_cust@aureve-test.com'] }
    });
    await Category.deleteMany({ slug: { $regex: /^test-/ } });
    await Collection.deleteMany({ slug: { $regex: /^test-/ } });
    await Product.deleteMany({ sku: { $regex: /^TEST-/ } });
    await ProductVariant.deleteMany({ sku: { $regex: /^TEST-VAR-/ } });
    await Banner.deleteMany({ key: { $regex: /^TEST_/ } });
    await HomepageSection.deleteMany({ key: { $regex: /^TEST_/ } });
    await Order.deleteMany({ orderNumber: { $regex: /^TEST-ORD-/ } });
    await Offer.deleteMany({ slug: { $regex: /^test-/ } });
    await StoreLocation.deleteMany({ slug: { $regex: /^test-/ } });
    await disconnectDatabase();
  });

  // ==========================================
  // 1. CATEGORY MANAGEMENT & HIERARCHY
  // ==========================================
  describe('1. Category Management & Safeguards', () => {
    it('should reject category creation when missing required image', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Necklaces Without Image',
          slug: 'test-necklaces-no-img',
          description: 'Luxury chokers and necklaces'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create root category with image and auto-generated slug', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Haute Necklaces',
          slug: 'test-haute-necklaces',
          description: 'Imperial diamond and gold necklaces',
          image: mockImage,
          displayOrder: 1,
          isActive: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.slug).toBe('test-haute-necklaces');
      testCategory = res.body.data.category;
    });

    it('should reject duplicate category name or slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Haute Necklaces',
          slug: 'test-haute-necklaces',
          image: mockImage
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should create child subcategory linked to parent category', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Chokers',
          slug: 'test-chokers',
          parentCategory: testCategory._id,
          image: mockImage,
          displayOrder: 2
        });

      expect(res.status).toBe(201);
      childCategory = res.body.data.category;
      expect(childCategory.parentCategory._id || childCategory.parentCategory).toBe(testCategory._id);
    });

    it('should return nested category tree structure via GET /api/v1/categories?tree=true', async () => {
      const res = await request(app)
        .get('/api/v1/categories?tree=true');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const rootCat = res.body.data.categories.find((c) => c._id === testCategory._id);
      expect(rootCat).toBeDefined();
      expect(rootCat.children).toBeInstanceOf(Array);
      expect(rootCat.children.some((child) => child._id === childCategory._id)).toBe(true);
    });

    it('should archive and restore category', async () => {
      // Archive
      const archiveRes = await request(app)
        .patch(`/api/v1/categories/${testCategory._id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.category.isArchived).toBe(true);
      expect(archiveRes.body.data.category.isActive).toBe(false);

      // Restore
      const restoreRes = await request(app)
        .patch(`/api/v1/categories/${testCategory._id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.category.isArchived).toBe(false);
      expect(restoreRes.body.data.category.isActive).toBe(true);
    });
  });

  // ==========================================
  // 2. COLLECTION MANAGEMENT & MERCHANDISING
  // ==========================================
  describe('2. Collection Management', () => {
    it('should create collection with story, hero banner, and thumbnail', async () => {
      const res = await request(app)
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Royal Mughal Splendour',
          slug: 'test-royal-mughal',
          tagline: 'Imperial Jadau and Polki Masterpieces',
          story: 'Echoing the grand courtyards of the Mughal emperors, each jewel represents pure timeless artistry.',
          bannerImage: mockImage,
          thumbnailImage: mockImage,
          status: 'ACTIVE',
          isFeatured: true,
          merchandisingMetadata: {
            badge: 'Limited Heritage',
            displayOrder: 1,
            themeTone: 'gold'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.collection.slug).toBe('test-royal-mughal');
      testCollection = res.body.data.collection;
    });

    it('should list collections publicly with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/collections?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.collections.some((c) => c._id === testCollection._id)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should update collection publication status', async () => {
      const res = await request(app)
        .patch(`/api/v1/collections/${testCollection._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.collection.status).toBe('ACTIVE');
    });
  });

  // ==========================================
  // 3. PRODUCT & VARIANT LIFECYCLE
  // ==========================================
  describe('3. Product Master & Variant Lifecycle', () => {
    it('should create draft product with pricing in paise and hallmarking metadata', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Maharani Nizam Choker',
          slug: 'test-maharani-nizam-choker',
          sku: 'TEST-PROD-001',
          subtitle: 'An opulent 18K gold choker featuring certified Zambian emeralds',
          description: 'Handcrafted in royal workshops over 300 hours with flawless pavé diamond setting.',
          categoryId: testCategory._id,
          collectionIds: [testCollection._id],
          tags: ['nizam', 'emerald', 'bridal'],
          gender: 'WOMEN',
          occasion: 'BRIDAL',
          hallmarking: {
            bisHallmarked: true,
            huidNumber: 'AUR9872',
            certification: 'IGI'
          },
          materialOverview: {
            primaryMetal: 'YELLOW_GOLD',
            primaryPurity: '18K',
            hasDiamonds: true,
            hasGemstones: true,
            gemstoneTypes: ['Zambian Emerald']
          },
          pricing: {
            baseMetalPricePaise: 45000000, // 4,50,000 INR
            diamondStonePricePaise: 25000000, // 2,50,000 INR
            makingChargesPaise: 5000000, // 50,000 INR
            gstRate: 3
          },
          isNewArrival: true,
          images: [
            {
              url: 'https://res.cloudinary.com/aureve/image/upload/v1/products/choker-1.jpg',
              publicId: 'products/choker-1',
              alt: 'Maharani Choker Primary View',
              isPrimary: true
            }
          ],
          status: 'DRAFT'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.sku).toBe('TEST-PROD-001');
      testProduct = res.body.data.product;
    });

    it('should reject publishing product without at least one active variant', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('at least one active product variant');
    });

    it('should create product variant and automatically generate initial stock audit log', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantName: '18K Yellow Gold / Standard 16 inch',
          sku: 'TEST-VAR-001-YG',
          metalType: 'YELLOW_GOLD',
          metalPurity: '18K',
          size: '16_INCH',
          grossWeightGrams: 42.5,
          netGoldWeightGrams: 36.8,
          diamondWeightCarat: 4.2,
          priceInPaise: 75000000, // 7,50,000 INR
          inventoryCount: 5,
          availability: 'AVAILABLE'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testVariant = res.body.data.variant;
      expect(testVariant.inventoryCount).toBe(5);

      // Verify audit log creation
      const log = await InventoryLog.findOne({ variantId: testVariant._id });
      expect(log).toBeDefined();
      expect(log.movementType).toBe('INITIAL_STOCK');
      expect(log.quantityChanged).toBe(5);
      expect(log.newQuantity).toBe(5);
    });

    it('should enforce variant SKU uniqueness across the catalog', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${testProduct._id}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          variantName: 'Duplicate SKU Variant',
          sku: 'TEST-VAR-001-YG', // Duplicate
          metalType: 'ROSE_GOLD',
          metalPurity: '18K',
          size: '18_INCH',
          grossWeightGrams: 40.0,
          netGoldWeightGrams: 35.0,
          priceInPaise: 75000000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should successfully publish product now that an active variant exists', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.status).toBe('PUBLISHED');
    });

    it('should block unsafe category deletion when products depend on it', async () => {
      const res = await request(app)
        .delete(`/api/v1/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot delete category');
    });
  });

  // ==========================================
  // 4. ATOMIC INVENTORY & RESERVATIONS
  // ==========================================
  describe('4. Inventory Movements, Stock Audit & Checkout Reservations', () => {
    it('should adjust variant stock with immutable audit logging', async () => {
      const res = await request(app)
        .post(`/api/v1/products/variants/${testVariant._id}/stock/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adjustment: 3,
          reason: 'Showroom delivery replenishment from workshop'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.variant.inventoryCount).toBe(8); // 5 + 3 = 8

      // Check log
      const log = await InventoryLog.findOne({
        variantId: testVariant._id,
        movementType: 'ADMIN_ADJUSTMENT'
      }).sort({ createdAt: -1 });

      expect(log).toBeDefined();
      expect(log.quantityChanged).toBe(3);
      expect(log.previousQuantity).toBe(5);
      expect(log.newQuantity).toBe(8);
      expect(log.reason).toContain('replenishment');
    });

    it('should prevent inventory adjustments resulting in negative stock', async () => {
      const res = await request(app)
        .post(`/api/v1/products/variants/${testVariant._id}/stock/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adjustment: -15, // Currently 8, -15 would be -7
          reason: 'Incorrect write-off'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('negative inventory');
    });

    it('should hold checkout reservation and increment reservedCount', async () => {
      const res = await request(app)
        .post(`/api/v1/products/variants/${testVariant._id}/stock/reserve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.variant.reservedCount).toBe(2);

      const updatedVariant = await ProductVariant.findById(testVariant._id);
      expect(updatedVariant.availableStock).toBe(6); // 8 - 2 = 6
    });

    it('should reject reservation exceeding available unreserved stock', async () => {
      const res = await request(app)
        .post(`/api/v1/products/variants/${testVariant._id}/stock/reserve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 10 }); // Available is only 6

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Insufficient stock');
    });

    it('should release reserved stock when checkout expires or is abandoned', async () => {
      const res = await request(app)
        .post(`/api/v1/products/variants/${testVariant._id}/stock/release`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.variant.reservedCount).toBe(0);

      const updatedVariant = await ProductVariant.findById(testVariant._id);
      expect(updatedVariant.availableStock).toBe(8); // Full 8 restored
    });
  });

  // ==========================================
  // 5. CATALOG DISCOVERY & FACETED SEARCH
  // ==========================================
  describe('5. Catalog Discovery & Faceted Filters', () => {
    it('should filter products by category slug and metal type', async () => {
      const res = await request(app)
        .get(`/api/v1/products?category=${testCategory.slug}&metal=YELLOW_GOLD`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      expect(res.body.data.facets).toBeDefined();
    });

    it('should filter products by price range', async () => {
      const res = await request(app)
        .get('/api/v1/products?minPricePaise=10000000&maxPricePaise=90000000');

      expect(res.status).toBe(200);
      expect(res.body.data.products.some((p) => p._id === testProduct._id)).toBe(true);
    });

    it('should sanitize search query and match title or tags safely', async () => {
      const res = await request(app)
        .get('/api/v1/products?q=Nizam');

      expect(res.status).toBe(200);
      expect(res.body.data.products.some((p) => p._id === testProduct._id)).toBe(true);
    });

    it('should retrieve related products based on shared category and occasion', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProduct.slug}/related`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toBeInstanceOf(Array);
    });
  });

  // ==========================================
  // 6. REAL DATA-DRIVEN BESTSELLERS & TRENDING
  // ==========================================
  describe('6. Real Order-Data Driven Bestsellers', () => {
    it('should return empty bestsellers with documented rule when no completed orders exist', async () => {
      const aggregateSpy = vi.spyOn(Order, 'aggregate').mockResolvedValueOnce([]);
      const res = await request(app)
        .get('/api/v1/products/bestsellers');

      aggregateSpy.mockRestore();

      expect(res.status).toBe(200);
      expect(res.body.data.products).toHaveLength(0);
      expect(res.body.data.documentedRule).toContain('completed customer orders');
    });

    it('should rank products in bestsellers once a paid customer order exists', async () => {
      // Simulate completed order
      await Order.create({
        orderNumber: 'TEST-ORD-999',
        userId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: testVariant._id,
            title: testProduct.title,
            sku: testVariant.sku,
            quantity: 3,
            unitPricePaise: 75000000,
            makingChargesPaise: 5000000,
            gstPaise: 2400000,
            totalPaise: 82400000
          }
        ],
        shippingAddress: {
          fullName: 'Ananya Pandey',
          phone: '+919876543210',
          addressLine1: 'Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'India'
        },
        billingAddress: {
          fullName: 'Ananya Pandey',
          phone: '+919876543210',
          addressLine1: 'Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'India'
        },
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        currency: 'INR',
        financialBreakdown: {
          subtotalPaise: 75000000,
          makingChargesPaise: 5000000,
          gstPaise: 2400000,
          discountPaise: 0,
          shippingFeePaise: 0,
          grandTotalPaise: 82400000
        }
      });

      const res = await request(app)
        .get('/api/v1/products/bestsellers');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      expect(res.body.data.products[0]._id).toBe(testProduct._id);
    });

    it('should block deletion of product referenced in customer order history', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('customer order(s)');
    });
  });

  // ==========================================
  // 7. HOMEPAGE CONTENT & MERCHANDISING
  // ==========================================
  describe('7. Homepage Content APIs', () => {
    it('should create hero banner and merchandising section', async () => {
      // Create banner
      const bannerRes = await request(app)
        .post('/api/v1/homepage/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'TEST_ROYAL_HERO',
          title: 'Imperial Nizam Collection',
          subtitle: 'Rare Colombian Emeralds Set in 22K Gold',
          ctaText: 'Explore Collection',
          linkUrl: '/collections/test-royal-mughal',
          placement: 'HERO_CAROUSEL',
          desktopMedia: {
            url: 'https://res.cloudinary.com/aureve/image/upload/v1/banners/hero.jpg',
            publicId: 'banners/hero_1'
          },
          displayOrder: 1,
          isActive: true
        });

      expect(bannerRes.status).toBe(201);

      // Create section
      const sectionRes = await request(app)
        .post('/api/v1/homepage/sections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'TEST_FEATURED_BRIDAL',
          title: 'The Royal Bridal Suite',
          subtitle: 'Regal masterpieces handcrafted for generational vows',
          sectionType: 'CAROUSEL',
          targetCategory: testCategory._id,
          targetCollection: testCollection._id,
          curatedProductIds: [testProduct._id],
          displayOrder: 1,
          isActive: true
        });

      expect(sectionRes.status).toBe(201);
    });

    it('should retrieve complete public homepage feed with all merchandising constituents', async () => {
      // Seed a test offer and store location for comprehensive coverage
      await Offer.create({
        title: 'Test Royal Festive Privilege',
        slug: 'test-festive-privilege',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 7),
        isActive: true
      });

      await StoreLocation.create({
        name: 'Test AUREVÉ Flagship Boutique',
        slug: 'test-flagship-boutique',
        addressLine: '12 Alipore Avenue',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700027',
        phone: '+913324567890',
        email: 'alipore@aureve.com',
        vipLoungeAvailable: true,
        isActive: true
      });

      const res = await request(app)
        .get('/api/v1/homepage');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(data.heroBanners).toBeInstanceOf(Array);
      expect(data.heroBanners.some((b) => b.key === 'TEST_ROYAL_HERO')).toBe(true);

      expect(data.categories).toBeInstanceOf(Array);
      expect(data.collections).toBeInstanceOf(Array);
      expect(data.sections).toBeInstanceOf(Array);
      expect(data.newArrivals).toBeInstanceOf(Array);
      expect(data.bestSellers).toBeInstanceOf(Array);
      expect(data.appointmentCta).toBeDefined();
      expect(data.appointmentCta.bookingEndpoint).toBe('/api/v1/appointments');
      expect(data.showrooms).toBeInstanceOf(Array);
    });
  });
});
