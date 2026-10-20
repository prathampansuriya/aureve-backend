import { connectDatabase, disconnectDatabase } from '../config/db.js';
import {
  User,
  Address,
  NotificationPreference,
  Category,
  Collection,
  Product,
  ProductVariant,
  Banner,
  HomepageSection,
  StoreLocation,
  Coupon,
  Offer,
  Cart,
  Wishlist,
  Order,
  Payment,
  InventoryLog,
  Review,
  Appointment,
  BespokeEnquiry,
  Notification,
  AuditLog,
  PageContent
} from '../models/index.js';
import { hashPassword } from '../utils/cryptoHelper.js';
import { logger } from '../utils/logger.js';

// Global Reference Date: 18 October 2026
const REFERENCE_DATE = new Date('2026-10-18T10:00:00.000Z');
const CAMPAIGN_START = new Date('2026-10-01T00:00:00.000Z');
const CAMPAIGN_END = new Date('2026-10-31T23:59:59.000Z');
const EXTENDED_END = new Date('2026-11-15T23:59:59.000Z');

// Placeholder marker constant for seed records before asset upload
export const SEED_PLACEHOLDER_IMAGE = {
  url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=900&auto=format&fit=crop',
  publicId: 'aureve_seed_catalog/placeholder_primary',
  alt: 'AUREVÉ Haute Joaillerie Masterpiece'
};

export const SEED_PLACEHOLDER_VIDEO = {
  url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-jeweler-working-on-a-ring-41584-large.mp4',
  publicId: 'aureve_seed_catalog/placeholder_video',
  videoType: 'PRODUCT_360',
  durationSeconds: 15,
  thumbnail: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=900&auto=format&fit=crop'
};

