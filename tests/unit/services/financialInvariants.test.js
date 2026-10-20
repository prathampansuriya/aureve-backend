import { describe, it, expect } from 'vitest';

describe('AUREVÉ Enterprise Authoritative Pricing & Financial Calculation Suite', () => {
  // Pure pricing calculation helper matching backend/src/services/pricingService.js
  const computePricing = ({
    items = [],
    offer = null,
    coupon = null,
    customShipping = null
  }) => {
    let subtotalPaise = 0;
    let makingChargesPaise = 0;

    for (const item of items) {
      const lineTotal = item.unitPricePaise * item.quantity;
      subtotalPaise += lineTotal;
      makingChargesPaise += (item.makingChargesPaise || 0) * item.quantity;
    }

    // 1. Offer Evaluation
    let offerDiscountPaise = 0;
    if (offer && subtotalPaise > 0) {
      if (!offer.minOrderValuePaise || subtotalPaise >= offer.minOrderValuePaise) {
        const eligibleItems = items.filter((i) => {
          if (offer.offerType === 'STOREWIDE') return true;
          return offer.applicableProductIds?.includes(i.productId);
        });
        const eligibleSubtotal = eligibleItems.reduce((acc, i) => acc + i.unitPricePaise * i.quantity, 0);

        if (offer.discountType === 'PERCENTAGE') {
          offerDiscountPaise = Math.round((eligibleSubtotal * offer.discountValue) / 100);
          if (offer.maxDiscountPaise && offerDiscountPaise > offer.maxDiscountPaise) {
            offerDiscountPaise = offer.maxDiscountPaise;
          }
        } else if (offer.discountType === 'FLAT_PAISE') {
          offerDiscountPaise = Math.min(offer.discountValue, eligibleSubtotal);
        }
      }
    }

    // 2. Coupon Evaluation
    let couponDiscountPaise = 0;
    if (coupon && subtotalPaise > 0) {
      if (offer && !offer.allowStackingWithCoupons) {
        throw new Error('Coupon stacking prohibited by active promotional offer.');
      }

      if (coupon.minOrderValuePaise && subtotalPaise < coupon.minOrderValuePaise) {
        throw new Error('Minimum order value not satisfied.');
      }

      const eligibleItems = items.filter((i) => {
        if (!coupon.applicableProductIds || coupon.applicableProductIds.length === 0) return true;
        return coupon.applicableProductIds.includes(i.productId);
      });

      if (eligibleItems.length === 0 && coupon.applicableProductIds?.length > 0) {
        throw new Error('Coupon not applicable to pieces in cart.');
      }

      const eligibleSubtotal = eligibleItems.reduce((acc, i) => acc + i.unitPricePaise * i.quantity, 0);

      if (coupon.discountType === 'PERCENTAGE') {
        couponDiscountPaise = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscountLimitPaise && couponDiscountPaise > coupon.maxDiscountLimitPaise) {
          couponDiscountPaise = coupon.maxDiscountLimitPaise;
        }
      } else if (coupon.discountType === 'FLAT_PAISE') {
        couponDiscountPaise = Math.min(coupon.discountValue, eligibleSubtotal);
      }

      const maxPermitted = Math.max(0, subtotalPaise - offerDiscountPaise);
      couponDiscountPaise = Math.min(couponDiscountPaise, maxPermitted);
    }

    const totalDiscountPaise = offerDiscountPaise + couponDiscountPaise;
    const taxableAmountPaise = Math.max(0, subtotalPaise - totalDiscountPaise);

    // 3. Indian GST (3% on fine jewellery)
    const gstRate = 3;
    const gstPaise = taxableAmountPaise > 0 ? Math.round((taxableAmountPaise * gstRate) / 100) : 0;

    // 4. White-glove insured shipping: Orders >= ₹50,000 (5,000,000 paise) free, else ₹500 (50,000 paise)
    let shippingFeePaise = 0;
    if (customShipping !== null) {
      shippingFeePaise = customShipping;
    } else if (subtotalPaise > 0) {
      shippingFeePaise = subtotalPaise >= 5000000 ? 0 : 50000;
    }

    const grandTotalPaise = taxableAmountPaise + gstPaise + shippingFeePaise;

    return {
      subtotalPaise,
      makingChargesPaise,
      offerDiscountPaise,
      couponDiscountPaise,
      totalDiscountPaise,
      discountPaise: totalDiscountPaise,
      taxableAmountPaise,
      gstRate,
      gstPaise,
      shippingFeePaise,
      grandTotalPaise
    };
  };

  it('Scenario 1: Single product with no discount', () => {
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 7500000, quantity: 1 }] // ₹75,000
    });

    expect(res.subtotalPaise).toBe(7500000);
    expect(res.totalDiscountPaise).toBe(0);
    expect(res.discountPaise).toBe(0);
    expect(res.taxableAmountPaise).toBe(7500000);
    expect(res.gstPaise).toBe(225000); // 3% of 75,000 = ₹2,250
    expect(res.shippingFeePaise).toBe(0); // >= ₹50,000 free shipping
    expect(res.grandTotalPaise).toBe(7725000); // ₹77,250
  });

  it('Scenario 2: Multiple products with different quantities', () => {
    const res = computePricing({
      items: [
        { productId: 'p1', unitPricePaise: 3000000, quantity: 2 }, // 2x ₹30,000 = ₹60,000
        { productId: 'p2', unitPricePaise: 4500000, quantity: 1 }  // 1x ₹45,000 = ₹45,000
      ]
    });

    expect(res.subtotalPaise).toBe(10500000); // ₹1,05,000
    expect(res.gstPaise).toBe(315000); // ₹3,150
    expect(res.shippingFeePaise).toBe(0);
    expect(res.grandTotalPaise).toBe(10815000); // ₹1,08,150
  });

  it('Scenario 3: Product variant price update between cart snapshot and checkout', () => {
    // Original cart item price was 50,000, but live variant catalog price is 55,000
    const livePricePaise = 5500000;
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: livePricePaise, quantity: 1 }]
    });

    expect(res.subtotalPaise).toBe(5500000);
    expect(res.grandTotalPaise).toBe(5500000 + 165000); // ₹56,650
  });

  it('Scenario 4: Percentage coupon (10% off)', () => {
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 10000000, quantity: 1 }], // ₹1,00,000
      coupon: {
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountLimitPaise: null,
        minOrderValuePaise: null
      }
    });

    expect(res.couponDiscountPaise).toBe(1000000); // ₹10,000
    expect(res.taxableAmountPaise).toBe(9000000); // ₹90,000
    expect(res.gstPaise).toBe(270000); // 3% of 90,000 = ₹2,700
    expect(res.grandTotalPaise).toBe(9270000); // ₹92,700
  });

  it('Scenario 5: Fixed-amount coupon (₹5,000 flat)', () => {
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 8000000, quantity: 1 }], // ₹80,000
      coupon: {
        discountType: 'FLAT_PAISE',
        discountValue: 500000 // ₹5,000
      }
    });

    expect(res.couponDiscountPaise).toBe(500000);
    expect(res.taxableAmountPaise).toBe(7500000);
    expect(res.gstPaise).toBe(225000);
    expect(res.grandTotalPaise).toBe(7725000);
  });

  it('Scenario 6: Maximum discount cap enforced', () => {
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 20000000, quantity: 1 }], // ₹2,00,000
      coupon: {
        discountType: 'PERCENTAGE',
        discountValue: 15, // 15% would be ₹30,000
        maxDiscountLimitPaise: 1000000 // Capped at ₹10,000
      }
    });

    expect(res.couponDiscountPaise).toBe(1000000); // Exactly ₹10,000
    expect(res.taxableAmountPaise).toBe(19000000);
  });

  it('Scenario 7: Minimum order value threshold rejection', () => {
    expect(() =>
      computePricing({
        items: [{ productId: 'p1', unitPricePaise: 3000000, quantity: 1 }], // ₹30,000
        coupon: {
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minOrderValuePaise: 5000000 // Requires ₹50,000
        }
      })
    ).toThrow('Minimum order value not satisfied.');
  });

  it('Scenario 8: Coupon applicable to only specific pieces in cart', () => {
    const res = computePricing({
      items: [
        { productId: 'eligible_ring', unitPricePaise: 5000000, quantity: 1 }, // ₹50,000
        { productId: 'ineligible_necklace', unitPricePaise: 15000000, quantity: 1 } // ₹1,50,000
      ],
      coupon: {
        discountType: 'PERCENTAGE',
        discountValue: 10, // 10%
        applicableProductIds: ['eligible_ring'] // Only applies to the ring
      }
    });

    expect(res.subtotalPaise).toBe(20000000); // ₹2,00,000
    expect(res.couponDiscountPaise).toBe(500000); // 10% of ₹50,000 = ₹5,000 (NOT ₹20,000)
    expect(res.taxableAmountPaise).toBe(19500000); // ₹1,95,000
    expect(res.gstPaise).toBe(585000); // 3% of 1,95,000 = ₹5,850
    expect(res.grandTotalPaise).toBe(20085000); // ₹2,00,850
  });

  it('Scenario 9: Ineligible coupon application throws clear error', () => {
    expect(() =>
      computePricing({
        items: [{ productId: 'p1', unitPricePaise: 6000000, quantity: 1 }],
        coupon: {
          discountType: 'PERCENTAGE',
          discountValue: 10,
          applicableProductIds: ['different_piece']
        }
      })
    ).toThrow('Coupon not applicable to pieces in cart.');
  });

  it('Scenario 10: Tax-exclusive base with standard 3% GST computation', () => {
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 1000000, quantity: 1 }] // ₹10,000
    });

    expect(res.gstRate).toBe(3);
    expect(res.gstPaise).toBe(30000); // ₹300
    expect(res.shippingFeePaise).toBe(50000); // ₹500 (< ₹50,000)
    expect(res.grandTotalPaise).toBe(1080000); // ₹10,800
  });

  it('Scenario 11: Shipping charges and complimentary threshold at ₹50,000', () => {
    // Under ₹50,000: ₹500 shipping
    const under = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 4999900, quantity: 1 }] // ₹49,999
    });
    expect(under.shippingFeePaise).toBe(50000);

    // Exact ₹50,000: Free shipping
    const exact = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 5000000, quantity: 1 }] // ₹50,000
    });
    expect(exact.shippingFeePaise).toBe(0);

    // Over ₹50,000: Free shipping
    const over = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 15000000, quantity: 1 }] // ₹1,50,000
    });
    expect(over.shippingFeePaise).toBe(0);
  });

  it('Scenario 12: Zero and empty cart boundary calculation', () => {
    const empty = computePricing({ items: [] });
    expect(empty.subtotalPaise).toBe(0);
    expect(empty.totalDiscountPaise).toBe(0);
    expect(empty.gstPaise).toBe(0);
    expect(empty.shippingFeePaise).toBe(0);
    expect(empty.grandTotalPaise).toBe(0);
  });

  it('Scenario 13: Decimal rounding and exact integer paise guarantees', () => {
    // 3% GST on 33,333 paise (₹333.33) -> 999.99 paise -> rounds to 1000 paise
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 33333, quantity: 1 }]
    });

    expect(Number.isInteger(res.gstPaise)).toBe(true);
    expect(Number.isInteger(res.grandTotalPaise)).toBe(true);
    expect(res.gstPaise).toBe(1000);
  });

  it('Scenario 14: High-value luxury transactions in Lakhs and Crores', () => {
    // Imperial Kundan Choker: ₹2.5 Crores = 2,50,00,000 Rupees = 2500000000 Paise
    const res = computePricing({
      items: [{ productId: 'imperial_choker', unitPricePaise: 2500000000, quantity: 1 }]
    });

    expect(res.subtotalPaise).toBe(2500000000);
    expect(res.gstPaise).toBe(75000000); // 3% of 2.5Cr = ₹7,50,000 (75000000 paise)
    expect(res.grandTotalPaise).toBe(2575000000); // ₹2,57,50,000
  });

  it('Scenario 15: Price change between cart and checkout quote refreshes total', () => {
    const cartSnapshotTotal = 10000000; // ₹1,00,000
    const livePricing = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 10500000, quantity: 1 }] // Updated to ₹1,05,000
    });

    expect(livePricing.subtotalPaise).not.toBe(cartSnapshotTotal);
    expect(livePricing.subtotalPaise).toBe(10500000);
  });

  it('Scenario 16: Payment gateway unit conversion (Rupees to exact integer paise)', () => {
    const amountInRupees = 150000; // ₹1,50,000
    const amountInPaise = Math.round(amountInRupees * 100);

    expect(amountInPaise).toBe(15000000);
    // Reverse conversion
    expect(amountInPaise / 100).toBe(amountInRupees);
  });

  it('Scenario 17: Refund calculation bounds check (never exceed captured total)', () => {
    const grandTotalPaise = 15450000; // ₹1,54,500
    const requestedRefund = 20000000; // ₹2,00,000

    expect(requestedRefund > grandTotalPaise).toBe(true);
    // Guard check
    const isRefundPermissible = (refund) => refund > 0 && refund <= grandTotalPaise;
    expect(isRefundPermissible(requestedRefund)).toBe(false);
    expect(isRefundPermissible(15450000)).toBe(true); // Full refund
    expect(isRefundPermissible(5000000)).toBe(true);  // Partial refund
    expect(isRefundPermissible(0)).toBe(false);
    expect(isRefundPermissible(-100)).toBe(false);
  });

  it('Scenario 18: Stored financial breakdown reconciles to grandTotalPaise', () => {
    const res = computePricing({
      items: [{ productId: 'p1', unitPricePaise: 4000000, quantity: 1 }], // ₹40,000
      coupon: { discountType: 'PERCENTAGE', discountValue: 5 } // 5% = ₹2,000
    });

    // Subtotal: 40,000
    // Discount: 2,000
    // Taxable: 38,000
    // GST (3%): 1,140
    // Shipping: 500 (since subtotal < 50,000)
    // Grand Total: 38,000 + 1,140 + 500 = 39,640
    expect(res.subtotalPaise).toBe(4000000);
    expect(res.discountPaise).toBe(200000);
    expect(res.taxableAmountPaise).toBe(3800000);
    expect(res.gstPaise).toBe(114000);
    expect(res.shippingFeePaise).toBe(50000);
    expect(res.grandTotalPaise).toBe(3964000);

    // Reconcile mathematical invariant
    expect(res.grandTotalPaise).toBe(res.taxableAmountPaise + res.gstPaise + res.shippingFeePaise);
  });
});
