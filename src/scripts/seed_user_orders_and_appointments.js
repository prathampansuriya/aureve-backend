import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

import { User } from '../models/User.js';
import { Address } from '../models/Address.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Coupon } from '../models/Coupon.js';
import { StoreLocation } from '../models/StoreLocation.js';
import { Appointment } from '../models/Appointment.js';
import { Notification } from '../models/Notification.js';

async function seedUserData() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const TARGET_EMAIL = 'prathampansuriya444@gmail.com';

  // 1. Find or verify target user
  let user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.error(`❌ User with email ${TARGET_EMAIL} not found in database.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`✅ Target user resolved: ${user.firstName} ${user.lastName} (${user._id})`);

  // 2. Resolve address
  let address = await Address.findOne({ userId: user._id });
  if (!address) {
    address = await Address.create({
      userId: user._id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone || '8765432109',
      addressLine1: 'BHAKTI ENCL NR S P RING ROAD NIKOL Nikol',
      addressLine2: '',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postalCode: '382350',
      country: 'India',
      addressType: 'HOME',
      isDefaultShipping: true,
      isDefaultBilling: true
    });
    console.log('✅ Created default delivery address for user');
  }

  // Ensure user default addresses reference this address
  if (!user.defaultShippingAddress || !user.defaultBillingAddress) {
    user.defaultShippingAddress = address._id;
    user.defaultBillingAddress = address._id;
    await user.save();
    console.log('✅ Updated user default address references');
  }

  const addressSnapshot = {
    fullName: address.fullName,
    phone: address.phone,
    alternatePhone: address.alternatePhone || '',
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    landmark: address.landmark || '',
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country || 'India'
  };

  // 3. Resolve Coupon FIRSTHEIRLOOM
  let coupon = await Coupon.findOne({ code: 'FIRSTHEIRLOOM' });
  if (!coupon) {
    coupon = await Coupon.create({
      code: 'FIRSTHEIRLOOM',
      description: 'Welcome Privilege of ₹5,000 on your first AUREVÉ acquisition.',
      discountType: 'FLAT_PAISE',
      discountValue: 500000,
      minOrderValuePaise: 5000000,
      maxDiscountLimitPaise: null,
      isActive: true,
      usageLimitPerUser: 1,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31')
    });
    console.log('✅ Created FIRSTHEIRLOOM coupon');
  }

  // 4. Resolve the 4 Products & Real Variants
  // Product 1: The Noor-e-Jahan Emerald & Polki Choker (with FIRSTHEIRLOOM coupon)
  const choker = await Product.findOne({ title: /Noor-e-Jahan/i });
  if (!choker) throw new Error('The Noor-e-Jahan Emerald & Polki Choker not found in database.');
  const chokerVariant = (await ProductVariant.findOne({ productId: choker._id })) || {
    _id: new mongoose.Types.ObjectId(),
    sku: `${choker.sku}-V1`,
    priceInPaise: 295000000,
    metalType: 'YELLOW_GOLD',
    metalPurity: '22K',
    size: '15-inch Articulated Fit',
    grossWeightGrams: 112.5
  };

  // Product 2: The Empress 5.12ct Solitaire Diamond Ring (without coupon)
  const ring = await Product.findOne({ title: /Empress.*Solitaire/i });
  if (!ring) throw new Error('The Empress Solitaire Diamond Ring not found in database.');
  const ringVariant = (await ProductVariant.findOne({ productId: ring._id })) || {
    _id: new mongoose.Types.ObjectId(),
    sku: `${ring.sku}-V1`,
    priceInPaise: 400000000,
    metalType: 'PLATINUM',
    metalPurity: '950_PLAT',
    size: '14 Standard',
    grossWeightGrams: 8.4
  };

  // Product 3: The Padmavati Peacock Nakshi Gold Kada (without coupon)
  const kada = await Product.findOne({ title: /Padmavati.*Kada/i });
  if (!kada) throw new Error('The Padmavati Peacock Nakshi Gold Kada not found in database.');
  const kadaVariant = (await ProductVariant.findOne({ productId: kada._id })) || {
    _id: new mongoose.Types.ObjectId(),
    sku: `${kada.sku}-V1`,
    priceInPaise: 125000000,
    metalType: 'YELLOW_GOLD',
    metalPurity: '22K',
    size: '2.6 Regal Hinge',
    grossWeightGrams: 74.2
  };

  // Product 4: The Astral Solitaire Floating Pendant (without coupon)
  const pendant = await Product.findOne({ title: /Astral.*Pendant/i });
  if (!pendant) throw new Error('The Astral Solitaire Floating Pendant not found in database.');
  const pendantVariant = (await ProductVariant.findOne({ productId: pendant._id })) || {
    _id: new mongoose.Types.ObjectId(),
    sku: `${pendant.sku}-V1`,
    priceInPaise: 90000000,
    metalType: 'WHITE_GOLD',
    metalPurity: '18K',
    size: '18-inch Floating Chain',
    grossWeightGrams: 14.8
  };

  const productOrderConfigs = [
    {
      product: choker,
      variant: chokerVariant,
      couponCode: 'FIRSTHEIRLOOM',
      discountPaise: 500000, // ₹5,000 flat discount
      daysAgoPlaced: 14,
      daysAgoDelivered: 10,
      trackingSuffix: '101'
    },
    {
      product: ring,
      variant: ringVariant,
      couponCode: null,
      discountPaise: 0,
      daysAgoPlaced: 10,
      daysAgoDelivered: 7,
      trackingSuffix: '102'
    },
    {
      product: kada,
      variant: kadaVariant,
      couponCode: null,
      discountPaise: 0,
      daysAgoPlaced: 7,
      daysAgoDelivered: 4,
      trackingSuffix: '103'
    },
    {
      product: pendant,
      variant: pendantVariant,
      couponCode: null,
      discountPaise: 0,
      daysAgoPlaced: 4,
      daysAgoDelivered: 2,
      trackingSuffix: '104'
    }
  ];

  console.log('\n--- Seeding 4 Completed Orders for User ---');
  const createdOrders = [];

  for (let i = 0; i < productOrderConfigs.length; i++) {
    const config = productOrderConfigs[i];
    const { product, variant, couponCode, discountPaise, daysAgoPlaced, daysAgoDelivered, trackingSuffix } = config;

    const unitPricePaise = variant.priceInPaise || 10000000;
    const makingChargesPaise = product.pricing?.makingChargesPaise || 15000000;
    const subtotalPaise = unitPricePaise;
    const taxableAmountPaise = Math.max(0, subtotalPaise - discountPaise);
    const gstRate = 3; // 3% standard GST on precious jewellery
    const gstPaise = Math.round((taxableAmountPaise * gstRate) / 100);
    const shippingFeePaise = 0; // Complimentary high-value vault transit
    const grandTotalPaise = taxableAmountPaise + gstPaise + shippingFeePaise;

    const placedDate = new Date(Date.now() - daysAgoPlaced * 24 * 60 * 60 * 1000);
    const confirmedDate = new Date(placedDate.getTime() + 15 * 60 * 1000);
    const processedDate = new Date(placedDate.getTime() + 24 * 60 * 60 * 1000);
    const shippedDate = new Date(placedDate.getTime() + 48 * 60 * 60 * 1000);
    const outForDeliveryDate = new Date(placedDate.getTime() + (daysAgoPlaced - daysAgoDelivered) * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000);
    const deliveredDate = new Date(Date.now() - daysAgoDelivered * 24 * 60 * 60 * 1000);

    const dateStr = placedDate.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderNumber = `AUR-${dateStr}-PR${i + 1}${randomHex.slice(0, 3)}`;

    // Check if an order for this user with this product already exists to avoid unintended duplicates
    const existingOrder = await Order.findOne({
      userId: user._id,
      'items.productId': product._id
    });

    if (existingOrder) {
      console.log(`ℹ️ Order already exists for product ${product.title} (Order: ${existingOrder.orderNumber}). Updating to DELIVERED.`);
      existingOrder.orderStatus = 'DELIVERED';
      existingOrder.paymentStatus = 'PAID';
      existingOrder.paymentMethod = 'RAZORPAY';
      await existingOrder.save();
      createdOrders.push(existingOrder);
      continue;
    }

    const primaryImage = product.images?.[0]?.url || variant.variantSpecificMedia?.[0]?.url || '';

    const orderDoc = {
      orderNumber,
      userId: user._id,
      items: [
        {
          productId: product._id,
          variantId: variant._id,
          title: product.title,
          sku: variant.sku,
          quantity: 1,
          unitPricePaise,
          makingChargesPaise,
          gstPaise,
          totalPaise: unitPricePaise,
          image: primaryImage,
          metalSpecifications: {
            metalType: variant.metalType || 'YELLOW_GOLD',
            metalPurity: variant.metalPurity || '22K',
            size: variant.size || 'Standard',
            grossWeightGrams: variant.grossWeightGrams || 50
          },
          certificateNumber: `BIS-AUR-${dateStr}-${i + 1}`
        }
      ],
      shippingAddress: addressSnapshot,
      billingAddress: addressSnapshot,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PAID',
      razorpayOrderId: `order_RzpPratham${i + 1}_${Date.now().toString().slice(-6)}`,
      orderStatus: 'DELIVERED',
      financialBreakdown: {
        subtotalPaise,
        makingChargesPaise,
        gstPaise,
        discountPaise,
        shippingFeePaise,
        grandTotalPaise
      },
      couponApplied: couponCode
        ? {
            code: couponCode,
            discountPaise
          }
        : {
            code: null,
            discountPaise: 0
          },
      tracking: {
        courierName: 'Sequel Secure Logistics (Armoured High-Value Transit)',
        trackingNumber: `SEQL-AUR-2026-PR${trackingSuffix}`,
        trackingUrl: `https://tracking.sequelglobal.com/shipment/SEQL-AUR-2026-PR${trackingSuffix}`,
        estimatedDeliveryDate: deliveredDate,
        statusTimeline: [
          {
            status: 'PLACED',
            message: 'Order authenticated and confirmed with bespoke vault allocation.',
            timestamp: placedDate
          },
          {
            status: 'CONFIRMED',
            message: 'Payment received successfully via Razorpay. Order confirmed.',
            timestamp: confirmedDate
          },
          {
            status: 'PROCESSING',
            message: 'Master karigar quality certification and BIS Hallmark verification completed.',
            timestamp: processedDate
          },
          {
            status: 'SHIPPED',
            message: 'Dispatched in GPS-monitored Sequel Secure Armoured Escort vault.',
            timestamp: shippedDate
          },
          {
            status: 'OUT_FOR_DELIVERY',
            message: 'Armed courier out for delivery with dual-factor OTP receipt verification.',
            timestamp: outForDeliveryDate
          },
          {
            status: 'DELIVERED',
            message: `Delivered and verified by patron ${user.firstName} ${user.lastName}.`,
            timestamp: deliveredDate
          }
        ]
      },
      giftDetails: {
        isGift: i === 0, // Order 1 marked as luxury gift presentation
        recipientName: i === 0 ? `${user.firstName} ${user.lastName}` : '',
        message: i === 0 ? 'To a lifetime of timeless grace and heirloom grandeur.' : ''
      },
      placedAt: placedDate,
      createdAt: placedDate,
      updatedAt: deliveredDate
    };

    const newOrder = await Order.create(orderDoc);
    console.log(`✅ Created Order ${newOrder.orderNumber}:`);
    console.log(`   Piece: ${product.title} (${variant.sku})`);
    console.log(`   Coupon: ${couponCode ? `${couponCode} (-₹${(discountPaise / 100).toLocaleString('en-IN')})` : 'None'}`);
    console.log(`   Total: ₹${(grandTotalPaise / 100).toLocaleString('en-IN')} | Payment: RAZORPAY (PAID) | Status: DELIVERED`);

    // Create corresponding Payment record
    const rzpPaymentId = `pay_RzpPratham${i + 1}_${Date.now().toString().slice(-6)}`;
    await Payment.create({
      orderId: newOrder._id,
      transactionId: rzpPaymentId,
      razorpayOrderId: newOrder.razorpayOrderId,
      razorpaySignature: `sig_verified_${crypto.randomBytes(16).toString('hex')}`,
      gateway: 'RAZORPAY',
      amountPaise: grandTotalPaise,
      currency: 'INR',
      method: i % 2 === 0 ? 'CARD' : 'UPI',
      status: 'CAPTURED',
      createdAt: confirmedDate,
      updatedAt: confirmedDate
    });

    // Record coupon redemption if coupon applied
    if (couponCode) {
      await Coupon.updateOne(
        { code: couponCode },
        {
          $inc: { usageCount: 1 },
          $push: {
            redemptions: {
              userId: user._id,
              orderId: newOrder._id,
              redeemedAt: placedDate,
              discountAmountPaise: discountPaise
            }
          }
        }
      );
      console.log(`   Registered redemption of ${couponCode} in Coupon ledger.`);
    }

    // Create persistent notification for this order
    await Notification.create({
      userId: user._id,
      title: `Order Delivered: ${newOrder.orderNumber}`,
      message: `Your fine jewellery acquisition of ${product.title} has been successfully delivered.`,
      type: 'ORDER_UPDATE',
      linkUrl: `/account/orders/${newOrder.orderNumber}`,
      isRead: false,
      createdAt: deliveredDate
    });

    createdOrders.push(newOrder);
  }

  // 5. Seed [Schedule VIP] Salon Appointments
  console.log('\n--- Seeding [Schedule VIP] Salons Data for User ---');

  const mumbaiSalon = await StoreLocation.findOne({ city: /Mumbai/i, isActive: true }) || await StoreLocation.findOne({ isActive: true });
  if (!mumbaiSalon) {
    console.error('❌ No active StoreLocation found in database.');
    await mongoose.disconnect();
    return;
  }

  // 5a. Upcoming Confirmed VIP Consultation
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 4);
  upcomingDate.setHours(11, 30, 0, 0);

  const existingUpcoming = await Appointment.findOne({
    userId: user._id,
    status: { $in: ['CONFIRMED', 'REQUESTED'] },
    scheduledDate: { $gte: new Date() }
  });

  if (!existingUpcoming) {
    const upcomingAppt = await Appointment.create({
      userId: user._id,
      clientName: `${user.firstName} ${user.lastName}`.trim(),
      clientEmail: user.email,
      clientPhone: user.phone || '8765432109',
      appointmentType: 'IN_STORE_VIP',
      storeLocationId: mumbaiSalon._id,
      scheduledDate: upcomingDate,
      timeSlot: '11:30 AM - 01:00 PM',
      interestCategories: ['Imperial Chokers & Necklaces', 'Solitaire Diamond Rings', 'Heritage Bangles & Kadas'],
      status: 'CONFIRMED',
      notes: 'VIP Salon private vault viewing for bridal trousseau and imperial polki suites.',
      conciergeNotes: 'Private viewing suite pre-assigned. Welcome ceremonial refreshments & security escort arranged.',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Created Upcoming VIP Salon Appointment:`);
    console.log(`   Salon: ${mumbaiSalon.name} (${mumbaiSalon.city})`);
    console.log(`   Date: ${upcomingDate.toDateString()} | Slot: 11:30 AM - 01:00 PM`);
    console.log(`   Status: CONFIRMED`);

    await Notification.create({
      userId: user._id,
      title: 'VIP Salon Appointment Confirmed',
      message: `Your VIP private salon appointment at ${mumbaiSalon.name} is confirmed for ${upcomingDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at 11:30 AM.`,
      type: 'APPOINTMENT_REMINDER',
      linkUrl: `/account/appointments`,
      isRead: false
    });
  } else {
    console.log(`ℹ️ User already has an active upcoming appointment at ${mumbaiSalon.name}`);
  }

  // 5b. Past Completed VIP Consultation (Initial Choker Trial)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 16);
  pastDate.setHours(15, 0, 0, 0);

  const existingPast = await Appointment.findOne({
    userId: user._id,
    status: 'COMPLETED'
  });

  if (!existingPast) {
    const pastAppt = await Appointment.create({
      userId: user._id,
      clientName: `${user.firstName} ${user.lastName}`.trim(),
      clientEmail: user.email,
      clientPhone: user.phone || '8765432109',
      appointmentType: 'IN_STORE_VIP',
      storeLocationId: mumbaiSalon._id,
      scheduledDate: pastDate,
      timeSlot: '03:00 PM - 04:30 PM',
      interestCategories: ['High Jewellery', 'The Noor-e-Jahan Choker'],
      status: 'COMPLETED',
      notes: 'Private consultation and trial of The Noor-e-Jahan Emerald Choker.',
      conciergeNotes: 'Patron acquired The Noor-e-Jahan suite with First Heirloom privilege.',
      createdAt: pastDate,
      updatedAt: pastDate
    });

    console.log(`✅ Created Historical Completed VIP Consultation:`);
    console.log(`   Salon: ${mumbaiSalon.name} | Date: ${pastDate.toDateString()} | Status: COMPLETED`);
  }

  console.log('\n======================================================');
  console.log(`🎉 Seeding successfully completed for ${TARGET_EMAIL}:`);
  console.log(`   - 4 Orders placed, paid via Razorpay, and marked DELIVERED`);
  console.log(`   - The Noor-e-Jahan Choker with FIRSTHEIRLOOM coupon (-₹5,000)`);
  console.log(`   - 3 Other pieces without coupons`);
  console.log(`   - [Schedule VIP] Salons appointments active in database`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seedUserData().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
