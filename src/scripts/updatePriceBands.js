import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Product, ProductVariant } from '../models/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Price band migration configuration.
 *
 * Each entry represents one shortlisted product and the exact prices
 * (in paise) to write into its `pricing` block on the Product document,
 * plus the per-variant `priceInPaise` values on each child ProductVariant.
 *
 *  ₹1 = 100 paise
 */

const PRICE_UPDATES = [
    // ============================================================
    // ENTRY-LEVEL (₹15,000 – ₹75,000)
    // ============================================================
    {
        productSku: 'AV-PEND-001',
        band: 'ENTRY_LEVEL',
        productPricing: {
            baseMetalPricePaise: 4000000,       // ₹40,000
            diamondStonePricePaise: 2000000,    // ₹20,000
            makingChargesPaise: 500000,         // ₹5,000
            discountPricePaise: null,
            gstRate: 3
        },
        // Exact variant prices by variant SKU
        variantPrices: {
            'AV-PEND-001-V1': 6200000,          // ₹62,000
            'AV-PEND-001-V2': 6800000           // ₹68,000
        }
    },
    {
        productSku: 'AV-MANG-001',
        band: 'ENTRY_LEVEL',
        productPricing: {
            baseMetalPricePaise: 2800000,       // ₹28,000
            diamondStonePricePaise: 1400000,    // ₹14,000
            makingChargesPaise: 300000,         // ₹3,000
            discountPricePaise: null,
            gstRate: 3
        },
        variantPrices: {
            'AV-MANG-001-V1': 4200000,          // ₹42,000
            'AV-MANG-001-V2': 4800000           // ₹48,000
        }
    },
    {
        productSku: 'AV-MEN-001',
        band: 'ENTRY_LEVEL',
        productPricing: {
            baseMetalPricePaise: 5000000,       // ₹50,000
            diamondStonePricePaise: 1800000,    // ₹18,000
            makingChargesPaise: 400000,         // ₹4,000
            discountPricePaise: null,
            gstRate: 3
        },
        variantPrices: {
            'AV-MEN-001-V1': 7200000            // ₹72,000
        }
    },

    // ============================================================
    // MAIN JEWELLERY COLLECTIONS (₹75,000 – ₹5,00,000)
    // ============================================================
    {
        productSku: 'AV-EAR-001',
        band: 'MAIN_JEWELLERY',
        productPricing: {
            baseMetalPricePaise: 14000000,      // ₹1,40,000
            diamondStonePricePaise: 8500000,    // ₹85,000
            makingChargesPaise: 1500000,        // ₹15,000
            discountPricePaise: null,
            gstRate: 3
        },
        variantPrices: {
            'AV-EAR-001-V1': 24000000           // ₹2,40,000
        }
    },
    {
        productSku: 'AV-TIK-001',
        band: 'MAIN_JEWELLERY',
        productPricing: {
            baseMetalPricePaise: 10000000,      // ₹1,00,000
            diamondStonePricePaise: 6500000,    // ₹65,000
            makingChargesPaise: 1500000,        // ₹15,000
            discountPricePaise: null,
            gstRate: 3
        },
        variantPrices: {
            'AV-TIK-001-V1': 18000000           // ₹1,80,000
        }
    }
];

/**
 * Recomputes calculatedPricePaise from the pricing block.
 */
const computeCalculatedPrice = (pricing) => {
    const base =
        (pricing.baseMetalPricePaise || 0) +
        (pricing.diamondStonePricePaise || 0) +
        (pricing.makingChargesPaise || 0);
    return pricing.discountPricePaise ? pricing.discountPricePaise : base;
};

export const runPriceBandMigration = async () => {
    logger.info('===========================================================');
    logger.info('  AUREVÉ PRICE BAND MIGRATION — ENTRY-LEVEL & MAIN JEWELLERY');
    logger.info('===========================================================');

    if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-production')) {
        logger.error('ABORT: Production environment detected. Pass --force-production to override.');
        process.exit(1);
    }

    await connectDatabase();

    let productsUpdated = 0;
    let variantsUpdated = 0;
    const errors = [];

    try {
        for (const update of PRICE_UPDATES) {
            // 1. Locate product by SKU
            const product = await Product.findOne({ sku: update.productSku });

            if (!product) {
                errors.push(`Product not found: ${update.productSku}`);
                logger.warn(`⚠️  Skipped — product not found: ${update.productSku}`);
                continue;
            }

            // 2. Merge pricing block and recompute calculatedPricePaise
            const newPricing = {
                ...product.pricing.toObject?.() ?? product.pricing,
                ...update.productPricing
            };
            newPricing.calculatedPricePaise = computeCalculatedPrice(newPricing);

            product.pricing = newPricing;
            await product.save(); // triggers the pre-save hook that also recomputes calculatedPricePaise
            productsUpdated += 1;

            // 3. Update each child variant's priceInPaise
            const variantSkus = Object.keys(update.variantPrices);
            for (const variantSku of variantSkus) {
                const targetPrice = update.variantPrices[variantSku];

                const result = await ProductVariant.updateOne(
                    { productId: product._id, sku: variantSku },
                    {
                        $set: {
                            priceInPaise: targetPrice,
                            discountPriceInPaise: null
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    errors.push(`Variant not found: ${variantSku} under product ${update.productSku}`);
                    logger.warn(`   ⚠️ Variant not found: ${variantSku}`);
                } else if (result.modifiedCount > 0) {
                    variantsUpdated += 1;
                }
            }

            logger.info(
                `✓ ${update.productSku} [${update.band}] → product ₹${(newPricing.calculatedPricePaise / 100).toLocaleString('en-IN')} | variants: ${variantSkus.join(', ')}`
            );
        }

        // 4. Sanity check — verify final variant prices match expectations
        logger.info('-----------------------------------------------------------');
        logger.info('  VERIFICATION PASS — Confirm written variant prices');
        logger.info('-----------------------------------------------------------');

        for (const update of PRICE_UPDATES) {
            const product = await Product.findOne({ sku: update.productSku }).lean();
            if (!product) continue;

            const variants = await ProductVariant.find({ productId: product._id }).lean();
            for (const v of variants) {
                const expected = update.variantPrices[v.sku];
                const written = v.priceInPaise;
                const status = expected === undefined ? '—' : written === expected ? '✓' : '✗';
                logger.info(
                    `  ${status} ${v.sku.padEnd(20)} ₹${(written / 100).toLocaleString('en-IN').padStart(12)}${expected !== undefined ? ` (expected ₹${(expected / 100).toLocaleString('en-IN')})` : ''}`
                );
            }
        }

        // 5. Final summary
        logger.info('===========================================================');
        logger.info(`  COMPLETE — Products updated: ${productsUpdated} | Variants updated: ${variantsUpdated}`);
        if (errors.length > 0) {
            logger.warn(`  Issues (${errors.length}):`);
            errors.forEach((e) => logger.warn(`    • ${e}`));
        }
        logger.info('===========================================================');

        await disconnectDatabase();
        process.exit(errors.length > 0 ? 2 : 0);
    } catch (err) {
        logger.error('MIGRATION FAILED:', { message: err.message, stack: err.stack });
        await disconnectDatabase();
        process.exit(1);
    }
};

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('updatePriceBands.js')) {
    runPriceBandMigration();
}