export const runSeed = async () => {
  logger.info('===========================================================');
  logger.info('  AUREVÉ HAUTE JOAILLERIE — MASTER SEED ENGINE (OCTOBER 2026)');
  logger.info(`  Reference Epoch: ${REFERENCE_DATE.toISOString()}`);
  logger.info('===========================================================');

  // 1. Production Safety Guard
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-production')) {
    logger.error('CRITICAL ABORT: Seed script executed in production environment without --force-production safety override.');
    process.exit(1);
  }

  try {
    await connectDatabase();

    // =========================================================================
    // 2. SEED CATEGORIES (12 Distinct Categories)
    // =========================================================================
    logger.info('💎 Seeding 12 Categories...');
    const categoriesData = [
      {
        name: 'Necklaces & Imperial Chokers',
        slug: 'necklaces-chokers',
        description: 'Statement collared chokers, cascading haars, and articulated polki collar suites.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Imperial Necklaces & Chokers' },
        displayOrder: 1
      },
      {
        name: 'Earrings & Jhumkas',
        slug: 'earrings',
        description: 'Chandbalis, diamond studs, jhumkas, and shoulder-duster chandelier drops.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Haute Earrings & Jhumkas' },
        displayOrder: 2
      },
      {
        name: 'Rings & Solitaires',
        slug: 'rings-solitaires',
        description: 'High jewellery cocktail rings, engagement solitaires, and eternity diamond bands.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Solitaires & Rings' },
        displayOrder: 3
      },
      {
        name: 'Bangles & Kadas',
        slug: 'bangles-kadas',
        description: 'Temple repoussé kadas, diamond-encrusted bangles, and flexible cuff bracelets.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Royal Bangles & Kadas' },
        displayOrder: 4
      },
      {
        name: 'Pendants & Strings',
        slug: 'pendants',
        description: 'Fine solitaire pendants, medallion necklets, and gemstone drop talismans.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Pendants & Strings' },
        displayOrder: 5
      },
      {
        name: 'Mangalsutras',
        slug: 'mangalsutras',
        description: 'Contemporary minimalist and heirloom royal 22K/18K gold mangalsutras.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Fine Mangalsutras' },
        displayOrder: 6
      },
      {
        name: 'Haute Solitaires',
        slug: 'haute-solitaires',
        description: 'GIA & IGI certified D-Flawless and Type IIa single-stone masterworks.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Haute Solitaires' },
        displayOrder: 7
      },
      {
        name: 'Imperial Bridal Sets',
        slug: 'bridal-sets',
        description: 'Complete ceremonial bridal trousseau suites crafted with uncut gems.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Imperial Bridal Suites' },
        displayOrder: 8
      },
      {
        name: 'Bracelets & Cuffs',
        slug: 'bracelets',
        description: 'Tennis diamond bracelets, platinum links, and articulated charm cuffs.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Bracelets & Cuffs' },
        displayOrder: 9
      },
      {
        name: 'Nose Pins & Naths',
        slug: 'nose-pins',
        description: 'Royal bridal naths, delicate diamond studs, and clip-on heritage nose rings.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Nose Pins & Naths' },
        displayOrder: 10
      },
      {
        name: 'Mens Sovereign Jewels',
        slug: 'mens-jewellery',
        description: 'Platinum & 18K cufflinks, royal sherwani buttons, signet rings, and brooches.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Mens Sovereign Jewels' },
        displayOrder: 11
      },
      {
        name: 'Ceremonial Headpieces',
        slug: 'ceremonial-headpieces',
        description: 'Maang tikkas, matha pattis, passas, and royal turban sarpeches.',
        image: { ...SEED_PLACEHOLDER_IMAGE, alt: 'AUREVÉ Ceremonial Headpieces' },
        displayOrder: 12
      }
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      const doc = await Category.findOneAndUpdate(
        { slug: cat.slug },
        {
          $set: {
            name: cat.name,
            description: cat.description,
            image: cat.image,
            displayOrder: cat.displayOrder,
            isActive: true,
            isArchived: false,
            metadata: {
              metaTitle: `${cat.name} | AUREVÉ Haute Joaillerie`,
              metaDescription: cat.description,
              metaKeywords: ['luxury jewellery', cat.slug, 'gold', 'diamonds']
            }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      categoryMap[cat.slug] = doc;
    }
    logger.info(`✓ Successfully seeded ${Object.keys(categoryMap).length} Categories.`);

    // =========================================================================
    // 3. SEED COLLECTIONS (14 Curated Collections)
    // =========================================================================
    logger.info('👑 Seeding 14 Collections...');
    const collectionsData = [
      {
        name: 'Royal Rajputana Collection',
        slug: 'royal-rajputana',
        tagline: 'Ancestral splendour inspired by Rajputana courts',
        story: 'Handcrafted with raw uncut Golconda polki cushioned in pure 24K gold foil with reverse Meenakari enameling.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Royal Rajputana Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Royal Rajputana Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Imperial Heritage', displayOrder: 1, themeTone: 'gold' }
      },
      {
        name: 'The Golconda Vault',
        slug: 'golconda-vault',
        tagline: 'The rarest natural uncut diamond heirlooms',
        story: 'Directly channeling the legendary diamonds of Golconda with luminous fire and artisanal setting.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'The Golconda Vault Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'The Golconda Vault Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Private Reserve', displayOrder: 2, themeTone: 'gold' }
      },
      {
        name: 'Imperial Bridal Suite',
        slug: 'imperial-bridal',
        tagline: 'Couture jewels for royal Indian weddings',
        story: 'Grand masterpieces comprising matching choker, earrings, nath, and maang tikka.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Imperial Bridal Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Imperial Bridal Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Bridal Couture', displayOrder: 3, themeTone: 'ruby' }
      },
      {
        name: 'Solitaire Grandeur',
        slug: 'solitaire-grandeur',
        tagline: 'GIA certified D-Flawless solitaires set in pure 950 Platinum',
        story: 'Celebrates purity with certified stones selected for perfect optical brilliance.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Solitaire Grandeur Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Solitaire Grandeur Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'GIA Certified', displayOrder: 4, themeTone: 'platinum' }
      },
      {
        name: 'Champagne Rose',
        slug: 'champagne-rose',
        tagline: 'Warm 18K rose gold accented with brilliant white diamonds',
        story: 'A contemporary dialogue between warm pink gold alloys and micro-pave diamonds.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Champagne Rose Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Champagne Rose Thumbnail' },
        isFeatured: false,
        merchandisingMetadata: { badge: 'Rose Gold', displayOrder: 5, themeTone: 'rose' }
      },
      {
        name: 'Contemporary Minimalist Gold',
        slug: 'contemporary-gold',
        tagline: 'Understated everyday luxury for the modern connoisseur',
        story: 'Architectural silhouettes engineered for lightweight everyday wear in 18K gold.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Contemporary Gold Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Contemporary Gold Thumbnail' },
        isFeatured: false,
        merchandisingMetadata: { badge: 'Daily Wear', displayOrder: 6, themeTone: 'gold' }
      },
      {
        name: 'Dravidian Temple Antique',
        slug: 'temple-antique',
        tagline: 'Sacred nakshi repoussé sculptures in 22K bullion',
        story: 'Handcrafted by hereditary master silversmiths depicting divine peacocks and florid arabesques.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Temple Antique Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Temple Antique Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Temple Art', displayOrder: 7, themeTone: 'antique' }
      },
      {
        name: 'The Nizam Treasures',
        slug: 'nizam-treasures',
        tagline: 'Basra pearls, Colombian emeralds, and uncut jewels',
        story: 'Inspired by the storied jewel vaults of Hyderabad with cabochon emeralds and natural pearls.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Nizam Treasures Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Nizam Treasures Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Royal Vault', displayOrder: 8, themeTone: 'emerald' }
      },
      {
        name: 'Platinum Sovereign',
        slug: 'platinum-sovereign',
        tagline: 'Pure 950 Platinum for timeless permanence',
        story: 'Hypoallergenic, dense, and naturally white bullion forged into sovereign heirloom pieces.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Platinum Sovereign Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Platinum Sovereign Thumbnail' },
        isFeatured: false,
        merchandisingMetadata: { badge: 'Pure PT950', displayOrder: 9, themeTone: 'platinum' }
      },
      {
        name: 'Mughal Jadau & Meenakari',
        slug: 'mughal-jadau',
        tagline: 'Imperial gold foil settings with 800°C miniature enameling',
        story: 'Intricate reverse-side craftsmanship featuring floral miniatures visible only to the wearer.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Mughal Jadau Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Mughal Jadau Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Atelier Enamel', displayOrder: 10, themeTone: 'gold' }
      },
      {
        name: 'Festive Radiance',
        slug: 'festive-radiance',
        tagline: 'Diwali and celebratory luxury creations',
        story: 'Luminous gold and diamond suites crafted to illuminate grand milestone festivities.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Festive Radiance Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Festive Radiance Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Diwali 2026', displayOrder: 11, themeTone: 'gold' }
      },
      {
        name: 'Everyday Luxury Atelier',
        slug: 'everyday-luxury',
        tagline: 'Stackable rings and delicate necklaces for daily grace',
        story: 'Fine jewellery created to be lived in effortlessly from morning meetings to evening galas.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Everyday Luxury Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Everyday Luxury Thumbnail' },
        isFeatured: false,
        merchandisingMetadata: { badge: 'Modern Classics', displayOrder: 12, themeTone: 'gold' }
      },
      {
        name: 'The Connoisseur Gentleman',
        slug: 'connoisseur-gentleman',
        tagline: 'Sovereign accessories for discerning men',
        story: 'Solid platinum and 18K gold cufflinks, signet bands, and ceremonial buttons.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Connoisseur Gentleman Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Connoisseur Gentleman Thumbnail' },
        isFeatured: false,
        merchandisingMetadata: { badge: 'Mens Vault', displayOrder: 13, themeTone: 'platinum' }
      },
      {
        name: 'The Ultra-Exclusive Vault',
        slug: 'ultra-exclusive-vault',
        tagline: 'Numbered limited editions produced in single-digit quantities',
        story: 'The apex of high jewellery art where each piece is archived with a sovereign deed of provenance.',
        bannerImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Ultra Exclusive Vault Hero Banner' },
        thumbnailImage: { ...SEED_PLACEHOLDER_IMAGE, alt: 'Ultra Exclusive Vault Thumbnail' },
        isFeatured: true,
        merchandisingMetadata: { badge: 'Numbered Masterpiece', displayOrder: 14, themeTone: 'vault' }
      }
    ];

    const collectionMap = {};
    for (const col of collectionsData) {
      const doc = await Collection.findOneAndUpdate(
        { slug: col.slug },
        {
          $set: {
            name: col.name,
            tagline: col.tagline,
            story: col.story,
            bannerImage: col.bannerImage,
            thumbnailImage: col.thumbnailImage,
            status: 'ACTIVE',
            isFeatured: col.isFeatured,
            merchandisingMetadata: col.merchandisingMetadata,
            startDate: CAMPAIGN_START,
            endDate: EXTENDED_END
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      collectionMap[col.slug] = doc;
    }
    logger.info(`✓ Successfully seeded ${Object.keys(collectionMap).length} Collections.`);

    // =========================================================================
    // 4. SEED PRODUCTS & VARIANTS (40 Distinct Products with 2-3 Variants each)
    // =========================================================================
    logger.info('💍 Seeding 40 Coherent Products & Variants...');

    const productsSeedData = [
      // 1. Imperial Choker
      {
        title: 'The Noor-e-Jahan Emerald & Polki Choker',
        slug: 'noor-e-jahan-emerald-polki-choker',
        sku: 'AV-CHOK-001',
        subtitle: 'Articulated 22K gold choker with Zambian emeralds and uncut Golconda polki',
        shortDescription: 'Masterpiece bridal choker set with foil-cradled raw polki and natural unheated emerald drops.',
        description: 'Forged across 340 bench hours by master karigars in Jaipur. Each uncut diamond is cushioned in 24K pure gold foil, finished with traditional floral Meenakari enameling on the reverse side.',
        categorySlug: 'necklaces-chokers',
        collectionSlugs: ['royal-rajputana', 'imperial-bridal'],
        occasion: 'BRIDAL',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'YELLOW_GOLD',
          primaryPurity: '22K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 42.5, clarity: 'VVS-VS', colorGrade: 'G-H', cutGrade: 'Polki Uncut' },
          hasGemstones: true,
          gemstoneTypes: ['Zambian Emeralds', 'Natural Pearls']
        },
        pricing: {
          baseMetalPricePaise: 185000000, // ₹18,50,000
          diamondStonePricePaise: 85000000,
          makingChargesPaise: 25000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        isBestseller: true,
        isLimitedEdition: true,
        limitedEditionDetails: {
          editionName: 'Imperial Nizam Heritage',
          totalEditionQuantity: 7,
          remainingStock: 3,
          availabilityWindow: { startAt: CAMPAIGN_START, endAt: CAMPAIGN_END },
          exclusiveLabel: 'Vault Masterpiece 03/07'
        },
        variants: [
          {
            variantName: '22K Gold • Standard 15-inch Articulated Fit',
            sku: 'AV-CHOK-001-V1',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: '15-inch Collar',
            grossWeightGrams: 168.4,
            netGoldWeightGrams: 125.0,
            diamondWeightCarat: 42.5,
            priceInPaise: 295000000, // ₹29,50,000
            inventoryCount: 2,
            reservedCount: 0
          },
          {
            variantName: '22K Gold • Extended 16.5-inch Regal Fit',
            sku: 'AV-CHOK-001-V2',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: '16.5-inch Collar',
            grossWeightGrams: 182.0,
            netGoldWeightGrams: 138.5,
            diamondWeightCarat: 46.0,
            priceInPaise: 325000000,
            inventoryCount: 1,
            reservedCount: 0
          }
        ]
      },
      // 2. Empress Solitaire Ring
      {
        title: 'The Empress 5.12ct Solitaire Diamond Ring',
        slug: 'empress-solitaire-diamond-ring',
        sku: 'AV-RING-001',
        subtitle: 'GIA Certified 5.12ct D-Flawless round brilliant in pure 950 Platinum',
        shortDescription: 'The pinnacle of diamond purity with micro-pave shoulders and sovereign setting.',
        description: 'Hand-sculpted in dense 950 Platinum with a knife-edge cathedral setting engineered to flood the pavilion with ambient light.',
        categorySlug: 'rings-solitaires',
        collectionSlugs: ['solitaire-grandeur', 'ultra-exclusive-vault'],
        occasion: 'BRIDAL',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'PLATINUM',
          primaryPurity: '950_PLAT',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 5.12, clarity: 'IF', colorGrade: 'D', cutGrade: 'Excellent' },
          hasGemstones: false,
          gemstoneTypes: []
        },
        pricing: {
          baseMetalPricePaise: 65000000,
          diamondStonePricePaise: 320000000,
          makingChargesPaise: 15000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        isLimitedEdition: true,
        limitedEditionDetails: {
          editionName: 'GIA Type IIa Reserve',
          totalEditionQuantity: 5,
          remainingStock: 2,
          availabilityWindow: { startAt: CAMPAIGN_START, endAt: CAMPAIGN_END },
          exclusiveLabel: 'Private Reserve 02/05'
        },
        variants: [
          {
            variantName: '950 Platinum • US Size 6 (India 12)',
            sku: 'AV-RING-001-V1',
            metalType: 'PLATINUM',
            metalPurity: '950_PLAT',
            size: 'Size 12',
            grossWeightGrams: 9.8,
            netGoldWeightGrams: 8.8,
            diamondWeightCarat: 5.12,
            priceInPaise: 400000000,
            inventoryCount: 1,
            reservedCount: 0
          },
          {
            variantName: '950 Platinum • US Size 7 (India 14)',
            sku: 'AV-RING-001-V2',
            metalType: 'PLATINUM',
            metalPurity: '950_PLAT',
            size: 'Size 14',
            grossWeightGrams: 10.4,
            netGoldWeightGrams: 9.4,
            diamondWeightCarat: 5.12,
            priceInPaise: 400000000,
            inventoryCount: 1,
            reservedCount: 0
          }
        ]
      },
      // 3. Peacock Nakshi Kada
      {
        title: 'The Padmavati Peacock Nakshi Gold Kada',
        slug: 'padmavati-peacock-nakshi-gold-kada',
        sku: 'AV-KADA-001',
        subtitle: 'Heritage 22K gold temple repoussé bangles with unheated Burmese rubies',
        shortDescription: 'Solid 22K bullion sculpted with dancing peacocks and concealed screw clasps.',
        description: 'Dravidian temple architecture immortalized in 22K sovereign yellow gold with cabochon ruby plumage and antique finish.',
        categorySlug: 'bangles-kadas',
        collectionSlugs: ['temple-antique', 'royal-rajputana'],
        occasion: 'HERITAGE',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'YELLOW_GOLD',
          primaryPurity: '22K',
          hasDiamonds: false,
          hasGemstones: true,
          gemstoneTypes: ['Burmese Rubies']
        },
        pricing: {
          baseMetalPricePaise: 95000000,
          diamondStonePricePaise: 18000000,
          makingChargesPaise: 12000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        isLimitedEdition: true,
        limitedEditionDetails: {
          editionName: 'Temple Archive Series',
          totalEditionQuantity: 10,
          remainingStock: 4,
          availabilityWindow: { startAt: CAMPAIGN_START, endAt: CAMPAIGN_END },
          exclusiveLabel: 'Archival Masterwork'
        },
        variants: [
          {
            variantName: '22K Gold • Size 2.4 (Small/Medium Wrist)',
            sku: 'AV-KADA-001-V1',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: '2.4 Bangle Size',
            grossWeightGrams: 112.5,
            netGoldWeightGrams: 104.0,
            diamondWeightCarat: 0,
            priceInPaise: 125000000,
            inventoryCount: 2,
            reservedCount: 0
          },
          {
            variantName: '22K Gold • Size 2.6 (Medium/Large Wrist)',
            sku: 'AV-KADA-001-V2',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: '2.6 Bangle Size',
            grossWeightGrams: 118.0,
            netGoldWeightGrams: 109.5,
            diamondWeightCarat: 0,
            priceInPaise: 132000000,
            inventoryCount: 2,
            reservedCount: 0
          }
        ]
      },
      // 4. Nizam Emerald & Basra Pearl Haar
      {
        title: 'The Nizam Basra Pearl & Emerald Haar',
        slug: 'nizam-basra-pearl-emerald-haar',
        sku: 'AV-HAAR-001',
        subtitle: 'Five-string natural Basra pearl necklace with carved Zambian emerald pendant',
        shortDescription: 'Historic royal layering haar set with graduated Basra pearls and certified emeralds.',
        description: 'Featuring 180 carats of natural graduated pearls strung with 24K gold foil beads and an articulated central polki pendant.',
        categorySlug: 'necklaces-chokers',
        collectionSlugs: ['nizam-treasures', 'ultra-exclusive-vault'],
        occasion: 'HERITAGE',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'YELLOW_GOLD',
          primaryPurity: '22K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 18.5, clarity: 'VVS', colorGrade: 'F-G', cutGrade: 'Polki' },
          hasGemstones: true,
          gemstoneTypes: ['Natural Basra Pearls', 'Carved Zambian Emeralds']
        },
        pricing: {
          baseMetalPricePaise: 120000000,
          diamondStonePricePaise: 150000000,
          makingChargesPaise: 25000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        isLimitedEdition: true,
        limitedEditionDetails: {
          editionName: 'Nizam Vault Archive',
          totalEditionQuantity: 3,
          remainingStock: 1,
          availabilityWindow: { startAt: CAMPAIGN_START, endAt: CAMPAIGN_END },
          exclusiveLabel: 'Historic Vault 01/03'
        },
        variants: [
          {
            variantName: '22K Gold & Natural Basra Pearls • 24-inch Regal Haar',
            sku: 'AV-HAAR-001-V1',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: '24-inch Haar',
            grossWeightGrams: 210.0,
            netGoldWeightGrams: 85.0,
            diamondWeightCarat: 18.5,
            priceInPaise: 295000000,
            inventoryCount: 1,
            reservedCount: 0
          }
        ]
      },
      // 5. Contemporary Solitaire Diamond Pendant
      {
        title: 'The Astral Solitaire Floating Pendant',
        slug: 'astral-solitaire-floating-pendant',
        sku: 'AV-PEND-001',
        subtitle: '1.50ct GIA Diamond floating in 18K White Gold bezel setting',
        shortDescription: 'Modern minimalist diamond pendant suspended on an articulated Italian wheat chain.',
        description: 'Engineered for seamless everyday luxury with zero prong snags and maximum light performance.',
        categorySlug: 'pendants',
        collectionSlugs: ['contemporary-gold', 'everyday-luxury'],
        occasion: 'EVERYDAY_LUXURY',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'WHITE_GOLD',
          primaryPurity: '18K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 1.5, clarity: 'VVS1', colorGrade: 'E', cutGrade: 'Excellent' },
          hasGemstones: false,
          gemstoneTypes: []
        },
        pricing: {
          baseMetalPricePaise: 18000000,
          diamondStonePricePaise: 65000000,
          makingChargesPaise: 7000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: false,
        variants: [
          {
            variantName: '18K White Gold • 16-inch Chain',
            sku: 'AV-PEND-001-V1',
            metalType: 'WHITE_GOLD',
            metalPurity: '18K',
            size: '16-inch Chain',
            grossWeightGrams: 5.2,
            netGoldWeightGrams: 4.9,
            diamondWeightCarat: 1.5,
            priceInPaise: 90000000,
            inventoryCount: 5,
            reservedCount: 0
          },
          {
            variantName: '18K Yellow Gold • 18-inch Chain',
            sku: 'AV-PEND-001-V2',
            metalType: 'YELLOW_GOLD',
            metalPurity: '18K',
            size: '18-inch Chain',
            grossWeightGrams: 5.8,
            netGoldWeightGrams: 5.5,
            diamondWeightCarat: 1.5,
            priceInPaise: 92000000,
            inventoryCount: 4,
            reservedCount: 0
          }
        ]
      },
      // 6. Royal Chandbali Earrings
      {
        title: 'The Jodha Bai Polki Chandbalis',
        slug: 'jodha-bai-polki-chandbalis',
        sku: 'AV-EAR-001',
        subtitle: '22K yellow gold crescent earrings with pearl tassels and uncut diamonds',
        shortDescription: 'Iconic royal crescent drops featuring Golconda polki and delicate seed pearl fringes.',
        description: 'Articulated three-tiered chandbalis with rear enameling designed for weight balance and comfort.',
        categorySlug: 'earrings',
        collectionSlugs: ['royal-rajputana', 'festive-radiance'],
        occasion: 'BRIDAL',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'YELLOW_GOLD',
          primaryPurity: '22K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 8.4, clarity: 'VVS', colorGrade: 'G', cutGrade: 'Polki' },
          hasGemstones: true,
          gemstoneTypes: ['Natural Seed Pearls', 'Zambian Emerald Beads']
        },
        pricing: {
          baseMetalPricePaise: 38000000,
          diamondStonePricePaise: 28000000,
          makingChargesPaise: 12000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        variants: [
          {
            variantName: '22K Yellow Gold • Sovereign Screw Back',
            sku: 'AV-EAR-001-V1',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: 'Standard 2.5-inch Drop',
            grossWeightGrams: 42.8,
            netGoldWeightGrams: 34.0,
            diamondWeightCarat: 8.4,
            priceInPaise: 78000000,
            inventoryCount: 3,
            reservedCount: 0
          }
        ]
      },
      // 7. Tennis Diamond Bracelet
      {
        title: 'The Sovereign Eternity Tennis Bracelet',
        slug: 'sovereign-eternity-tennis-bracelet',
        sku: 'AV-BRAC-001',
        subtitle: '10.50 Carats of round brilliant diamonds in 18K White Gold',
        shortDescription: 'Uniform F-Color VVS diamonds set in a continuous four-prong articulated gallery.',
        description: 'Precision engineered with a double-safety concealed box clasp and silky articulation.',
        categorySlug: 'bracelets',
        collectionSlugs: ['solitaire-grandeur', 'contemporary-gold'],
        occasion: 'COCKTAIL',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'WHITE_GOLD',
          primaryPurity: '18K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 10.5, clarity: 'VVS', colorGrade: 'F', cutGrade: 'Excellent' },
          hasGemstones: false,
          gemstoneTypes: []
        },
        pricing: {
          baseMetalPricePaise: 45000000,
          diamondStonePricePaise: 140000000,
          makingChargesPaise: 15000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        variants: [
          {
            variantName: '18K White Gold • 7.0-inch Length',
            sku: 'AV-BRAC-001-V1',
            metalType: 'WHITE_GOLD',
            metalPurity: '18K',
            size: '7.0-inch Wrist',
            grossWeightGrams: 18.2,
            netGoldWeightGrams: 16.1,
            diamondWeightCarat: 10.5,
            priceInPaise: 200000000,
            inventoryCount: 3,
            reservedCount: 0
          },
          {
            variantName: '18K Yellow Gold • 7.5-inch Length',
            sku: 'AV-BRAC-001-V2',
            metalType: 'YELLOW_GOLD',
            metalPurity: '18K',
            size: '7.5-inch Wrist',
            grossWeightGrams: 19.5,
            netGoldWeightGrams: 17.4,
            diamondWeightCarat: 11.2,
            priceInPaise: 215000000,
            inventoryCount: 2,
            reservedCount: 0
          }
        ]
      },
      // 8. Mens Platinum Cufflinks
      {
        title: 'The Connoisseur Platinum & Diamond Cufflinks',
        slug: 'connoisseur-platinum-diamond-cufflinks',
        sku: 'AV-MEN-001',
        subtitle: 'Solid 950 Platinum octagonal cufflinks with baguette diamond channels',
        shortDescription: 'Refined masculine luxury for formal black-tie and royal ceremonial attire.',
        description: 'Forged from dense 950 Platinum bullion with bevelled chamfer edges and custom swivel fastenings.',
        categorySlug: 'mens-jewellery',
        collectionSlugs: ['connoisseur-gentleman', 'platinum-sovereign'],
        occasion: 'COCKTAIL',
        gender: 'MEN',
        materialOverview: {
          primaryMetal: 'PLATINUM',
          primaryPurity: '950_PLAT',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 2.2, clarity: 'VVS', colorGrade: 'E-F', cutGrade: 'Baguette' },
          hasGemstones: false,
          gemstoneTypes: []
        },
        pricing: {
          baseMetalPricePaise: 32000000,
          diamondStonePricePaise: 22000000,
          makingChargesPaise: 8000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: false,
        variants: [
          {
            variantName: '950 Platinum • Octagonal Classic',
            sku: 'AV-MEN-001-V1',
            metalType: 'PLATINUM',
            metalPurity: '950_PLAT',
            size: '16mm Face',
            grossWeightGrams: 24.5,
            netGoldWeightGrams: 24.0,
            diamondWeightCarat: 2.2,
            priceInPaise: 62000000,
            inventoryCount: 4,
            reservedCount: 0
          }
        ]
      },
      // 9. Royal Maang Tikka
      {
        title: 'The Chandrakala Jadau Maang Tikka',
        slug: 'chandrakala-jadau-maang-tikka',
        sku: 'AV-TIK-001',
        subtitle: '22K yellow gold bridal forehead jewel with polki and south sea pearl',
        shortDescription: 'Traditional Rajasthani circular crest set with uncut diamonds and red meenakari.',
        description: 'Designed to drape gracefully along the hair parting with an adjustable pearl chain.',
        categorySlug: 'ceremonial-headpieces',
        collectionSlugs: ['imperial-bridal', 'mughal-jadau'],
        occasion: 'BRIDAL',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'YELLOW_GOLD',
          primaryPurity: '22K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 4.8, clarity: 'VVS', colorGrade: 'G', cutGrade: 'Polki' },
          hasGemstones: true,
          gemstoneTypes: ['South Sea Pearl', 'Natural Spinel']
        },
        pricing: {
          baseMetalPricePaise: 24000000,
          diamondStonePricePaise: 16000000,
          makingChargesPaise: 8000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: false,
        variants: [
          {
            variantName: '22K Gold • Standard Bridal Chain',
            sku: 'AV-TIK-001-V1',
            metalType: 'YELLOW_GOLD',
            metalPurity: '22K',
            size: 'One Size Forehead Fitting',
            grossWeightGrams: 28.0,
            netGoldWeightGrams: 22.5,
            diamondWeightCarat: 4.8,
            priceInPaise: 48000000,
            inventoryCount: 3,
            reservedCount: 0
          }
        ]
      },
      // 10. Minimalist Gold Mangalsutra
      {
        title: 'The Ananya Diamond Arc Mangalsutra',
        slug: 'ananya-diamond-arc-mangalsutra',
        sku: 'AV-MANG-001',
        subtitle: '18K Yellow Gold curved diamond bar with auspicious black onyx beads',
        shortDescription: 'Contemporary reinvention of the sacred symbol with a floating diamond arc.',
        description: 'Engineered for seamless western and traditional styling with laser-drilled diamonds.',
        categorySlug: 'mangalsutras',
        collectionSlugs: ['contemporary-gold', 'everyday-luxury'],
        occasion: 'EVERYDAY_LUXURY',
        gender: 'WOMEN',
        materialOverview: {
          primaryMetal: 'YELLOW_GOLD',
          primaryPurity: '18K',
          hasDiamonds: true,
          diamondDetails: { caratWeight: 0.85, clarity: 'VS', colorGrade: 'G-H', cutGrade: 'Brilliant' },
          hasGemstones: true,
          gemstoneTypes: ['Auspicious Black Beads']
        },
        pricing: {
          baseMetalPricePaise: 14000000,
          diamondStonePricePaise: 11000000,
          makingChargesPaise: 5000000,
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: true,
        isBestseller: true,
        variants: [
          {
            variantName: '18K Yellow Gold • 16-inch Chain',
            sku: 'AV-MANG-001-V1',
            metalType: 'YELLOW_GOLD',
            metalPurity: '18K',
            size: '16-inch Length',
            grossWeightGrams: 6.8,
            netGoldWeightGrams: 6.1,
            diamondWeightCarat: 0.85,
            priceInPaise: 30000000,
            inventoryCount: 6,
            reservedCount: 0
          },
          {
            variantName: '18K Rose Gold • 18-inch Chain',
            sku: 'AV-MANG-001-V2',
            metalType: 'ROSE_GOLD',
            metalPurity: '18K',
            size: '18-inch Length',
            grossWeightGrams: 7.2,
            netGoldWeightGrams: 6.5,
            diamondWeightCarat: 0.85,
            priceInPaise: 32000000,
            inventoryCount: 4,
            reservedCount: 0
          }
        ]
      }
    ];

    // Expand generator for additional 30 catalog products to ensure rich breadth across categories
    const metalPurityMatrix = [
      { metal: 'YELLOW_GOLD', purity: '22K' },
      { metal: 'YELLOW_GOLD', purity: '18K' },
      { metal: 'ROSE_GOLD', purity: '18K' },
      { metal: 'WHITE_GOLD', purity: '18K' },
      { metal: 'PLATINUM', purity: '950_PLAT' }
    ];

    const catalogPrefixes = [
      { name: 'Imperial Solitaire Diamond Band', cat: 'rings-solitaires', col: 'solitaire-grandeur', type: 'RING' },
      { name: 'Heritage Nakshi Gold Choker', cat: 'necklaces-chokers', col: 'temple-antique', type: 'CHOK' },
      { name: 'Royal Polki Cascade Earrings', cat: 'earrings', col: 'royal-rajputana', type: 'EAR' },
      { name: 'Sovereign Diamond Kada Pair', cat: 'bangles-kadas', col: 'festive-radiance', type: 'KADA' },
      { name: 'Rose Gold Floral Pendant', cat: 'pendants', col: 'champagne-rose', type: 'PEND' },
      { name: 'Royal Jadau Diamond Nath', cat: 'nose-pins', col: 'imperial-bridal', type: 'NATH' },
      { name: 'Mens Sovereign Signet Ring', cat: 'mens-jewellery', col: 'connoisseur-gentleman', type: 'MRING' },
      { name: 'Matha Patti Bridal Coronet', cat: 'ceremonial-headpieces', col: 'imperial-bridal', type: 'HEAD' },
      { name: 'Tennis Diamond Choker 12ct', cat: 'necklaces-chokers', col: 'solitaire-grandeur', type: 'CHOK' },
      { name: 'Golconda Polki Drop Earrings', cat: 'earrings', col: 'golconda-vault', type: 'EAR' },
      { name: 'Contemporary 18K Stackable Ring', cat: 'rings-solitaires', col: 'everyday-luxury', type: 'RING' },
      { name: 'Diamond Link Tennis Bracelet', cat: 'bracelets', col: 'contemporary-gold', type: 'BRAC' },
      { name: 'Nizam Emerald Cocktail Ring', cat: 'rings-solitaires', col: 'nizam-treasures', type: 'RING' },
      { name: 'Festive Meenakari Gold Jhumkas', cat: 'earrings', col: 'mughal-jadau', type: 'EAR' },
      { name: 'Sovereign Bullion Kada 100g', cat: 'bangles-kadas', col: 'temple-antique', type: 'KADA' },
      { name: 'Diamond Drop Solitaire Mangalsutra', cat: 'mangalsutras', col: 'contemporary-gold', type: 'MANG' },
      { name: 'Rose Gold Diamond Bangle', cat: 'bangles-kadas', col: 'champagne-rose', type: 'KADA' },
      { name: 'Platinum Solitaire Engagement Ring', cat: 'haute-solitaires', col: 'solitaire-grandeur', type: 'SOL' },
      { name: 'Imperial Jadau Bridal Haar Suite', cat: 'bridal-sets', col: 'imperial-bridal', type: 'SET' },
      { name: 'Artisan Emerald Diamond Brooch', cat: 'mens-jewellery', col: 'nizam-treasures', type: 'BROOCH' },
      { name: 'Flawless 3ct Diamond Solitaire Ring', cat: 'haute-solitaires', col: 'solitaire-grandeur', type: 'SOL' },
      { name: 'Contemporary Rose Gold Diamond Hoops', cat: 'earrings', col: 'champagne-rose', type: 'EAR' },
      { name: 'Traditional South Indian Vanki Armlet', cat: 'bangles-kadas', col: 'temple-antique', type: 'ARM' },
      { name: 'Solitaire Diamond Nose Stud', cat: 'nose-pins', col: 'everyday-luxury', type: 'NOSE' },
      { name: 'Imperial Polki Passa Hair Ornament', cat: 'ceremonial-headpieces', col: 'royal-rajputana', type: 'HEAD' },
      { name: 'Solid 22K Gold Chain 50g', cat: 'necklaces-chokers', col: 'contemporary-gold', type: 'CHAIN' },
      { name: 'Zambian Emerald Cocktail Ring', cat: 'rings-solitaires', col: 'nizam-treasures', type: 'RING' },
      { name: 'Sovereign Platinum Wedding Band', cat: 'rings-solitaires', col: 'platinum-sovereign', type: 'RING' },
      { name: 'Diamond Tennis Anklet Suite', cat: 'bracelets', col: 'everyday-luxury', type: 'ANK' },
      { name: 'Royal Heritage Meenakari Sherwani Buttons', cat: 'mens-jewellery', col: 'royal-rajputana', type: 'MBTN' }
    ];

    let prodIndex = 11;
    for (const item of catalogPrefixes) {
      const sku = `AV-${item.type}-${String(prodIndex).padStart(3, '0')}`;
      const slug = `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(prodIndex).padStart(3, '0')}`;
      const pair = metalPurityMatrix[(prodIndex - 11) % metalPurityMatrix.length];
      const basePrice = (250000 + (prodIndex * 35000)) * 100; // in paise

      productsSeedData.push({
        title: item.name,
        slug,
        sku,
        subtitle: `AUREVÉ Fine Creation in ${pair.purity} ${pair.metal.replace('_', ' ')}`,
        shortDescription: `Artisanal masterpiece hallmarked with BIS 916 / 750 sovereign stamp.`,
        description: `Individually forged in the master ateliers of AUREVÉ. Featuring precision stone settings, hand-burnished surfaces, and sovereign archival hallmarks.`,
        categorySlug: item.cat,
        collectionSlugs: [item.col],
        occasion: prodIndex % 3 === 0 ? 'BRIDAL' : prodIndex % 2 === 0 ? 'COCKTAIL' : 'EVERYDAY_LUXURY',
        gender: item.cat === 'mens-jewellery' ? 'MEN' : 'WOMEN',
        materialOverview: {
          primaryMetal: pair.metal,
          primaryPurity: pair.purity,
          hasDiamonds: true,
          diamondDetails: { caratWeight: 1.25 + (prodIndex * 0.1), clarity: 'VVS-VS', colorGrade: 'G-H', cutGrade: 'Excellent' },
          hasGemstones: prodIndex % 2 === 0,
          gemstoneTypes: prodIndex % 2 === 0 ? ['Natural Rubies', 'Emeralds'] : []
        },
        pricing: {
          baseMetalPricePaise: Math.round(basePrice * 0.6),
          diamondStonePricePaise: Math.round(basePrice * 0.3),
          makingChargesPaise: Math.round(basePrice * 0.1),
          discountPricePaise: null,
          gstRate: 3
        },
        isFeatured: prodIndex % 4 === 0,
        isBestseller: prodIndex % 5 === 0,
        isLimitedEdition: false,
        variants: [
          {
            variantName: `${pair.purity} ${pair.metal.replace('_', ' ')} • Standard Fit`,
            sku: `${sku}-V1`,
            metalType: pair.metal,
            metalPurity: pair.purity,
            size: 'Standard Size',
            grossWeightGrams: 14.5 + prodIndex,
            netGoldWeightGrams: 12.0 + prodIndex,
            diamondWeightCarat: 1.2,
            priceInPaise: basePrice,
            inventoryCount: 3,
            reservedCount: 0
          },
          {
            variantName: `${pair.purity} ${pair.metal.replace('_', ' ')} • Bespoke Atelier Fit`,
            sku: `${sku}-V2`,
            metalType: pair.metal,
            metalPurity: pair.purity,
            size: 'Comfort Contour Size',
            grossWeightGrams: 16.0 + prodIndex,
            netGoldWeightGrams: 13.5 + prodIndex,
            diamondWeightCarat: 1.4,
            priceInPaise: Math.round(basePrice * 1.1),
            inventoryCount: 2,
            reservedCount: 0
          }
        ]
      });
      prodIndex++;
    }

    const seededProducts = [];
    for (const pData of productsSeedData) {
      const categoryDoc = categoryMap[pData.categorySlug] || Object.values(categoryMap)[0];
      const collectionDocs = pData.collectionSlugs.map((slug) => collectionMap[slug]).filter(Boolean);

      const productDoc = await Product.findOneAndUpdate(
        { sku: pData.sku },
        {
          $set: {
            title: pData.title,
            slug: pData.slug,
            sku: pData.sku,
            subtitle: pData.subtitle,
            shortDescription: pData.shortDescription,
            description: pData.description,
            story: pData.description,
            careInstructions: 'Store in AUREVÉ velvet box. Clean with soft chamois cloth. Avoid perfumes and direct chemical sprays.',
            materialInformation: `Hallmarked ${pData.materialOverview.primaryPurity} ${pData.materialOverview.primaryMetal.replace('_', ' ')}`,
            categoryId: categoryDoc._id,
            collectionIds: collectionDocs.map((c) => c._id),
            tags: [pData.categorySlug, ...pData.collectionSlugs, 'aureve', 'luxury', 'jewellery'],
            gender: pData.gender,
            occasion: pData.occasion,
            availability: 'IN_STOCK',
            hallmarking: {
              bisHallmarked: true,
              huidNumber: `AV${Math.floor(1000 + Math.random() * 9000)}`,
              certification: 'BIS_GOVT',
              certificateNumber: `BIS-IN-${pData.sku}`
            },
            materialOverview: pData.materialOverview,
            pricing: pData.pricing,
            isNewArrival: true,
            isBestseller: pData.isBestseller || false,
            isFeatured: pData.isFeatured || false,
            isLimitedEdition: pData.isLimitedEdition || false,
            limitedEditionDetails: pData.limitedEditionDetails || {
              editionName: '',
              totalEditionQuantity: 0,
              remainingStock: 0,
              availabilityWindow: { startAt: null, endAt: null },
              exclusiveLabel: ''
            },
            images: [
              {
                url: SEED_PLACEHOLDER_IMAGE.url,
                publicId: `aureve_seed_catalog/products/${pData.sku.toLowerCase()}_primary`,
                alt: `${pData.title} Primary View`,
                isPrimary: true,
                displayOrder: 0
              },
              {
                url: SEED_PLACEHOLDER_IMAGE.url,
                publicId: `aureve_seed_catalog/products/${pData.sku.toLowerCase()}_angle`,
                alt: `${pData.title} Atelier Angle View`,
                isPrimary: false,
                displayOrder: 1
              }
            ],
            videos: [SEED_PLACEHOLDER_VIDEO],
            status: 'PUBLISHED',
            seoMetadata: {
              metaTitle: `${pData.title} | AUREVÉ Haute Joaillerie`,
              metaDescription: pData.shortDescription,
              metaKeywords: ['aureve', pData.sku, pData.title.toLowerCase()]
            }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      seededProducts.push(productDoc);

      // Seed Product Variants
      for (const vData of pData.variants) {
        await ProductVariant.findOneAndUpdate(
          { sku: vData.sku },
          {
            $set: {
              productId: productDoc._id,
              variantName: vData.variantName,
              sku: vData.sku,
              metalType: vData.metalType,
              metalPurity: vData.metalPurity,
              size: vData.size,
              grossWeightGrams: vData.grossWeightGrams,
              netGoldWeightGrams: vData.netGoldWeightGrams,
              diamondWeightCarat: vData.diamondWeightCarat,
              priceInPaise: vData.priceInPaise,
              discountPriceInPaise: null,
              inventoryCount: vData.inventoryCount,
              reservedCount: vData.reservedCount,
              availability: 'AVAILABLE',
              isActive: true,
              variantSpecificMedia: [
                {
                  url: SEED_PLACEHOLDER_IMAGE.url,
                  publicId: `aureve_seed_catalog/variants/${vData.sku.toLowerCase()}`,
                  alt: `${vData.variantName} Detail`
                }
              ]
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }
    logger.info(`✓ Successfully seeded ${seededProducts.length} Products with all associated child variants.`);

    // =========================================================================
    // 5. SEED HOMEPAGE BANNERS (6 Luxury Campaign Banners)
    // =========================================================================
    logger.info('🎨 Seeding 6 Homepage Banners...');
    const bannersData = [
      {
        key: 'HERO_ROYAL_POLKI_DIWALI_2026',
        title: 'The Royal Diwali Atelier 2026',
        subtitle: 'Uncut Golconda Polki & 22K Sovereign Bullion',
        ctaText: 'Explore Imperial Suite',
        linkUrl: '/collections/royal-rajputana',
        placement: 'HERO_CAROUSEL',
        desktopMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_seed_banners/hero_diwali_desktop'
        },
        displayOrder: 1
      },
      {
        key: 'HERO_SOLITAIRE_GRANDEUR_2026',
        title: 'The Solitaire Grandeur',
        subtitle: 'D-Flawless GIA Certified Solitaires in Pure 950 Platinum',
        ctaText: 'Discover Solitaires',
        linkUrl: '/collections/solitaire-grandeur',
        placement: 'HERO_CAROUSEL',
        desktopMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_seed_banners/hero_solitaire_desktop'
        },
        displayOrder: 2
      },
      {
        key: 'HERO_IMPERIAL_BRIDAL_COUTURE_2026',
        title: 'Imperial Bridal Couture',
        subtitle: 'Ancestral Heirlooms Handcrafted for Sovereign Nuptials',
        ctaText: 'Book Private Viewing',
        linkUrl: '/collections/imperial-bridal',
        placement: 'HERO_CAROUSEL',
        desktopMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_seed_banners/hero_bridal_desktop'
        },
        displayOrder: 3
      },
      {
        key: 'EDITORIAL_GOLCONDA_SPOTLIGHT_2026',
        title: 'The Sacred Art of Kundan Jadau',
        subtitle: 'Generational Ustaads & 24K Gold Foil Burnishing',
        ctaText: 'Explore Atelier Craft',
        linkUrl: '/our-story',
        placement: 'EDITORIAL_SPOTLIGHT',
        desktopMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_seed_banners/editorial_kundan_desktop'
        },
        displayOrder: 4
      },
      {
        key: 'PROMO_FESTIVE_PRIVILEGE_2026',
        title: 'Diwali Privilege: 10% Connoisseur Courtesy',
        subtitle: 'Use code ROYALDIWALI2026 on bespoke heirlooms during October 2026',
        ctaText: 'View Privileges',
        linkUrl: '/collections/festive-radiance',
        placement: 'PROMOTIONAL_STRIP',
        desktopMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_seed_banners/promo_festive_strip'
        },
        displayOrder: 5
      },
      {
        key: 'HERITAGE_ATELIER_VAULT_2026',
        title: 'The Archival Vault Deeds',
        subtitle: 'Numbered masterworks catalogued with sovereign certificates',
        ctaText: 'Enter The Vault',
        linkUrl: '/collections/ultra-exclusive-vault',
        placement: 'HERITAGE_BANNER',
        desktopMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_seed_banners/heritage_vault_desktop'
        },
        displayOrder: 6
      }
    ];

    for (const b of bannersData) {
      await Banner.findOneAndUpdate(
        { key: b.key },
        {
          $set: {
            title: b.title,
            subtitle: b.subtitle,
            ctaText: b.ctaText,
            linkUrl: b.linkUrl,
            placement: b.placement,
            desktopMedia: b.desktopMedia,
            mobileMedia: b.desktopMedia,
            displayOrder: b.displayOrder,
            isActive: true,
            schedule: { startAt: CAMPAIGN_START, endAt: EXTENDED_END }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded 6 Homepage Banners.`);

    // =========================================================================
    // 6. SEED HOMEPAGE SECTIONS (5 Merchandising Sections)
    // =========================================================================
    logger.info('🏛️ Seeding 5 Homepage Merchandising Sections...');
    const sectionsData = [
      {
        key: 'HOME_SEC_IMPERIAL_BRIDAL_CAROUSEL',
        title: 'Imperial Bridal Trousseau',
        subtitle: 'Masterpiece ceremonial jewels forged for eternity',
        sectionType: 'CAROUSEL',
        displayOrder: 1,
        targetCollection: collectionMap['imperial-bridal']?._id,
        curatedProductIds: seededProducts.slice(0, 4).map((p) => p._id),
        settings: { autoplay: true, intervalSeconds: 5, itemsPerRow: 4, backgroundTone: 'ivory' }
      },
      {
        key: 'HOME_SEC_SOLITAIRE_GRANDEUR_GRID',
        title: 'Certified Haute Solitaires',
        subtitle: 'D-Flawless and Type IIa single-stone masterworks',
        sectionType: 'GRID',
        displayOrder: 2,
        targetCollection: collectionMap['solitaire-grandeur']?._id,
        curatedProductIds: seededProducts.slice(1, 5).map((p) => p._id),
        settings: { autoplay: false, intervalSeconds: 0, itemsPerRow: 4, backgroundTone: 'ivory' }
      },
      {
        key: 'HOME_SEC_ATELIER_CRAFTSMANSHIP',
        title: 'The Alchemy of Sovereign Gold',
        subtitle: 'Over 200 bench hours of generational Karigari',
        sectionType: 'EDITORIAL_FEATURE',
        displayOrder: 3,
        targetCategory: categoryMap['necklaces-chokers']?._id,
        curatedProductIds: seededProducts.slice(0, 2).map((p) => p._id),
        settings: { autoplay: false, intervalSeconds: 0, itemsPerRow: 2, backgroundTone: 'espresso' }
      },
      {
        key: 'HOME_SEC_CONTEMPORARY_GOLD_FEED',
        title: 'Contemporary 18K Daily Luxury',
        subtitle: 'Architectural silhouettes designed for modern elegance',
        sectionType: 'LOOKBOOK_FEED',
        displayOrder: 4,
        targetCollection: collectionMap['contemporary-gold']?._id,
        curatedProductIds: seededProducts.slice(4, 8).map((p) => p._id),
        settings: { autoplay: true, intervalSeconds: 4, itemsPerRow: 4, backgroundTone: 'pearl' }
      },
      {
        key: 'HOME_SEC_FESTIVE_RADIANCE_GRID',
        title: 'Festive Radiance Collection',
        subtitle: 'Diwali celebration sets crafted to illuminate milestones',
        sectionType: 'GRID',
        displayOrder: 5,
        targetCollection: collectionMap['festive-radiance']?._id,
        curatedProductIds: seededProducts.slice(2, 6).map((p) => p._id),
        settings: { autoplay: false, intervalSeconds: 0, itemsPerRow: 4, backgroundTone: 'ivory' }
      }
    ];

    for (const sec of sectionsData) {
      await HomepageSection.findOneAndUpdate(
        { key: sec.key },
        {
          $set: {
            title: sec.title,
            subtitle: sec.subtitle,
            sectionType: sec.sectionType,
            displayOrder: sec.displayOrder,
            targetCollection: sec.targetCollection || null,
            targetCategory: sec.targetCategory || null,
            curatedProductIds: sec.curatedProductIds || [],
            settings: sec.settings,
            isActive: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded 5 Homepage Sections.`);

    // =========================================================================
    // 7. SEED STORE LOCATIONS (4 Flagship Showroom Salons)
    // =========================================================================
    logger.info('🏰 Seeding 4 Luxury Showroom Salons...');
    const storesData = [
      {
        name: 'Mumbai Flagship Salon — Colaba',
        slug: 'mumbai-flagship-colaba',
        addressLine: 'The Heritage Arcade, Apollo Bunder, Colaba',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        phone: '+91 22 6900 1916',
        email: 'mumbai.salon@aureve.com',
        openingHours: { weekdays: '10:30 AM – 8:30 PM', weekends: '11:00 AM – 9:00 PM' },
        coordinates: { latitude: 18.922, longitude: 72.8347 },
        vipLoungeAvailable: true
      },
      {
        name: 'New Delhi Mehrauli Couture Flagship',
        slug: 'delhi-mehrauli-couture',
        addressLine: 'The Qutub Promenade, Kalka Das Marg, Mehrauli',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110030',
        phone: '+91 11 6800 1916',
        email: 'delhi.salon@aureve.com',
        openingHours: { weekdays: '11:00 AM – 8:00 PM', weekends: '11:00 AM – 9:00 PM' },
        coordinates: { latitude: 28.5244, longitude: 77.1855 },
        vipLoungeAvailable: true
      },
      {
        name: 'Bengaluru Lavelle Road VIP Suite',
        slug: 'bengaluru-lavelle-suite',
        addressLine: 'UB City Precinct, Lavelle Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        phone: '+91 80 6700 1916',
        email: 'bengaluru.salon@aureve.com',
        openingHours: { weekdays: '10:30 AM – 8:30 PM', weekends: '11:00 AM – 8:30 PM' },
        coordinates: { latitude: 12.9719, longitude: 77.5937 },
        vipLoungeAvailable: true
      },
      {
        name: 'Hyderabad Banjara Hills Palace Suite',
        slug: 'hyderabad-banjara-palace',
        addressLine: 'Road No. 10, Banjara Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500034',
        phone: '+91 40 6600 1916',
        email: 'hyderabad.salon@aureve.com',
        openingHours: { weekdays: '10:30 AM – 8:30 PM', weekends: '11:00 AM – 9:00 PM' },
        coordinates: { latitude: 17.4156, longitude: 78.435 },
        vipLoungeAvailable: true
      }
    ];

    for (const st of storesData) {
      await StoreLocation.findOneAndUpdate(
        { slug: st.slug },
        {
          $set: {
            name: st.name,
            addressLine: st.addressLine,
            city: st.city,
            state: st.state,
            postalCode: st.postalCode,
            phone: st.phone,
            email: st.email,
            openingHours: st.openingHours,
            coordinates: st.coordinates,
            vipLoungeAvailable: st.vipLoungeAvailable,
            isActive: true,
            appointmentConfig: {
              slotDurationMinutes: 60,
              capacityPerSlot: 2,
              openingHour: 10,
              closingHour: 20,
              leadTimeHours: 2,
              cancellationLeadTimeHours: 4,
              virtualEnabled: true,
              inStoreEnabled: true
            },
            images: [
              {
                url: SEED_PLACEHOLDER_IMAGE.url,
                publicId: `aureve_seed_stores/${st.slug}_façade`
              }
            ]
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded 4 Showroom Stores.`);

    // =========================================================================
    // 8. SEED PRIVILEGE COUPONS & OFFERS (October 2026 Reference)
    // =========================================================================
    logger.info('🏷️ Seeding Privilege Coupons & Festive Offers...');
    const couponsData = [
      {
        code: 'ROYALDIWALI2026',
        description: '10% Privilege Courtesy up to ₹25,000 during Diwali festivities in October 2026.',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValuePaise: 10000000, // ₹1,00,000
        maxDiscountLimitPaise: 2500000, // ₹25,000
        validFrom: CAMPAIGN_START,
        validUntil: CAMPAIGN_END,
        isActive: true
      },
      {
        code: 'AUREVEVIP2026',
        description: 'Flat ₹15,000 Courtesy on orders exceeding ₹1,50,000 for verified salon patrons.',
        discountType: 'FLAT_PAISE',
        discountValue: 1500000, // ₹15,000
        minOrderValuePaise: 15000000,
        maxDiscountLimitPaise: null,
        validFrom: CAMPAIGN_START,
        validUntil: EXTENDED_END,
        isActive: true
      },
      {
        code: 'SOLITAIRE5',
        description: '5% Diamond Value Privilege on certified solitaires above ₹2,00,000.',
        discountType: 'PERCENTAGE',
        discountValue: 5,
        minOrderValuePaise: 20000000,
        maxDiscountLimitPaise: 5000000,
        validFrom: CAMPAIGN_START,
        validUntil: EXTENDED_END,
        isActive: true
      },
      {
        code: 'FIRSTHEIRLOOM',
        description: 'Welcome Privilege of ₹5,000 on your first AUREVÉ acquisition.',
        discountType: 'FLAT_PAISE',
        discountValue: 500000,
        minOrderValuePaise: 5000000,
        maxDiscountLimitPaise: null,
        validFrom: CAMPAIGN_START,
        validUntil: new Date('2026-12-31T23:59:59.000Z'),
        isActive: true
      }
    ];

    for (const coup of couponsData) {
      await Coupon.findOneAndUpdate(
        { code: coup.code },
        {
          $set: {
            description: coup.description,
            discountType: coup.discountType,
            discountValue: coup.discountValue,
            minOrderValuePaise: coup.minOrderValuePaise,
            maxDiscountLimitPaise: coup.maxDiscountLimitPaise,
            validFrom: coup.validFrom,
            validUntil: coup.validUntil,
            isActive: coup.isActive,
            usageLimitPerUser: 1
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Resolve applicable collections, categories, and products for the two distinct offers
    const festiveCollection = collectionMap['festive-radiance'] || collectionMap['royal-rajputana'];
    const bridalCollection = collectionMap['imperial-bridal'] || collectionMap['royal-rajputana'];

    const festiveCategories = [
      categoryMap['necklaces-chokers']?._id,
      categoryMap['earrings']?._id,
      categoryMap['bangles-kadas']?._id
    ].filter(Boolean);

    const bridalCategories = [
      categoryMap['bridal-sets']?._id,
      categoryMap['necklaces-chokers']?._id
    ].filter(Boolean);

    const festiveProducts = seededProducts
      .filter((p) => p.collectionIds?.some((cId) => cId.toString() === festiveCollection?._id.toString()))
      .map((p) => p._id);

    const bridalProducts = seededProducts
      .filter((p) => p.collectionIds?.some((cId) => cId.toString() === bridalCollection?._id.toString()))
      .map((p) => p._id);

    const offersData = [
      {
        title: 'Diwali Festive Radiance Courtesy 2026',
        slug: 'diwali-radiance-2026',
        description: 'Enjoy 12% privilege on artisanal making charges across our entire festive catalogue.',
        discountType: 'PERCENTAGE',
        discountValue: 12,
        offerType: 'FESTIVAL',
        applicableCollections: festiveCollection ? [festiveCollection._id] : [],
        applicableCategories: festiveCategories,
        applicableProducts: festiveProducts.length > 0 ? festiveProducts.slice(0, 4) : seededProducts.slice(0, 3).map((p) => p._id),
        minOrderValuePaise: 5000000,
        maxDiscountPaise: 3000000,
        priority: 10,
        allowStackingWithCoupons: true,
        bannerUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1920&auto=format&fit=crop',
        startDate: CAMPAIGN_START,
        endDate: CAMPAIGN_END,
        isActive: true
      },
      {
        title: 'Imperial Bridal Trousseau Privilege',
        slug: 'bridal-privilege-2026',
        description: 'Complementary royal handover chest and GIA diamond consultation for bridal patrons.',
        discountType: 'PERCENTAGE',
        discountValue: 5,
        offerType: 'COLLECTION',
        applicableCollections: bridalCollection ? [bridalCollection._id] : [],
        applicableCategories: bridalCategories,
        applicableProducts: bridalProducts.length > 0 ? bridalProducts.slice(0, 4) : seededProducts.slice(3, 6).map((p) => p._id),
        minOrderValuePaise: 25000000,
        maxDiscountPaise: 10000000,
        priority: 20,
        allowStackingWithCoupons: true,
        bannerUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1920&auto=format&fit=crop',
        startDate: CAMPAIGN_START,
        endDate: EXTENDED_END,
        isActive: true
      }
    ];

    for (const off of offersData) {
      await Offer.findOneAndUpdate(
        { slug: off.slug },
        {
          $set: {
            title: off.title,
            slug: off.slug,
            description: off.description,
            discountType: off.discountType,
            discountValue: off.discountValue,
            offerType: off.offerType,
            applicableCollections: off.applicableCollections,
            applicableCategories: off.applicableCategories,
            applicableProducts: off.applicableProducts,
            minOrderValuePaise: off.minOrderValuePaise,
            maxDiscountPaise: off.maxDiscountPaise,
            priority: off.priority,
            allowStackingWithCoupons: off.allowStackingWithCoupons,
            bannerUrl: off.bannerUrl,
            startDate: off.startDate,
            endDate: off.endDate,
            isActive: off.isActive
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded 4 Coupons and 2 Complete Offers with real relations.`);

    // =========================================================================
    // 9. SEED DYNAMIC CMS PAGES (OUR_STORY & BESPOKE_SERVICES)
    // =========================================================================
    logger.info('📜 Seeding Dynamic CMS Page Content...');
    const cmsPages = [
      {
        pageKey: 'OUR_STORY',
        title: 'Jewels of Legacy. Handcrafted for Eternity.',
        subtitle: 'The Genesis of AUREVÉ',
        heroDescription: 'We do not merely forge jewellery; we enshrine ancestral lineage into gold and natural gemstones, crafting heirlooms destined to transcend generations.',
        heroMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_cms/our_story_hero',
          mediaType: 'IMAGE',
          alt: 'AUREVÉ Royal Atelier Genesis'
        },
        sections: [
          {
            sectionKey: 'royal_lineage',
            title: 'Born in the Royal Courts of India',
            subtitle: 'Chapter I — Imperial Provenance',
            description: 'Founded with a singular covenant: to resurrect the unhurried perfection of royal court jewelcraft. In an era of mass-stamped, hollowed alloy jewellery, AUREVÉ stands as an unapologetic citadel of genuine artisanal bullion.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 1,
            isPublished: true
          },
          {
            sectionKey: 'hallmark_sovereign',
            title: 'The Sovereign Hallmark Standard',
            subtitle: 'Chapter II — Metallurgical Purity',
            description: 'Every bullion bar is assayed via fire assay spectrometry. We laser-inscribe each piece with its official 6-digit alphanumeric HUID, certified on the national BIS database.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 2,
            isPublished: true
          },
          {
            sectionKey: 'atelier_craft',
            title: 'Master Karigari Hand-Forging',
            subtitle: 'Chapter III — The Sacred Ateliers',
            description: 'Over 200 bench hours of hand fabrication, foil setting, and 800°C miniature reverse-side Meenakari enameling without chemical adhesives.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 3,
            isPublished: true
          }
        ],
        cta: {
          title: 'Commission Your Family Heirloom',
          subtitle: 'Meet our Chief Jewellery Architect in a private salon suite.',
          buttonText: 'Book VIP Consultation',
          buttonLink: '/bespoke-services'
        },
        seo: {
          metaTitle: 'Our Story & Royal Heritage | AUREVÉ Haute Joaillerie',
          metaDescription: 'Discover the genesis, master artisans, and BIS 916 metallurgical integrity of AUREVÉ.'
        },
        isPublished: true
      },
      {
        pageKey: 'BESPOKE_SERVICES',
        title: 'The Bespoke Commission Atelier',
        subtitle: 'The Haute Joaillerie Atelier',
        heroDescription: 'Where your milestone, royal lineage, and individual vision are forged into immortal high jewellery by master artisans.',
        heroMedia: {
          url: SEED_PLACEHOLDER_IMAGE.url,
          publicId: 'aureve_cms/bespoke_hero',
          mediaType: 'IMAGE',
          alt: 'AUREVÉ Haute Joaillerie Bespoke Atelier'
        },
        sections: [
          {
            sectionKey: 'private_consultation',
            title: 'Private Design Consultation',
            subtitle: 'Stage 01 • 60–90 Minutes',
            description: 'Meet with our Chief Jewellery Architect in a private salon suite or via encrypted virtual viewing to explore anatomical moodboards and proportion studies.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 1,
            isPublished: true
          },
          {
            sectionKey: 'gemstone_sourcing',
            title: 'Rare Gemstone Sourcing',
            subtitle: 'Stage 02 • 7–14 Days',
            description: 'Our gemologists search the world’s most prestigious vaults to curate GIA D-Flawless solitaires, unheated Colombian emeralds, or Golconda polki.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 2,
            isPublished: true
          },
          {
            sectionKey: 'gouache_prototype',
            title: 'Gouache Painting & 3D Wax Prototype',
            subtitle: 'Stage 03 • 10–14 Days',
            description: 'Every contour is rendered in a lifesize watercolour gouache illustration, followed by a precise 3D wax prototype for tactile volume verification.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 3,
            isPublished: true
          },
          {
            sectionKey: 'master_karigari',
            title: 'Master Karigari Hand-Forging',
            subtitle: 'Stage 04 • 4–8 Weeks',
            description: 'Generational artisans invest over 200 bench hours into hand-forging, stone setting, and reverse-side Meenakari enameling without chemical adhesives.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 4,
            isPublished: true
          },
          {
            sectionKey: 'bis_handover',
            title: 'BIS Laser Hallmarking & Handover',
            subtitle: 'Stage 05 • Armored White-Glove Delivery',
            description: 'Official Bureau of Indian Standards (BIS 916) laser etching of its unique 6-digit HUID code, before private handover with GIA dossiers.',
            mediaUrl: SEED_PLACEHOLDER_IMAGE.url,
            mediaType: 'IMAGE',
            displayOrder: 5,
            isPublished: true
          }
        ],
        cta: {
          title: 'Initiate Your Bespoke Commission',
          subtitle: 'Our Senior Jewellery Architect personally reviews each commission proposal.',
          buttonText: 'Submit Commission Brief',
          buttonLink: '#commission-form'
        },
        seo: {
          metaTitle: 'Bespoke Haute Joaillerie Commissions | AUREVÉ',
          metaDescription: 'Commission custom high jewellery heirlooms crafted in 22K gold, platinum, and rare gemstones.'
        },
        isPublished: true
      }
    ];

    for (const page of cmsPages) {
      await PageContent.findOneAndUpdate(
        { pageKey: page.pageKey },
        {
          $set: {
            title: page.title,
            subtitle: page.subtitle,
            heroDescription: page.heroDescription,
            heroMedia: page.heroMedia,
            sections: page.sections,
            cta: page.cta,
            seo: page.seo,
            isPublished: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded Dynamic CMS Content for OUR_STORY and BESPOKE_SERVICES.`);

    // =========================================================================
    // 10. SEED USERS, ADDRESSES & NOTIFICATION PREFERENCES
    // =========================================================================
    logger.info('👤 Seeding Development VIP Patrons, Concierge & Admin Users...');
    const defaultPasswordHash = await hashPassword('AurevePatron2026!');
    const adminPasswordHash = await hashPassword('Aureve@Royal2026!');

    const usersData = [
      {
        firstName: 'Ananya',
        lastName: 'Sharma',
        email: 'ananya.sharma@aureve-vip.com',
        phone: '9820112345',
        passwordHash: defaultPasswordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isVerified: true,
        preferences: { ringSize: 12, bangleSize: '2.4', newsletter: true, smsAlerts: true, whatsappAlerts: true }
      },
      {
        firstName: 'Rohit',
        lastName: 'Mehta',
        email: 'rohit.mehta@aureve-vip.com',
        phone: '9811223344',
        passwordHash: defaultPasswordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isVerified: true,
        preferences: { ringSize: 22, bangleSize: null, newsletter: true, smsAlerts: true, whatsappAlerts: false }
      },
      {
        firstName: 'Priya',
        lastName: 'Kapoor',
        email: 'priya.kapoor@aureve-vip.com',
        phone: '9871122334',
        passwordHash: defaultPasswordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isVerified: true,
        preferences: { ringSize: 10, bangleSize: '2.2', newsletter: false, smsAlerts: true, whatsappAlerts: true }
      },
      {
        firstName: 'Devika',
        lastName: 'Singh',
        email: 'devika.singh@aureve-vip.com',
        phone: '9899112233',
        passwordHash: defaultPasswordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isVerified: true,
        preferences: { ringSize: 14, bangleSize: '2.6', newsletter: true, smsAlerts: true, whatsappAlerts: true }
      },
      {
        firstName: 'Kabir',
        lastName: 'Sen',
        email: 'concierge@aureve.com',
        phone: '9810012345',
        passwordHash: defaultPasswordHash,
        role: 'STAFF',
        status: 'ACTIVE',
        isVerified: true,
        preferences: { newsletter: false, smsAlerts: true, whatsappAlerts: false }
      },
      {
        firstName: 'Master',
        lastName: 'Admin',
        email: 'admin@aureve.com',
        phone: '9876543210',
        passwordHash: adminPasswordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        isVerified: true,
        preferences: { newsletter: false, smsAlerts: true, whatsappAlerts: false }
      }
    ];

    const userMap = {};
    for (const u of usersData) {
      const userDoc = await User.findOneAndUpdate(
        { email: u.email },
        {
          $set: {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone,
            passwordHash: u.passwordHash,
            role: u.role,
            status: u.status,
            isVerified: u.isVerified,
            preferences: u.preferences
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      userMap[u.email] = userDoc;

      // Seed notification preferences
      await NotificationPreference.findOneAndUpdate(
        { userId: userDoc._id },
        {
          $set: {
            channels: { email: true, sms: true, whatsapp: u.preferences?.whatsappAlerts || false },
            categories: { orderUpdates: true, promotions: true, vipInvitations: true, securityAlerts: true }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${Object.keys(userMap).length} Users & Notification Preferences.`);

    // Seed Addresses for VIP Patrons
    const addressesData = [
      {
        userEmail: 'ananya.sharma@aureve-vip.com',
        fullName: 'Ananya Sharma',
        phone: '9820112345',
        addressLine1: 'Bungalow 14, Altamount Road',
        addressLine2: 'Cumballa Hill',
        landmark: 'Near Ambani Residence',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400026',
        addressType: 'HOME',
        isDefaultShipping: true,
        isDefaultBilling: true
      },
      {
        userEmail: 'rohit.mehta@aureve-vip.com',
        fullName: 'Rohit Mehta',
        phone: '9811223344',
        addressLine1: 'Estate 7, Golf Links',
        addressLine2: 'Archbishop Makarios Marg',
        landmark: 'Opposite Delhi Golf Club',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110003',
        addressType: 'HOME',
        isDefaultShipping: true,
        isDefaultBilling: true
      },
      {
        userEmail: 'priya.kapoor@aureve-vip.com',
        fullName: 'Priya Kapoor',
        phone: '9871122334',
        addressLine1: 'Villa Royale, Sadashiva Nagar',
        addressLine2: '14th Cross Road',
        landmark: 'Near Sankey Tank',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560080',
        addressType: 'HOME',
        isDefaultShipping: true,
        isDefaultBilling: true
      },
      {
        userEmail: 'devika.singh@aureve-vip.com',
        fullName: 'Devika Singh',
        phone: '9899112233',
        addressLine1: 'Penthouse 9, Road No. 36',
        addressLine2: 'Jubilee Hills',
        landmark: 'Beside Jubilee Ridge',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500033',
        addressType: 'HOME',
        isDefaultShipping: true,
        isDefaultBilling: true
      }
    ];

    const addressMap = {};
    for (const a of addressesData) {
      const uDoc = userMap[a.userEmail];
      const addrDoc = await Address.findOneAndUpdate(
        { userId: uDoc._id, addressLine1: a.addressLine1 },
        {
          $set: {
            userId: uDoc._id,
            fullName: a.fullName,
            phone: a.phone,
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2,
            landmark: a.landmark,
            city: a.city,
            state: a.state,
            postalCode: a.postalCode,
            country: 'India',
            addressType: a.addressType,
            isDefaultShipping: a.isDefaultShipping,
            isDefaultBilling: a.isDefaultBilling
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      addressMap[a.userEmail] = addrDoc;

      // Update user default addresses
      await User.updateOne(
        { _id: uDoc._id },
        { $set: { defaultShippingAddress: addrDoc._id, defaultBillingAddress: addrDoc._id } }
      );
    }
    logger.info(`✓ Successfully seeded ${Object.keys(addressMap).length} Customer Addresses.`);

    // =========================================================================
    // 11. SEED CARTS & WISHLISTS
    // =========================================================================
    logger.info('🛒 Seeding Active Carts & Customer Wishlists...');
    const ananya = userMap['ananya.sharma@aureve-vip.com'];
    const priya = userMap['priya.kapoor@aureve-vip.com'];
    const rohit = userMap['rohit.mehta@aureve-vip.com'];
    const devika = userMap['devika.singh@aureve-vip.com'];

    // Find sample variants for cart and wishlist
    const chokerProd = seededProducts.find((p) => p.sku === 'AV-CHOK-001') || seededProducts[0];
    const ringProd = seededProducts.find((p) => p.sku === 'AV-RING-001') || seededProducts[1];
    const kadaProd = seededProducts.find((p) => p.sku === 'AV-KADA-001') || seededProducts[2];
    const pendantProd = seededProducts.find((p) => p.sku === 'AV-PEND-001') || seededProducts[4];

    const chokerVariant = await ProductVariant.findOne({ productId: chokerProd._id });
    const ringVariant = await ProductVariant.findOne({ productId: ringProd._id });
    const kadaVariant = await ProductVariant.findOne({ productId: kadaProd._id });
    const pendantVariant = await ProductVariant.findOne({ productId: pendantProd._id });

    // Seed Cart for Ananya (Ring)
    if (ringVariant) {
      const itemPrice = ringVariant.priceInPaise;
      const making = Math.round(itemPrice * 0.08);
      const subtotal = itemPrice;
      const gst = Math.round((subtotal + making) * 0.03);
      const total = subtotal + making + gst;

      await Cart.findOneAndUpdate(
        { userId: ananya._id },
        {
          $set: {
            userId: ananya._id,
            items: [
              {
                productId: ringProd._id,
                variantId: ringVariant._id,
                quantity: 1,
                priceInPaise: itemPrice,
                addedAt: REFERENCE_DATE
              }
            ],
            subtotalPaise: subtotal,
            makingChargesPaise: making,
            discountPaise: 0,
            gstPaise: gst,
            totalPaise: total,
            giftWrapping: { isRequested: true, message: 'Complimentary imperial seal gift chest.' }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Seed Wishlist for Ananya, Rohit, and Devika
    const wishlistsToSeed = [
      {
        user: ananya,
        items: [
          { productId: chokerProd._id, variantId: chokerVariant?._id },
          { productId: kadaProd._id, variantId: kadaVariant?._id }
        ]
      },
      {
        user: rohit,
        items: [
          { productId: ringProd._id, variantId: ringVariant?._id }
        ]
      },
      {
        user: devika,
        items: [
          { productId: pendantProd._id, variantId: pendantVariant?._id }
        ]
      }
    ];

    for (const w of wishlistsToSeed) {
      await Wishlist.findOneAndUpdate(
        { userId: w.user._id },
        {
          $set: {
            userId: w.user._id,
            items: w.items.map((it) => ({
              productId: it.productId,
              variantId: it.variantId,
              addedAt: REFERENCE_DATE
            }))
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded Customer Carts & Wishlists.`);

    // =========================================================================
    // 12. SEED REALISTIC ORDERS & CORRESPONDING PAYMENTS
    // =========================================================================
    logger.info('📦 Seeding Historical & Active Customer Orders with Payments...');

    const ordersData = [
      {
        orderNumber: 'AV-ORD-2026-1001',
        user: ananya,
        address: addressMap['ananya.sharma@aureve-vip.com'],
        product: ringProd,
        variant: ringVariant,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        orderStatus: 'DELIVERED',
        paymentGatewayMethod: 'CARD',
        placedAt: new Date('2026-10-12T14:30:00.000Z'),
        tracking: {
          courierName: 'Blue Dart Apex Sovereign',
          trackingNumber: 'BDA77491026IN',
          trackingUrl: 'https://www.bluedart.com/tracking/BDA77491026IN',
          estimatedDeliveryDate: new Date('2026-10-15T18:00:00.000Z'),
          statusTimeline: [
            { status: 'PLACED', message: 'Acquisition registered at AUREVÉ Vault', timestamp: new Date('2026-10-12T14:30:00.000Z') },
            { status: 'CONFIRMED', message: 'Payment authenticated and BIS HUID verified', timestamp: new Date('2026-10-12T14:35:00.000Z') },
            { status: 'SHIPPED', message: 'Dispatched in armored custody', timestamp: new Date('2026-10-13T10:00:00.000Z') },
            { status: 'DELIVERED', message: 'Handed over to VIP client in person', timestamp: new Date('2026-10-15T16:45:00.000Z') }
          ]
        }
      },
      {
        orderNumber: 'AV-ORD-2026-1002',
        user: rohit,
        address: addressMap['rohit.mehta@aureve-vip.com'],
        product: pendantProd,
        variant: pendantVariant,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        orderStatus: 'SHIPPED',
        paymentGatewayMethod: 'UPI',
        placedAt: new Date('2026-10-16T11:15:00.000Z'),
        tracking: {
          courierName: 'Sequel Secure Armored Logistics',
          trackingNumber: 'SQL20261016DEL',
          trackingUrl: 'https://www.sequellogistics.biz/track/SQL20261016DEL',
          estimatedDeliveryDate: new Date('2026-10-19T17:00:00.000Z'),
          statusTimeline: [
            { status: 'PLACED', message: 'Order submitted by patron', timestamp: new Date('2026-10-16T11:15:00.000Z') },
            { status: 'CONFIRMED', message: 'Order verified by Salon Director', timestamp: new Date('2026-10-16T11:20:00.000Z') },
            { status: 'SHIPPED', message: 'In transit via secure armored transport', timestamp: new Date('2026-10-17T09:30:00.000Z') }
          ]
        }
      },
      {
        orderNumber: 'AV-ORD-2026-1003',
        user: priya,
        address: addressMap['priya.kapoor@aureve-vip.com'],
        product: kadaProd,
        variant: kadaVariant,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        paymentGatewayMethod: 'NETBANKING',
        placedAt: new Date('2026-10-17T16:00:00.000Z'),
        tracking: {
          courierName: 'Sequel Secure Logistics',
          trackingNumber: 'SQL20261017BLR',
          trackingUrl: 'https://www.sequellogistics.biz/track/SQL20261017BLR',
          estimatedDeliveryDate: new Date('2026-10-21T18:00:00.000Z'),
          statusTimeline: [
            { status: 'PLACED', message: 'Acquisition recorded in AUREVÉ Vault', timestamp: new Date('2026-10-17T16:00:00.000Z') },
            { status: 'CONFIRMED', message: 'Payment captured and hallmarking authenticated', timestamp: new Date('2026-10-17T16:05:00.000Z') }
          ]
        }
      },
      {
        orderNumber: 'AV-ORD-2026-1004',
        user: devika,
        address: addressMap['devika.singh@aureve-vip.com'],
        product: chokerProd,
        variant: chokerVariant,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PROCESSING',
        paymentGatewayMethod: 'COD',
        placedAt: new Date('2026-10-18T09:20:00.000Z'),
        tracking: {
          courierName: 'AUREVÉ White-Glove Armored Valet',
          trackingNumber: 'AV-VALET-HYD-04',
          trackingUrl: '',
          estimatedDeliveryDate: new Date('2026-10-22T15:00:00.000Z'),
          statusTimeline: [
            { status: 'PLACED', message: 'Bespoke high-value COD booking received', timestamp: new Date('2026-10-18T09:20:00.000Z') },
            { status: 'PROCESSING', message: 'Under security verification by Concierge', timestamp: new Date('2026-10-18T10:00:00.000Z') }
          ]
        }
      },
      {
        orderNumber: 'AV-ORD-2026-1005',
        user: ananya,
        address: addressMap['ananya.sharma@aureve-vip.com'],
        product: kadaProd,
        variant: kadaVariant,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
        paymentGatewayMethod: 'UPI',
        placedAt: new Date('2026-10-18T11:45:00.000Z'),
        tracking: {
          courierName: '',
          trackingNumber: '',
          trackingUrl: '',
          estimatedDeliveryDate: null,
          statusTimeline: [
            { status: 'PLACED', message: 'Order created, awaiting gateway clearance', timestamp: new Date('2026-10-18T11:45:00.000Z') }
          ]
        }
      }
    ];

    const seededOrders = [];
    for (const o of ordersData) {
      const unitPrice = o.variant?.priceInPaise || 15000000;
      const makingCharges = Math.round(unitPrice * 0.08);
      const gst = Math.round((unitPrice + makingCharges) * 0.03);
      const grandTotal = unitPrice + makingCharges + gst;

      const orderDoc = await Order.findOneAndUpdate(
        { orderNumber: o.orderNumber },
        {
          $set: {
            orderNumber: o.orderNumber,
            userId: o.user._id,
            items: [
              {
                productId: o.product._id,
                variantId: o.variant._id,
                title: o.product.title,
                sku: o.variant.sku,
                quantity: 1,
                unitPricePaise: unitPrice,
                makingChargesPaise: makingCharges,
                gstPaise: gst,
                totalPaise: grandTotal,
                image: o.product.images?.[0]?.url || SEED_PLACEHOLDER_IMAGE.url,
                metalSpecifications: {
                  metalType: o.variant.metalType,
                  metalPurity: o.variant.metalPurity,
                  size: o.variant.size,
                  grossWeightGrams: o.variant.grossWeightGrams
                },
                certificateNumber: `BIS-IN-${o.variant.sku}`
              }
            ],
            shippingAddress: {
              fullName: o.address.fullName,
              phone: o.address.phone,
              addressLine1: o.address.addressLine1,
              addressLine2: o.address.addressLine2,
              city: o.address.city,
              state: o.address.state,
              postalCode: o.address.postalCode,
              country: 'India'
            },
            billingAddress: {
              fullName: o.address.fullName,
              phone: o.address.phone,
              addressLine1: o.address.addressLine1,
              addressLine2: o.address.addressLine2,
              city: o.address.city,
              state: o.address.state,
              postalCode: o.address.postalCode,
              country: 'India'
            },
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            orderStatus: o.orderStatus,
            financialBreakdown: {
              subtotalPaise: unitPrice,
              makingChargesPaise: makingCharges,
              gstPaise: gst,
              discountPaise: 0,
              shippingFeePaise: 0,
              grandTotalPaise: grandTotal
            },
            tracking: o.tracking,
            placedAt: o.placedAt
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      seededOrders.push(orderDoc);
    }

    // Seed Coherent Payment Lifecycles across the 5 Seeded Orders
    // Demonstrating realistic enterprise lifecycle scenarios:
    // - Order 1: Razorpay Card Payment (CAPTURED)
    // - Order 2: Razorpay UPI Payment with an initial failed attempt (gateway network drop), followed by successful retry (CAPTURED)
    // - Order 3: Razorpay Netbanking Payment (CAPTURED)
    // - Order 4: Armored Courier White-Glove Cash On Delivery (PENDING collection on delivery)
    // - Order 5: Razorpay UPI newly placed acquisition awaiting customer authorization (PENDING)
    const paymentsToSeed = [
      {
        order: seededOrders[0],
        transactionId: 'txn_dev_av_ord_2026_1001_card',
        razorpayOrderId: 'order_dev_AVORD20261001',
        gateway: 'RAZORPAY',
        amountPaise: seededOrders[0].financialBreakdown.grandTotalPaise,
        currency: 'INR',
        method: 'CARD',
        status: 'CAPTURED',
        createdAt: new Date('2026-10-12T14:35:00.000Z')
      },
      {
        order: seededOrders[1],
        transactionId: 'txn_dev_av_ord_2026_1002_upi_attempt1',
        razorpayOrderId: 'order_dev_AVORD20261002',
        gateway: 'RAZORPAY',
        amountPaise: seededOrders[1].financialBreakdown.grandTotalPaise,
        currency: 'INR',
        method: 'UPI',
        status: 'FAILED',
        createdAt: new Date('2026-10-16T11:10:00.000Z')
      },
      {
        order: seededOrders[1],
        transactionId: 'txn_dev_av_ord_2026_1002_upi_success',
        razorpayOrderId: 'order_dev_AVORD20261002',
        gateway: 'RAZORPAY',
        amountPaise: seededOrders[1].financialBreakdown.grandTotalPaise,
        currency: 'INR',
        method: 'UPI',
        status: 'CAPTURED',
        createdAt: new Date('2026-10-16T11:15:00.000Z')
      },
      {
        order: seededOrders[2],
        transactionId: 'txn_dev_av_ord_2026_1003_netbanking',
        razorpayOrderId: 'order_dev_AVORD20261003',
        gateway: 'RAZORPAY',
        amountPaise: seededOrders[2].financialBreakdown.grandTotalPaise,
        currency: 'INR',
        method: 'NETBANKING',
        status: 'CAPTURED',
        createdAt: new Date('2026-10-17T16:05:00.000Z')
      },
      {
        order: seededOrders[3],
        transactionId: 'txn_dev_av_ord_2026_1004_cod',
        razorpayOrderId: null,
        gateway: 'COD',
        amountPaise: seededOrders[3].financialBreakdown.grandTotalPaise,
        currency: 'INR',
        method: 'COD',
        status: 'PENDING',
        createdAt: new Date('2026-10-18T09:20:00.000Z')
      },
      {
        order: seededOrders[4],
        transactionId: 'txn_dev_av_ord_2026_1005_upi_pending',
        razorpayOrderId: 'order_dev_AVORD20261005',
        gateway: 'RAZORPAY',
        amountPaise: seededOrders[4].financialBreakdown.grandTotalPaise,
        currency: 'INR',
        method: 'UPI',
        status: 'PENDING',
        createdAt: new Date('2026-10-18T11:45:00.000Z')
      }
    ];

    for (const p of paymentsToSeed) {
      await Payment.findOneAndUpdate(
        { transactionId: p.transactionId },
        {
          $set: {
            orderId: p.order._id,
            transactionId: p.transactionId,
            razorpayOrderId: p.razorpayOrderId,
            gateway: p.gateway,
            amountPaise: p.amountPaise,
            currency: p.currency,
            method: p.method,
            status: p.status,
            createdAt: p.createdAt
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Prune orphaned payments (e.g. from previous integration test runs where test orders were deleted)
    const validOrderIds = await Order.find({}).distinct('_id');
    const orphanPruneResult = await Payment.deleteMany({
      orderId: { $nin: validOrderIds }
    });
    if (orphanPruneResult.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${orphanPruneResult.deletedCount} orphaned test payment records from database.`);
    }

    // Prune any legacy dev payment transactions outside the 6 deterministic payments
    const deterministicTxnIds = paymentsToSeed.map((p) => p.transactionId);
    await Payment.deleteMany({
      transactionId: { $regex: /^txn_dev_/ },
      transactionId: { $nin: deterministicTxnIds }
    });

    logger.info(`✓ Successfully seeded ${seededOrders.length} Realistic Orders & ${paymentsToSeed.length} Linked Payments (modeling authentic lifecycles & retries).`);

    // =========================================================================
    // 13. SEED INVENTORY LOGS (INITIAL ALLOCATION & PURCHASE DEDUCTIONS)
    // =========================================================================
    logger.info('📊 Seeding Inventory Movement Audit Logs...');
    const adminUser = userMap['admin@aureve.com'];

    // Initial stock allocation logs for all variants
    const allVariants = await ProductVariant.find({});
    for (const v of allVariants) {
      await InventoryLog.findOneAndUpdate(
        { variantId: v._id, movementType: 'INITIAL_STOCK' },
        {
          $set: {
            variantId: v._id,
            productId: v.productId,
            orderId: null,
            movementType: 'INITIAL_STOCK',
            quantityChanged: v.inventoryCount,
            previousQuantity: 0,
            newQuantity: v.inventoryCount,
            performedBy: adminUser._id,
            reason: 'Authoritative initial catalog bullion allocation'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Purchase deduction logs for seeded orders
    for (const ord of seededOrders) {
      const lineItem = ord.items[0];
      await InventoryLog.findOneAndUpdate(
        { orderId: ord._id, movementType: 'PURCHASE_DEDUCTION' },
        {
          $set: {
            variantId: lineItem.variantId,
            productId: lineItem.productId,
            orderId: ord._id,
            movementType: 'PURCHASE_DEDUCTION',
            quantityChanged: -lineItem.quantity,
            previousQuantity: 3,
            newQuantity: 2,
            performedBy: ord.userId,
            reason: `Order ${ord.orderNumber} checkout inventory deduction`
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${allVariants.length + seededOrders.length} Inventory Logs.`);

    // =========================================================================
    // 14. SEED VERIFIED CUSTOMER PRODUCT REVIEWS
    // =========================================================================
    logger.info('⭐ Seeding Verified Customer Reviews...');
    const reviewsData = [
      {
        product: ringProd,
        user: ananya,
        order: seededOrders[0],
        rating: 5,
        title: 'An Incomparable Masterwork of Purity and Fire',
        comment: 'Acquired this 5.12ct solitaire for our 10th anniversary. The GIA certification was verified in the Colaba VIP lounge. The optical brilliance of this diamond under natural twilight is unlike anything I have ever witnessed.',
        helpfulVotes: 14
      },
      {
        product: pendantProd,
        user: rohit,
        order: seededOrders[1],
        rating: 5,
        title: 'Artisanal Perfection and Regal Presence',
        comment: 'Commissioned as a celebratory gift for my wife. The Suryavanshi Polki medallion reflects ancestral Rajasthani court grandeur with contemporary refinement. Armored delivery was flawless.',
        helpfulVotes: 9
      },
      {
        product: kadaProd,
        user: priya,
        order: seededOrders[2],
        rating: 5,
        title: 'Magnificent 22K Temple Bullion Weight',
        comment: 'The Nakshi repoussé work on this kada pair is breathtaking. You can feel the dense 22K bullion weight immediately on the wrist. True heirloom craftsmanship that will be passed down.',
        helpfulVotes: 11
      },
      {
        product: chokerProd,
        user: devika,
        order: seededOrders[3],
        rating: 5,
        title: 'Breathtaking Uncut Golconda Polki & Emeralds',
        comment: 'The Noor-e-Jahan choker was the centerpiece of our royal wedding festivities. The foil-cradled raw polki and natural Zambian emeralds glowed under banquet chandeliers.',
        helpfulVotes: 18
      },
      {
        product: seededProducts[5] || ringProd,
        user: ananya,
        order: seededOrders[0],
        rating: 4,
        title: 'Classic Chandbali Silhouette with Basra Pearls',
        comment: 'Exquisite balance and movement. The natural seed pearls provide graceful articulation during ceremonial occasions.',
        helpfulVotes: 6
      },
      {
        product: seededProducts[6] || pendantProd,
        user: rohit,
        order: seededOrders[1],
        rating: 5,
        title: 'Understated Everyday Sovereign Luxury',
        comment: 'Flawless diamond tennis link bracelet. The clasp mechanism is robust, secure, and finished to high Swiss standards.',
        helpfulVotes: 8
      }
    ];

    for (const r of reviewsData) {
      await Review.findOneAndUpdate(
        { userId: r.user._id, productId: r.product._id },
        {
          $set: {
            productId: r.product._id,
            userId: r.user._id,
            orderId: r.order?._id || null,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            isVerifiedPurchase: true,
            status: 'APPROVED',
            helpfulVotes: r.helpfulVotes,
            images: []
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${reviewsData.length} Verified Customer Reviews.`);

    // =========================================================================
    // 15. SEED VIP APPOINTMENTS & SALON CONSULTATIONS (October 2026)
    // =========================================================================
    logger.info('📅 Seeding VIP Salon & Virtual Appointments...');
    const mumbaiStore = await StoreLocation.findOne({ slug: 'mumbai-flagship-colaba' });
    const delhiStore = await StoreLocation.findOne({ slug: 'delhi-mehrauli-couture' });
    const hyderabadStore = await StoreLocation.findOne({ slug: 'hyderabad-banjara-palace' });
    const conciergeStaff = userMap['concierge@aureve.com'];

    const appointmentsData = [
      {
        userId: ananya._id,
        clientName: 'Ananya Sharma',
        clientEmail: 'ananya.sharma@aureve-vip.com',
        clientPhone: '9820112345',
        appointmentType: 'IN_STORE_VIP',
        storeLocationId: mumbaiStore?._id,
        scheduledDate: new Date('2026-10-20T10:00:00.000Z'),
        timeSlot: '03:00 PM – 04:00 PM',
        interestCategories: ['Haute Solitaires', 'Imperial Bridal Sets'],
        status: 'CONFIRMED',
        assignedStaffId: conciergeStaff?._id || null,
        notes: 'Private salon suite requested for Diwali bridal trousseau preview.'
      },
      {
        userId: rohit._id,
        clientName: 'Rohit Mehta',
        clientEmail: 'rohit.mehta@aureve-vip.com',
        clientPhone: '9811223344',
        appointmentType: 'IN_STORE_VIP',
        storeLocationId: delhiStore?._id,
        scheduledDate: new Date('2026-10-22T10:00:00.000Z'),
        timeSlot: '11:30 AM – 12:30 PM',
        interestCategories: ['Men’s Regal Accessories', 'Imperial Necklaces & Chokers'],
        status: 'CONFIRMED',
        assignedStaffId: conciergeStaff?._id || null,
        notes: 'Exploring royal sherwani button suites and emerald brooches.'
      },
      {
        userId: priya._id,
        clientName: 'Priya Kapoor',
        clientEmail: 'priya.kapoor@aureve-vip.com',
        clientPhone: '9871122334',
        appointmentType: 'VIRTUAL_CONSULTATION',
        storeLocationId: null,
        scheduledDate: new Date('2026-10-24T10:00:00.000Z'),
        timeSlot: '05:00 PM – 06:00 PM',
        interestCategories: ['Solitaire Grandeur', 'Bracelets & Cuffs'],
        status: 'REQUESTED',
        assignedStaffId: null,
        meetingLink: 'https://meet.aureve.com/salon/priya-kapoor-vip',
        notes: 'High-definition digital viewing of D-Flawless diamond solitaires.'
      },
      {
        userId: devika._id,
        clientName: 'Devika Singh',
        clientEmail: 'devika.singh@aureve-vip.com',
        clientPhone: '9899112233',
        appointmentType: 'IN_STORE_VIP',
        storeLocationId: hyderabadStore?._id,
        scheduledDate: new Date('2026-10-15T10:00:00.000Z'),
        timeSlot: '02:00 PM – 03:00 PM',
        interestCategories: ['Dravidian Temple Antique', 'The Nizam Treasures'],
        status: 'COMPLETED',
        assignedStaffId: conciergeStaff?._id || null,
        notes: 'Completed viewing of Golconda polki chokers in private salon.'
      }
    ];

    for (const appt of appointmentsData) {
      await Appointment.findOneAndUpdate(
        { clientEmail: appt.clientEmail, scheduledDate: appt.scheduledDate, timeSlot: appt.timeSlot },
        {
          $set: {
            userId: appt.userId,
            clientName: appt.clientName,
            clientEmail: appt.clientEmail,
            clientPhone: appt.clientPhone,
            appointmentType: appt.appointmentType,
            storeLocationId: appt.storeLocationId,
            scheduledDate: appt.scheduledDate,
            timeSlot: appt.timeSlot,
            interestCategories: appt.interestCategories,
            status: appt.status,
            assignedStaffId: appt.assignedStaffId,
            meetingLink: appt.meetingLink || '',
            notes: appt.notes
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${appointmentsData.length} VIP Appointments.`);

    // =========================================================================
    // 16. SEED BESPOKE COMMISSION ENQUIRIES
    // =========================================================================
    logger.info('💎 Seeding Bespoke Jewellery Commission Dossiers...');
    const bespokeEnquiriesData = [
      {
        inquiryCode: 'AV-BESPOKE-202601',
        clientName: 'Ananya Sharma',
        clientEmail: 'ananya.sharma@aureve-vip.com',
        clientPhone: '9820112345',
        pieceType: 'Imperial Bridal Choker',
        metalPreference: '22K Pure Yellow Gold',
        gemstonePreference: 'Natural Zambian Emeralds & Uncut Polki Diamonds',
        budgetTier: '₹25,00,000 – ₹50,00,000',
        consultationMode: 'IN_STORE_VIP',
        visionNotes: 'A multi-strand heritage bridal choker inspired by 19th-century Baroda royal archives, incorporating antique Basra pearls.',
        status: 'IN_PROGRESS',
        adminNotes: 'Gemstone team curating 42.5ct uncut polki assortment from Jaipur vault.',
        assignedTo: userMap['concierge@aureve.com']?._id,
        preferredDate: new Date('2026-10-25T14:00:00.000Z')
      },
      {
        inquiryCode: 'AV-BESPOKE-202602',
        clientName: 'Vikramaditya Singhania',
        clientEmail: 'vikram.singhania@heritage-holdings.in',
        clientPhone: '9810987654',
        pieceType: 'Sovereign Family Crest Signet Ring',
        metalPreference: '950 Solid Platinum',
        gemstonePreference: 'Royal Blue Ceylon Sapphire',
        budgetTier: '₹10,00,000 – ₹20,00,000',
        consultationMode: 'IN_STORE_VIP',
        visionNotes: 'Heavy platinum signet ring with hand-engraved ancestral coat of arms on a bezel-set untreated Ceylon sapphire.',
        status: 'CONTACTED',
        adminNotes: 'Awaiting architectural 3D CAD wax model presentation.',
        assignedTo: userMap['concierge@aureve.com']?._id,
        preferredDate: new Date('2026-10-28T16:30:00.000Z')
      },
      {
        inquiryCode: 'AV-BESPOKE-202603',
        clientName: 'Meera Nambiar',
        clientEmail: 'meera.nambiar@luxury-interiors.co',
        clientPhone: '9845123456',
        pieceType: 'Dravidian Nakshi Peacock Vanki Armlet',
        metalPreference: '22K Antique Bullion Gold',
        gemstonePreference: 'Cabochon Burmese Rubies',
        budgetTier: '₹8,00,000 – ₹15,00,000',
        consultationMode: 'VIRTUAL_CONSULTATION',
        visionNotes: 'Hand-sculpted repoussé peacock armlet with floral motifs, certified BIS 916 with antique patina.',
        status: 'NEW',
        adminNotes: 'New brief submitted via customer portal; scheduled for concierge intake call.',
        preferredDate: new Date('2026-10-29T11:00:00.000Z')
      }
    ];

    for (const b of bespokeEnquiriesData) {
      await BespokeEnquiry.findOneAndUpdate(
        { inquiryCode: b.inquiryCode },
        {
          $set: {
            inquiryCode: b.inquiryCode,
            clientName: b.clientName,
            clientEmail: b.clientEmail,
            clientPhone: b.clientPhone,
            pieceType: b.pieceType,
            metalPreference: b.metalPreference,
            gemstonePreference: b.gemstonePreference,
            budgetTier: b.budgetTier,
            consultationMode: b.consultationMode,
            visionNotes: b.visionNotes,
            status: b.status,
            adminNotes: b.adminNotes,
            assignedTo: b.assignedTo || null,
            preferredDate: b.preferredDate
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${bespokeEnquiriesData.length} Bespoke Commission Enquiries.`);

    // =========================================================================
    // 17. SEED NOTIFICATIONS & AUDIT LOGS
    // =========================================================================
    logger.info('🔔 Seeding Customer Notifications & Administrative Audit Trail...');

    const notificationsData = [
      {
        userId: ananya._id,
        title: 'Acquisition Dispatched: The Empress Solitaire',
        message: 'Your high jewellery acquisition AV-ORD-2026-1001 has been dispatched in armored custody via Blue Dart Apex.',
        type: 'ORDER_UPDATE',
        linkUrl: '/account/orders/AV-ORD-2026-1001',
        isRead: false
      },
      {
        userId: ananya._id,
        title: 'VIP Salon Appointment Confirmed',
        message: 'Your private consultation at the AUREVÉ Mumbai Colaba Flagship Salon is confirmed for 20 October 2026 at 3:00 PM.',
        type: 'APPOINTMENT_REMINDER',
        linkUrl: '/account/appointments',
        isRead: true
      },
      {
        userId: rohit._id,
        title: 'Payment Authenticated: ₹15,00,000 Captured',
        message: 'Your payment for Order AV-ORD-2026-1002 was authenticated successfully under BIS 916 metallurgical assurance.',
        type: 'PAYMENT_UPDATE',
        linkUrl: '/account/orders/AV-ORD-2026-1002',
        isRead: true
      },
      {
        userId: priya._id,
        title: 'Diwali Festive Radiance Privilege Active',
        message: 'Exclusive 12% privilege on artisanal making charges is now active on your private AUREVÉ account through October 2026.',
        type: 'PROMOTION',
        linkUrl: '/collections/festive-radiance',
        isRead: false
      },
      {
        userId: devika._id,
        title: 'Review Moderation Approved',
        message: 'Your verified purchase review for the Noor-e-Jahan Emerald Choker has been approved and published to the Maison registry.',
        type: 'REVIEW_MODERATION',
        linkUrl: '/products/noor-e-jahan-emerald-polki-choker',
        isRead: true
      },
      {
        userId: ananya._id,
        title: 'Security Alert: New Session Authorized',
        message: 'A new session was authorized from Chrome macOS in Mumbai, India. If this was not you, please notify Concierge immediately.',
        type: 'SECURITY_ALERT',
        linkUrl: '/account/security',
        isRead: true
      }
    ];

    for (const n of notificationsData) {
      await Notification.findOneAndUpdate(
        { userId: n.userId, title: n.title },
        {
          $set: {
            userId: n.userId,
            title: n.title,
            message: n.message,
            type: n.type,
            linkUrl: n.linkUrl,
            isRead: n.isRead,
            emailSent: true,
            emailDelivered: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${notificationsData.length} Customer Notifications.`);

    // Seed AuditLog records
    const auditLogsData = [
      {
        action: 'HAUTE_CATALOG_BOOTSTRAP_INITIALIZED',
        entity: 'Product',
        entityId: ringProd._id,
        performedBy: adminUser._id,
        ipAddress: '127.0.0.1',
        changes: { status: 'PUBLISHED', catalogCount: 40, variantsCount: 80 },
        metadata: { referenceEpoch: '2026-10-18T10:00:00.000Z' }
      },
      {
        action: 'FLAGSHIP_SALONS_REGISTERED',
        entity: 'StoreLocation',
        entityId: mumbaiStore?._id || ringProd._id,
        performedBy: adminUser._id,
        ipAddress: '127.0.0.1',
        changes: { salonsSeeded: ['mumbai-colaba', 'delhi-chanakyapuri', 'bangalore-lavelle-road', 'hyderabad-jubilee-hills'] },
        metadata: { openingHoursAssigned: true }
      },
      {
        action: 'PRIVILEGE_CAMPAIGN_OCTOBER_2026_PUBLISHED',
        entity: 'Offer',
        entityId: ringProd._id,
        performedBy: adminUser._id,
        ipAddress: '127.0.0.1',
        changes: { campaignsActive: ['ROYALDIWALI2026', 'AUREVEVIP2026', 'diwali-radiance-2026'] },
        metadata: { validUntil: '2026-10-31T23:59:59.000Z' }
      },
      {
        action: 'VERIFIED_REVIEW_MODERATION_BATCH_APPROVED',
        entity: 'Review',
        entityId: ringProd._id,
        performedBy: adminUser._id,
        ipAddress: '127.0.0.1',
        changes: { moderatedCount: 6, status: 'APPROVED' },
        metadata: { verifiedPurchaseEnforced: true }
      }
    ];

    for (const a of auditLogsData) {
      await AuditLog.findOneAndUpdate(
        { action: a.action },
        {
          $set: {
            action: a.action,
            entity: a.entity,
            entityId: a.entityId,
            performedBy: a.performedBy,
            ipAddress: a.ipAddress,
            changes: a.changes,
            metadata: a.metadata
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info(`✓ Successfully seeded ${auditLogsData.length} Administrative Audit Logs.`);

    // =========================================================================
    // 15. REFERENTIAL INTEGRITY & FOREIGN KEY AUDIT
    // =========================================================================
    logger.info('🔍 Running Database Referential Integrity & Foreign Key Audit...');
    const allDbPayments = await Payment.find({}).populate('orderId');
    const orphanedPayments = allDbPayments.filter((p) => !p.orderId);
    if (orphanedPayments.length > 0) {
      throw new Error(`Referential integrity failure: ${orphanedPayments.length} payments have invalid order references.`);
    }

    const allDbOrders = await Order.find({}).populate('userId');
    for (const ord of allDbOrders) {
      if (!ord.userId) {
        throw new Error(`Referential integrity failure: Order ${ord.orderNumber} missing customer reference.`);
      }
      for (const item of ord.items) {
        const prodExists = await Product.exists({ _id: item.productId });
        if (!prodExists) {
          throw new Error(`Referential integrity failure: Order ${ord.orderNumber} contains non-existent product ID.`);
        }
      }
    }

    const allDbOffers = await Offer.find({})
      .populate('applicableCollections')
      .populate('applicableCategories')
      .populate('applicableProducts');
    for (const off of allDbOffers) {
      if (!off.bannerUrl) {
        throw new Error(`Integrity error: Offer '${off.slug}' is missing bannerUrl.`);
      }
      if (off.applicableCollections.length === 0 && off.applicableCategories.length === 0) {
        throw new Error(`Integrity error: Offer '${off.slug}' has unpopulated applicability references.`);
      }
    }
    logger.info('✅ Referential Integrity Audit Passed: 100% of Orders, Payments, and Offers are validly connected.');

    // =========================================================================
    // SEED COMPLETION SUMMARY (ALL 27 MONGOOSE MODEL COVERAGE MATRIX)
    // =========================================================================
    logger.info('===========================================================');
    logger.info('🎉 AUREVÉ ALL-MODEL SEED COMPLETE SUMMARY (23 SEEDED / 3 RUNTIME):');
    logger.info(`   • Categories:              ${Object.keys(categoryMap).length}`);
    logger.info(`   • Collections:             ${Object.keys(collectionMap).length}`);
    logger.info(`   • Master Products:         ${seededProducts.length}`);
    logger.info(`   • Product Variants:        ${seededProducts.length * 2}`);
    logger.info(`   • Limited Editions:        4 (Consistent stock & October 2026 window)`);
    logger.info(`   • Homepage Banners:        ${bannersData.length}`);
    logger.info(`   • Homepage Sections:       ${sectionsData.length}`);
    logger.info(`   • Showroom Stores:         ${storesData.length}`);
    logger.info(`   • Privilege Coupons:       ${couponsData.length}`);
    logger.info(`   • Festive Offers:          ${offersData.length} (Fully populated with collections, categories, products & banners)`);
    logger.info(`   • Dynamic CMS Pages:       2 (OUR_STORY, BESPOKE_SERVICES)`);
    logger.info(`   • Users & Profiles:        ${Object.keys(userMap).length} (Patrons, Concierge, Admin)`);
    logger.info(`   • Customer Addresses:      ${Object.keys(addressMap).length}`);
    logger.info(`   • Notification Prefs:      ${Object.keys(userMap).length}`);
    logger.info(`   • Active Carts:            1`);
    logger.info(`   • Customer Wishlists:      ${wishlistsToSeed.length}`);
    logger.info(`   • Customer Orders:         ${seededOrders.length}`);
    logger.info(`   • Payment Records:         ${paymentsToSeed.length} (Linked to ${seededOrders.length} Orders with 1 authentic UPI retry)`);
    logger.info(`   • Inventory Movement Logs: ${allVariants.length + seededOrders.length}`);
    logger.info(`   • Verified Reviews:        ${reviewsData.length}`);
    logger.info(`   • VIP Salon Appointments:  ${appointmentsData.length}`);
    logger.info(`   • Bespoke Enquiries:       ${bespokeEnquiriesData.length}`);
    logger.info(`   • Customer Notifications:  ${notificationsData.length}`);
    logger.info(`   • Administrative Audit:    ${auditLogsData.length}`);
    logger.info('   --- INTENTIONALLY EXCLUDED RUNTIME SECURITY MODELS (3) ---');
    logger.info('   • Session:                 Runtime-only ephemeral tokens (TTL index)');
    logger.info('   • EmailOtp:                Runtime-only 10-minute OTP verification (TTL)');
    logger.info('   • PasswordResetToken:      Runtime-only recovery tokens (TTL)');
    logger.info('===========================================================');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('FATAL SEED ENGINE ERROR:', { message: error.message, stack: error.stack });
    await disconnectDatabase();
    process.exit(1);
  }
};

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
