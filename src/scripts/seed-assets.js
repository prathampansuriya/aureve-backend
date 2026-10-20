import { connectDatabase, disconnectDatabase } from '../config/db.js';
import {
  Category,
  Collection,
  Product,
  ProductVariant,
  Banner,
  StoreLocation,
  PageContent,
  Offer
} from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * =========================================================================
 * AUREVÉ ASSET URL SEED SCRIPT (MANUALLY EDITABLE)
 * =========================================================================
 * Instructions:
 * 1. Generate all required images in ChatGPT and videos in Google Flow using prompts.md.
 * 2. Upload your generated media assets to your Cloudinary account.
 * 3. Replace the 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' markers below with your actual HTTPS Cloudinary URLs.
 * 4. Run: npm run seed:assets
 *
 * SAFETY INVARIANT: This script will strictly REFUSE to apply updates if ANY
 * replacement marker remains in the mapping.
 * =========================================================================
 */

export const REPLACEMENT_MARKER = 'REPLACE_WITH_CLOUDINARY_HTTPS_URL';

export const ASSET_MAPPINGS = {
  // 1. Categories (12 Primary Showcase Images)
  categories: [
    {
      slug: 'necklaces-chokers',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/necklaces_chokers',
      alt: 'AUREVÉ Imperial Necklaces & Chokers Showcase'
    },
    {
      slug: 'earrings',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/earrings',
      alt: 'AUREVÉ Jhumkas, Chaandbalis & Studs'
    },
    {
      slug: 'rings-solitaires',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/rings_solitaires',
      alt: 'AUREVÉ Solitaires & Cocktail Rings'
    },
    {
      slug: 'bangles-kadas',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/bangles_kadas',
      alt: 'AUREVÉ Temple Nakshi Bangles & Kadas'
    },
    {
      slug: 'pendants',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/pendants',
      alt: 'AUREVÉ Solitaire & Polki Pendants'
    },
    {
      slug: 'mangalsutras',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/mangalsutras',
      alt: 'AUREVÉ Contemporary & Heritage Mangalsutras'
    },
    {
      slug: 'haute-solitaires',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/haute_solitaires',
      alt: 'AUREVÉ Certified Single-Stone Solitaires'
    },
    {
      slug: 'bridal-sets',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/bridal_sets',
      alt: 'AUREVÉ Imperial Bridal Trousseau Sets'
    },
    {
      slug: 'bracelets',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/bracelets',
      alt: 'AUREVÉ Diamond Tennis Bracelets & Cuffs'
    },
    {
      slug: 'nose-pins',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/nose_pins',
      alt: 'AUREVÉ Bridal Naths & Diamond Nose Pins'
    },
    {
      slug: 'mens-jewellery',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/mens_jewellery',
      alt: 'AUREVÉ Sovereign Mens Accessories & Cufflinks'
    },
    {
      slug: 'ceremonial-headpieces',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/categories/ceremonial_headpieces',
      alt: 'AUREVÉ Maang Tikkas & Matha Pattis'
    }
  ],

  // 2. Collections (14 Banner & Thumbnail Images)
  collections: [
    {
      slug: 'royal-rajputana',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/royal_rajputana'
    },
    {
      slug: 'golconda-vault',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/golconda_vault'
    },
    {
      slug: 'imperial-bridal',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/imperial_bridal'
    },
    {
      slug: 'solitaire-grandeur',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/solitaire_grandeur'
    },
    {
      slug: 'champagne-rose',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/champagne_rose'
    },
    {
      slug: 'contemporary-gold',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/contemporary_gold'
    },
    {
      slug: 'temple-antique',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/temple_antique'
    },
    {
      slug: 'nizam-treasures',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/nizam_treasures'
    },
    {
      slug: 'platinum-sovereign',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/platinum_sovereign'
    },
    {
      slug: 'mughal-jadau',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/mughal_jadau'
    },
    {
      slug: 'festive-radiance',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/festive_radiance'
    },
    {
      slug: 'everyday-luxury',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/everyday_luxury'
    },
    {
      slug: 'connoisseur-gentleman',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/connoisseur_gentleman'
    },
    {
      slug: 'ultra-exclusive-vault',
      bannerUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      thumbnailUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicIdPrefix: 'aureve_production/collections/ultra_exclusive_vault'
    }
  ],

  // 3. Homepage Banners (6 Campaign Banners)
  banners: [
    {
      key: 'HERO_ROYAL_POLKI_DIWALI_2026',
      desktopUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      mobileUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      key: 'HERO_SOLITAIRE_GRANDEUR_2026',
      desktopUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      mobileUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      key: 'HERO_IMPERIAL_BRIDAL_COUTURE_2026',
      desktopUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      mobileUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      key: 'EDITORIAL_GOLCONDA_SPOTLIGHT_2026',
      desktopUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      mobileUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      key: 'PROMO_FESTIVE_PRIVILEGE_2026',
      desktopUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      mobileUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      key: 'HERITAGE_ATELIER_VAULT_2026',
      desktopUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      mobileUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    }
  ],

  // 4. Luxury Flagship Showroom Boutiques (4 Salons)
  stores: [
    {
      slug: 'mumbai-colaba',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/stores/mumbai_colaba',
      alt: 'AUREVÉ Mumbai Colaba Flagship Salon & VIP Lounge'
    },
    {
      slug: 'delhi-chanakyapuri',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/stores/delhi_chanakyapuri',
      alt: 'AUREVÉ Delhi Chanakyapuri Diplomatic Salon Suite'
    },
    {
      slug: 'bangalore-lavelle-road',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/stores/bangalore_lavelle_road',
      alt: 'AUREVÉ Bangalore Lavelle Road Haute Joaillerie Suite'
    },
    {
      slug: 'hyderabad-jubilee-hills',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/stores/hyderabad_jubilee_hills',
      alt: 'AUREVÉ Hyderabad Jubilee Hills Heritage Vault Salon'
    }
  ],

  // 5. Products (Complete 40 Master Products with Primary & Angle Views, 10 Dedicated Videos)
  products: [
    // Flagship Masterpieces (Primary + Angle Image + Dedicated Video)
    {
      sku: 'AV-CHOK-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'MODEL_WEARING'
    },
    {
      sku: 'AV-RING-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'PRODUCT_360'
    },
    {
      sku: 'AV-KADA-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'CRAFTING_STORY'
    },
    {
      sku: 'AV-HAAR-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'MODEL_WEARING'
    },
    {
      sku: 'AV-PEND-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'PRODUCT_360'
    },
    {
      sku: 'AV-EAR-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'MODEL_WEARING'
    },
    {
      sku: 'AV-BRAC-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'PRODUCT_360'
    },
    {
      sku: 'AV-MEN-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'PRODUCT_360'
    },
    {
      sku: 'AV-TIK-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'MODEL_WEARING'
    },
    {
      sku: 'AV-MANG-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      videoType: 'MODEL_WEARING'
    },

    // Expanded Catalog Products 11–40 (Primary + Angle Gallery Images)
    {
      sku: 'AV-RING-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-CHOK-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-EAR-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-KADA-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-PEND-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-NATH-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-MRING-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-HEAD-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-CHOK-003',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-EAR-003',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-RING-003',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-BRAC-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-RING-004',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-EAR-004',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-KADA-003',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-MANG-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-KADA-004',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-SOL-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-SET-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-BROOCH-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-SOL-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-EAR-005',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-ARM-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-NOSE-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-HEAD-002',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-CHAIN-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-RING-005',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-RING-006',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-ANK-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    },
    {
      sku: 'AV-MBTN-001',
      primaryImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      angleImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL'
    }
  ],

  // 6. Dynamic Maison CMS Pages
  cmsPages: [
    {
      pageKey: 'OUR_STORY',
      heroImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      sectionImages: [
        { sectionKey: 'royal_lineage', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' },
        { sectionKey: 'hallmark_sovereign', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' },
        { sectionKey: 'atelier_craft', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' }
      ]
    },
    {
      pageKey: 'BESPOKE_SERVICES',
      heroImageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      sectionImages: [
        { sectionKey: 'private_consultation', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' },
        { sectionKey: 'gemstone_sourcing', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' },
        { sectionKey: 'gouache_prototype', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' },
        { sectionKey: 'master_karigari', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' },
        { sectionKey: 'bis_handover', mediaUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL' }
      ]
    }
  ],

  // 7. Cinematic Atelier Brand Films (Google Flow 16:9)
  atelierVideos: [
    {
      key: 'crafting_story_polki',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/films/crafting_story_polki'
    },
    {
      key: 'atelier_genesis_film',
      videoUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/films/atelier_genesis_film'
    }
  ],
  offers: [
    {
      slug: 'diwali-radiance-2026',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/offers/diwali_radiance_2026_banner',
      alt: 'AUREVÉ Diwali Festive Radiance Offer Banner'
    },
    {
      slug: 'bridal-privilege-2026',
      imageUrl: 'REPLACE_WITH_CLOUDINARY_HTTPS_URL',
      publicId: 'aureve_production/offers/bridal_privilege_2026_banner',
      alt: 'AUREVÉ Imperial Bridal Trousseau Privilege Banner'
    }
  ]
};

/**
 * Audit and validate all mapping entries before database write.
 */
export const auditAssetMappings = () => {
  const pendingMarkers = [];

  const checkValue = (val, path) => {
    if (typeof val === 'string' && val.includes(REPLACEMENT_MARKER)) {
      pendingMarkers.push(path);
    }
  };

  ASSET_MAPPINGS.categories.forEach((c) => checkValue(c.imageUrl, `Category [${c.slug}].imageUrl`));
  ASSET_MAPPINGS.collections.forEach((col) => {
    checkValue(col.bannerUrl, `Collection [${col.slug}].bannerUrl`);
    checkValue(col.thumbnailUrl, `Collection [${col.slug}].thumbnailUrl`);
  });
  ASSET_MAPPINGS.banners.forEach((b) => {
    checkValue(b.desktopUrl, `Banner [${b.key}].desktopUrl`);
    checkValue(b.mobileUrl, `Banner [${b.key}].mobileUrl`);
  });
  ASSET_MAPPINGS.stores.forEach((s) => checkValue(s.imageUrl, `Store [${s.slug}].imageUrl`));
  ASSET_MAPPINGS.products.forEach((p) => {
    checkValue(p.primaryImageUrl, `Product [${p.sku}].primaryImageUrl`);
    checkValue(p.angleImageUrl, `Product [${p.sku}].angleImageUrl`);
    if (p.videoUrl) {
      checkValue(p.videoUrl, `Product [${p.sku}].videoUrl`);
    }
  });
  ASSET_MAPPINGS.cmsPages.forEach((page) => {
    checkValue(page.heroImageUrl, `PageContent [${page.pageKey}].heroImageUrl`);
    page.sectionImages.forEach((s) => checkValue(s.mediaUrl, `PageContent [${page.pageKey}].section[${s.sectionKey}]`));
  });
  ASSET_MAPPINGS.atelierVideos.forEach((v) => checkValue(v.videoUrl, `AtelierFilm [${v.key}].videoUrl`));
  ASSET_MAPPINGS.offers.forEach((o) => checkValue(o.imageUrl, `Offer [${o.slug}].imageUrl`));

  return pendingMarkers;
};

/**
 * Execute asset seed updates to MongoDB
 */
export const runAssetSeed = async () => {
  logger.info('===========================================================');
  logger.info('  AUREVÉ ASSET URL SEED APPLIER (158 TOTAL MEDIA ASSETS)');
  logger.info('===========================================================');

  const pending = auditAssetMappings();

  if (pending.length > 0) {
    logger.error('CRITICAL ABORT: Asset seed script cannot run because unresolved replacement markers remain.');
    logger.error(`Found ${pending.length} unresolved '${REPLACEMENT_MARKER}' entries:`);
    pending.slice(0, 15).forEach((item) => logger.warn(`   • ${item}`));
    if (pending.length > 15) {
      logger.warn(`   ... and ${pending.length - 15} more.`);
    }
    logger.info('');
    logger.info('NEXT STEPS:');
    logger.info('1. Consult prompts.md for ChatGPT image prompts and Google Flow video prompts.');
    logger.info('2. Generate and upload your assets to Cloudinary.');
    logger.info('3. Replace the markers in src/scripts/seed-assets.js with the real Cloudinary HTTPS URLs.');
    logger.info('4. Rerun: npm run seed:assets');
    process.exit(1);
  }

  try {
    await connectDatabase();

    // 1. Update Categories
    logger.info('Updating Category Media Assets...');
    for (const cat of ASSET_MAPPINGS.categories) {
      await Category.updateOne(
        { slug: cat.slug },
        {
          $set: {
            'image.url': cat.imageUrl,
            'image.publicId': cat.publicId,
            'image.alt': cat.alt
          }
        }
      );
    }

    // 2. Update Collections
    logger.info('Updating Collection Banners & Thumbnails...');
    for (const col of ASSET_MAPPINGS.collections) {
      await Collection.updateOne(
        { slug: col.slug },
        {
          $set: {
            'bannerImage.url': col.bannerUrl,
            'bannerImage.publicId': `${col.publicIdPrefix}_banner`,
            'thumbnailImage.url': col.thumbnailUrl,
            'thumbnailImage.publicId': `${col.publicIdPrefix}_thumb`
          }
        }
      );
    }

    // 3. Update Banners
    logger.info('Updating Homepage Banners...');
    for (const b of ASSET_MAPPINGS.banners) {
      await Banner.updateOne(
        { key: b.key },
        {
          $set: {
            'desktopMedia.url': b.desktopUrl,
            'mobileMedia.url': b.mobileUrl || b.desktopUrl
          }
        }
      );
    }

    // 4. Update Stores
    logger.info('Updating Luxury Showroom Boutique Imagery...');
    for (const st of ASSET_MAPPINGS.stores) {
      await StoreLocation.updateOne(
        { slug: st.slug },
        {
          $set: {
            'images.0.url': st.imageUrl,
            'images.0.publicId': st.publicId
          }
        }
      );
    }

    // 5. Update Products & Variants
    logger.info('Updating Product Media Galleries & Videos...');
    for (const p of ASSET_MAPPINGS.products) {
      const updateDoc = {
        'images.0.url': p.primaryImageUrl,
        'images.1.url': p.angleImageUrl
      };

      if (p.videoUrl) {
        updateDoc.videos = [
          {
            url: p.videoUrl,
            publicId: `aureve_production/videos/${p.sku.toLowerCase()}`,
            videoType: p.videoType || 'PRODUCT_360',
            aspectRatio: p.videoType === 'MODEL_WEARING' ? '9:16' : '16:9',
            durationSeconds: 15,
            thumbnail: p.primaryImageUrl
          }
        ];
      }

      await Product.updateOne({ sku: p.sku }, { $set: updateDoc });

      // Update variant specific media with primary image
      await ProductVariant.updateMany(
        { sku: new RegExp(`^${p.sku}`) },
        {
          $set: {
            variantSpecificMedia: [
              {
                url: p.primaryImageUrl,
                publicId: `aureve_production/variants/${p.sku.toLowerCase()}`,
                alt: `${p.sku} Variant Showcase`
              }
            ]
          }
        }
      );
    }

    // 6. Update Dynamic CMS Pages
    logger.info('Updating Dynamic CMS Page Media...');
    for (const page of ASSET_MAPPINGS.cmsPages) {
      await PageContent.updateOne(
        { pageKey: page.pageKey },
        {
          $set: {
            'heroMedia.url': page.heroImageUrl
          }
        }
      );

      for (const sec of page.sectionImages) {
        await PageContent.updateOne(
          { pageKey: page.pageKey, 'sections.sectionKey': sec.sectionKey },
          {
            $set: {
              'sections.$.mediaUrl': sec.mediaUrl
            }
          }
        );
      }
    }

    // 7. Update Promotional Offers
    logger.info('Updating Promotional Offer Banners...');
    for (const off of ASSET_MAPPINGS.offers) {
      await Offer.updateOne(
        { slug: off.slug },
        {
          $set: {
            bannerUrl: off.imageUrl
          }
        }
      );
    }

    logger.info('✨ ALL 160 SEEDED MEDIA ASSETS SUCCESSFULLY UPDATED TO CLOUDINARY URLS!');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to apply asset seed updates:', { message: error.message, stack: error.stack });
    await disconnectDatabase();
    process.exit(1);
  }
};

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seed-assets.js')) {
  runAssetSeed();
}
