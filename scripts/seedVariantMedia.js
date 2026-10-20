import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { Product, ProductVariant } from '../src/models/index.js';
import { logger } from '../src/utils/logger.js';

/**
 * =========================================================================
 * AUREVÉ JEWELLERY — VARIANT MEDIA SYNCHRONIZATION SEED SCRIPT
 * =========================================================================
 * Purpose:
 * Connects each ProductVariant to its parent Product, extracts the primary
 * product showcase image (or first gallery asset), and updates the variant's
 * `variantSpecificMedia` array with the real image URL, Cloudinary publicId,
 * and descriptive alt metadata.
 *
 * Usage:
 *   node scripts/seedVariantMedia.js
 *   node scripts/seedVariantMedia.js --dry-run
 * =========================================================================
 */

export const syncVariantMediaFromProducts = async ({ isDryRun = false } = {}) => {
  logger.info('====================================================================');
  logger.info(`  AUREVÉ — PRODUCT VARIANT MEDIA SYNC SEED ENGINE ${isDryRun ? '[DRY RUN]' : ''}`);
  logger.info('====================================================================');

  try {
    await connectDatabase();

    const variants = await ProductVariant.find({}).sort({ createdAt: 1 });
    const totalVariants = variants.length;
    logger.info(`🔍 Found ${totalVariants} total product variants in the database.`);

    if (totalVariants === 0) {
      logger.warn('No variants found in the database. Nothing to update.');
      await disconnectDatabase();
      return { totalVariants: 0, updatedCount: 0, skippedCount: 0 };
    }

    // Cache products in memory to avoid redundant queries for variants sharing the same product
    const productCache = new Map();
    let updatedCount = 0;
    let skippedCount = 0;
    const samplePreview = [];

    const bulkOperations = [];

    for (const variant of variants) {
      const prodIdStr = variant.productId?.toString();
      if (!prodIdStr) {
        logger.warn(`⚠️ Variant ${variant.sku} has no associated productId. Skipping.`);
        skippedCount++;
        continue;
      }

      let parentProduct = productCache.get(prodIdStr);
      if (!parentProduct) {
        parentProduct = await Product.findById(variant.productId).lean();
        if (parentProduct) {
          productCache.set(prodIdStr, parentProduct);
        }
      }

      if (!parentProduct) {
        logger.warn(`⚠️ Parent product not found for variant ${variant.sku} (Product ID: ${prodIdStr}). Skipping.`);
        skippedCount++;
        continue;
      }

      const images = parentProduct.images || [];
      if (images.length === 0) {
        logger.warn(`⚠️ Parent product "${parentProduct.title}" (${parentProduct.sku}) has no images. Skipping variant ${variant.sku}.`);
        skippedCount++;
        continue;
      }

      // Pick primary image, or order-sorted image, or fallback to first image
      const primaryImage =
        images.find((img) => img.isPrimary) ||
        images.slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[0] ||
        images[0];

      if (!primaryImage?.url) {
        logger.warn(`⚠️ No valid image URL found on parent product "${parentProduct.title}". Skipping variant ${variant.sku}.`);
        skippedCount++;
        continue;
      }

      const mediaEntry = {
        url: primaryImage.url,
        publicId:
          primaryImage.publicId ||
          `aureve/variants/${variant.sku.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`,
        alt:
          primaryImage.alt ||
          `${parentProduct.title} - ${variant.variantName || variant.sku}`
      };

      if (samplePreview.length < 5) {
        samplePreview.push({
          sku: variant.sku,
          productTitle: parentProduct.title,
          metal: `${variant.metalPurity || ''} ${variant.metalType || ''}`.trim(),
          mediaUrl: mediaEntry.url,
          publicId: mediaEntry.publicId
        });
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: variant._id },
          update: {
            $set: {
              variantSpecificMedia: [mediaEntry]
            }
          }
        }
      });

      updatedCount++;
    }

    if (bulkOperations.length > 0 && !isDryRun) {
      logger.info(`⚡ Applying bulk updates for ${bulkOperations.length} variants...`);
      const bulkResult = await ProductVariant.bulkWrite(bulkOperations);
      logger.info(`✓ Successfully synchronized ${bulkResult.modifiedCount || updatedCount} variant records in MongoDB.`);
    } else if (isDryRun) {
      logger.info(`ℹ️ [DRY RUN] Would update ${bulkOperations.length} variants.`);
    }

    // Print summary table/preview
    logger.info('--------------------------------------------------------------------');
    logger.info('  PREVIEW OF SYNCHRONIZED VARIANTS (First 5):');
    logger.info('--------------------------------------------------------------------');
    samplePreview.forEach((item, idx) => {
      logger.info(` ${idx + 1}. SKU: ${item.sku} [${item.metal}]`);
      logger.info(`    Product: ${item.productTitle}`);
      logger.info(`    Image:   ${item.mediaUrl}`);
      logger.info(`    Public:  ${item.publicId}`);
    });
    logger.info('--------------------------------------------------------------------');
    logger.info(`✨ SUMMARY:`);
    logger.info(`   • Total Variants Found:   ${totalVariants}`);
    logger.info(`   • Distinct Products Used: ${productCache.size}`);
    logger.info(`   • Variants Updated:       ${updatedCount}`);
    logger.info(`   • Variants Skipped:       ${skippedCount}`);
    logger.info('====================================================================');

    await disconnectDatabase();
    return {
      totalVariants,
      updatedCount,
      skippedCount,
      uniqueProducts: productCache.size
    };
  } catch (error) {
    logger.error('Failed to synchronize variant media from products:', {
      message: error.message,
      stack: error.stack
    });
    await disconnectDatabase();
    throw error;
  }
};

// Auto-run if executed directly via CLI
if (process.argv[1]?.replace(/\\/g, '/').endsWith('seedVariantMedia.js')) {
  const isDryRun = process.argv.includes('--dry-run');
  syncVariantMediaFromProducts({ isDryRun })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
