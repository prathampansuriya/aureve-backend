import { PageContent } from '../models/PageContent.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Default fallback content for Our Story and Bespoke Services
 * Ensures pages always have rich initial content even before admin customization.
 */
export const DEFAULT_PAGE_CONTENTS = {
  OUR_STORY: {
    pageKey: 'OUR_STORY',
    title: 'Our Story & Sovereign Heritage',
    subtitle: 'A Legacy of Sovereign Gold & Generational Karigari',
    heroDescription:
      'Rooted in the architectural majesty of Rajputana polki and Mughal jadau, AUREVÉ merges centuries of royal Indian craftsmanship with modern haute joaillerie sensibilities.',
    heroMedia: {
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
      publicId: 'aureve_story_hero_default',
      mediaType: 'IMAGE',
      alt: 'AUREVÉ Master Karigar Inspecting Sovereign Bullion'
    },
    sections: [
      {
        sectionKey: 'HALLMARK_PARTS',
        title: 'Anatomy of Sovereign Authentication',
        subtitle: '100% Government BIS Hallmarked 916 Bullion',
        description: 'Every creation forged in our ateliers carries the government-certified tripartite seal.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 1,
        isPublished: true,
        items: [
          {
            key: 'bisLogo',
            title: 'Official BIS Triangular Logo',
            subtitle: 'Bureau of Indian Standards Sovereign Seal',
            description: 'Certifies that the bullion conforms to mandatory Indian Standards (IS 1417) under national consumer protection legislation.',
            standard: 'IS 1417:2019 Certified'
          },
          {
            key: 'purity',
            title: 'Purity & Karat Grade (22K916 / 18K750)',
            subtitle: 'Exact Bullion Purity Ratio',
            description: 'Signifies the precise gold content: 22K916 denotes 91.6% pure gold alloyed for tensile strength, 18K750 denotes 75.0% pure gold for diamond setting.',
            standard: 'Assayed via Fire Assay Spectrometry'
          },
          {
            key: 'huid',
            title: '6-Digit Alphanumeric HUID',
            subtitle: 'Hallmark Unique Identification Number',
            description: 'Laser-inscribed with a singular 6-character code (e.g. AV9168). Patrons can verify directly on the Government BIS Care app.',
            standard: '100% Traceable on BIS National Database'
          },
          {
            key: 'assayCenter',
            title: 'Accredited Assaying Laboratory Stamp',
            subtitle: 'Third-Party Laser Verification',
            description: 'The registered identification mark of the government-recognized Assaying and Hallmarking Centre (AHC) where purity was audited.',
            standard: 'Government Recognized AHC Lab'
          }
        ]
      },
      {
        sectionKey: 'ATELIER_STAGES',
        title: 'The Sovereign Karigari Journey',
        subtitle: 'From Gouache Illustration to Finished Masterpiece',
        description: 'Discover the disciplined, unhurried steps of generational Indian goldsmithing.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 2,
        isPublished: true,
        items: [
          {
            id: 'sketch',
            num: '01',
            title: 'Archival Gouache Illustration',
            artisan: 'Chief Jewellery Architect',
            duration: '14 to 28 Days',
            description: 'Lifesize watercolour gouache illustrations drafted on archival handmade parchment with millimeter light refraction angles.',
            image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=900&auto=format&fit=crop',
            details: [
              'Rendered at exact 1:1 scale for anatomical ergonomics',
              'Reflects natural candlelight and daylight gemstone behavior',
              'Archived in the AUREVÉ Vault for future provenance records'
            ]
          },
          {
            id: 'metallurgy',
            num: '02',
            title: 'Metallurgical Alchemy & Bullion',
            artisan: 'Master Metallurgist',
            duration: '48 Bench Hours',
            description: 'We refine 24K 999 pure bullion with virgin copper and silver in electric vacuum induction furnaces, creating our proprietary Sovereign Gold alloy.',
            image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=900&auto=format&fit=crop',
            details: [
              'Zero recycled scrap metals without re-refining',
              'Controlled micro-crystal density preventing metal porosity',
              'Hypoallergenic composition with zero nickel or toxic cadmium'
            ]
          },
          {
            id: 'jadau',
            num: '03',
            title: 'The Sacred Jadau & Kundan Setting',
            artisan: 'Generational Ustaads (Jaipur Guild)',
            duration: '120 to 200 Bench Hours',
            description: 'Uncut Golconda-style polki diamonds cushioned in 24K hyper-pure refined gold foil, tamped cold around each gem with steel burnishers.',
            image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=900&auto=format&fit=crop',
            details: [
              '100% natural, untreated gemstones set without adhesives',
              'Reverse Meenakari miniature enamel painting applied at 800°C',
              'Articulated linkages allowing necklaces to drape like silk'
            ]
          },
          {
            id: 'hallmarking',
            num: '04',
            title: 'Laser Inscription & Micro-Assay',
            artisan: 'Chief Quality Gemologist & BIS Assayer',
            duration: 'Independent Audit',
            description: 'Subjected to XRF spectrometry and 40x stereoscopic microscopic inspection before being permanently laser-etched with its sovereign BIS 916 Hallmark.',
            image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=900&auto=format&fit=crop',
            details: [
              'Non-destructive XRF laser purity verification',
              'GIA & IGI diamond certification cross-referenced',
              'Armored vault quarantine prior to white-glove dispatch'
            ]
          }
        ]
      }
    ],
    cta: {
      title: 'Experience the AUREVÉ Vault in Person',
      subtitle: 'Schedule a private consultation in our flagship salons or request an armored home presentation.',
      buttonText: 'Book VIP Appointment',
      buttonLink: '/appointments'
    },
    seo: {
      metaTitle: 'Our Story & Sovereign Heritage | AUREVÉ Haute Joaillerie',
      metaDescription: 'Discover the legacy of AUREVÉ: 100% BIS hallmarked sovereign gold, generational karigars, and certified natural diamonds.'
    },
    isPublished: true
  },

  BESPOKE_SERVICES: {
    pageKey: 'BESPOKE_SERVICES',
    title: 'Bespoke Atelier Commissions',
    subtitle: 'From Imaginative Reverie to Sovereign Heirloom',
    heroDescription:
      'Commission one-of-a-kind high jewellery crafted exclusively around your personal legacy, rare natural gemstones, and anatomical specifications.',
    heroMedia: {
      url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop',
      publicId: 'aureve_bespoke_hero_default',
      mediaType: 'IMAGE',
      alt: 'Bespoke Haute Joaillerie Wax Prototype and Gouache Sketch'
    },
    sections: [
      {
        sectionKey: 'BESPOKE_JOURNEY',
        title: 'The Four Pillars of Commissioning',
        subtitle: 'A Collaborative, Unhurried Haute Joaillerie Experience',
        description: 'Our bespoke process ensures precision fit, rare gemological curation, and enduring value.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 1,
        isPublished: true,
        items: [
          {
            step: '01',
            title: 'Private Design Consultation',
            duration: '60–90 Minutes',
            description: 'Meet with our Chief Jewellery Architect in a private salon suite or via encrypted virtual viewing.',
            deliverable: 'Initial anatomical moodboard & proportion study'
          },
          {
            step: '02',
            title: 'Rare Gemstone Sourcing',
            duration: '7–14 Days',
            description: 'Our gemologists curate a bespoke parcel of natural, conflict-free gemstones from prestigious vaults.',
            deliverable: 'Private viewing of loose stones under microscopy'
          },
          {
            step: '03',
            title: 'Gouache Painting & 3D Wax Prototype',
            duration: '10–14 Days',
            description: 'Every contour is rendered in a lifesize watercolour gouache illustration and a tactile 3D prototype.',
            deliverable: 'Tactile try-on model and archival painting'
          },
          {
            step: '04',
            title: 'Master Karigari Hand-Forging',
            duration: '4–8 Weeks',
            description: 'Our generational ustaads forge your piece in sovereign gold or platinum with microscopic pavé settings.',
            deliverable: 'Delivered in leather presentation vault with laser provenance book'
          }
        ]
      },
      {
        sectionKey: 'FEATURED_COMMISSIONS',
        title: 'Archived Bespoke Masterpieces',
        subtitle: 'Past Private Commissions For Discerning Patrons',
        description: 'Explore celebrated bespoke heirlooms forged for weddings and royal celebrations.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 2,
        isPublished: true,
        items: [
          {
            title: 'The Maharani Nur Jahan Emerald Suite',
            category: 'Imperial Choker & Earring Suite',
            specs: '84 Carats Zambian Emeralds • 22K Sovereign Gold',
            craftTime: '320 Bench Hours',
            image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
            story: 'Commissioned for a high-profile heritage wedding in Udaipur.'
          },
          {
            title: 'The Solitaire Constellation Ring',
            category: '5.20 Carat Oval Solitaire Ring',
            specs: 'D-Flawless Type IIa Diamond • 950 Pure Platinum',
            craftTime: '140 Bench Hours',
            image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=800&auto=format&fit=crop',
            story: 'Hand-forged in pure 950 platinum with micro-pave diamond shoulders.'
          },
          {
            title: 'The Padmavati Peacock Meenakari Kada',
            category: 'Heritage Bangle Pair',
            specs: '118 Grams 22K Gold • Unheated Burmese Rubies',
            craftTime: '210 Bench Hours',
            image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop',
            story: 'Sculpted with traditional Dravidian temple repoussé, depicting peacocks with cabochon ruby plumage.'
          }
        ]
      }
    ],
    cta: {
      title: 'Commence Your Sovereign Commission',
      subtitle: 'Complete the enquiry dossier below or arrange an in-person meeting with our master curators.',
      buttonText: 'Submit Commission Dossier',
      buttonLink: '#bespoke-enquiry-form'
    },
    seo: {
      metaTitle: 'Bespoke Atelier Jewellery Commissions | AUREVÉ',
      metaDescription: 'Commission custom haute joaillerie, bridal suites, and rare gemstone engagement rings with AUREVÉ.'
    },
    isPublished: true
  },
  TERMS_OF_SERVICE: {
    pageKey: 'TERMS_OF_SERVICE',
    title: 'Terms & Conditions of Haute Joaillerie',
    subtitle: 'The Legal Covenant & Patron Protocols of Maison AUREVÉ',
    heroDescription:
      'By entering our salons, utilizing our digital boutiques, or commissioning bespoke creations with AUREVÉ, you consent to the covenants of authenticity, insured custody, and intellectual integrity set forth herein.',
    heroMedia: {
      url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop',
      publicId: 'aureve_terms_hero_default',
      mediaType: 'IMAGE',
      alt: 'AUREVÉ Sovereign Hallmark Standards'
    },
    sections: [
      {
        sectionKey: 'PURITY_AND_HALLMARKING',
        title: '1. Metallurgical Purity & BIS Sovereign Certification',
        subtitle: 'Bureau of Indian Standards Mandatory Hallmarking',
        description:
          'All gold bullion forged at AUREVÉ complies strictly with IS 1417:2019 standards. Each finished creation is independently laser-assayed and inscribed with its distinct 6-character HUID code, verifiable on the national BIS Care database. Uncut polki diamonds, solitaires, and coloured gemstones are accompanied by GIA, IGI, or authorized gemological dossiers.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 1,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'BESPOKE_COMMISSIONS',
        title: '2. Bespoke Commission & Tailored Creations',
        subtitle: 'Custom Atelier Protocols',
        description:
          'Bespoke commissions initiate upon formal approval of the watercolour gouache design and receipt of an initial non-refundable artisan retainer (minimum 50%). Because bespoke pieces are customized to anatomical proportions and individual gem specifications, they are strictly non-cancelable once precious metal casting has begun.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 2,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'INSURED_DELIVERY',
        title: '3. White-Glove Armored Transit & Delivery',
        subtitle: 'Complete Insurance Stewardship',
        description:
          'Every shipment dispatched by AUREVÉ is fully insured against in-transit damage or loss. Shipments above ₹10,00,000 are delivered via specialized armored security personnel. A valid government photo ID and single-use delivery passcode (OTP) are strictly required upon physical handover.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 3,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'LIFETIME_BUYBACK',
        title: '4. Lifetime Buyback, Exchange & Upgrades',
        subtitle: 'Enduring Bullion Transparency',
        description:
          'AUREVÉ guarantees a transparent lifetime buyback and exchange policy based on prevailing market bullion rates on the date of redemption, deducting standard making fees and statutory taxes. Natural diamonds receive 100% exchange credit toward high jewellery creations of equal or greater value.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 4,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'INTELLECTUAL_PROPERTY',
        title: '5. Intellectual Property & Design Copyright',
        subtitle: 'Artisanal Protection',
        description:
          'All silhouettes, CAD renderings, gouache artwork, proprietary stone settings, trademarks, and imagery remain the exclusive intellectual property of AUREVÉ Maison. Reproduction, imitation, or commercial duplication is strictly prohibited.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 5,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'DISPUTE_RESOLUTION',
        title: '6. Governing Law & Exclusive Jurisdiction',
        subtitle: 'Arbitration Framework',
        description:
          'These terms are governed by the laws of India. Any controversy, dispute, or claim arising out of transactions with Maison AUREVÉ shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 6,
        isPublished: true,
        items: []
      }
    ],
    cta: {
      title: 'Questions Regarding Legal Protocols?',
      subtitle: 'Our Legal & Concierge Advisory Desk is available for private consultations.',
      buttonText: 'Contact Concierge',
      buttonLink: '/contact'
    },
    seo: {
      metaTitle: 'Terms & Conditions | AUREVÉ Haute Joaillerie',
      metaDescription: 'Review the legal covenants, BIS hallmarking standards, and bespoke commission terms of Maison AUREVÉ.'
    },
    isPublished: true
  },
  PRIVACY_POLICY: {
    pageKey: 'PRIVACY_POLICY',
    title: 'Confidentiality & Patron Privacy Policy',
    subtitle: 'Discreet High Jewellery Data Governance',
    heroDescription:
      'Maison AUREVÉ honors the absolute discretion, confidentiality, and sovereign privacy expected by our patrons, royal collectors, and private clients worldwide.',
    heroMedia: {
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop',
      publicId: 'aureve_privacy_hero_default',
      mediaType: 'IMAGE',
      alt: 'AUREVÉ Confidentiality Seal'
    },
    sections: [
      {
        sectionKey: 'CONFIDENTIALITY_CREED',
        title: '1. The Discretion Covenant',
        subtitle: 'Confidential Patron Profiles',
        description:
          'We recognize that high jewellery acquisitions, bridal suites, and vault commissions involve sensitive personal milestones. AUREVÉ never discloses, monetizes, or leases patron names, acquisition records, or delivery coordinates to any third-party marketing entities.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 1,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'COLLECTED_INFORMATION',
        title: '2. Personal Data We Collect',
        subtitle: 'Necessary Transactional Information',
        description:
          'We gather strictly necessary personal identifiers including legal patron name, confidential telephone number, email, delivery coordinates, and government identification numbers (PAN / Aadhaar) required by statutory Indian taxation and anti-money laundering regulations for precious metal transactions above ₹2,00,000.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 2,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'PAYMENT_SECURITY',
        title: '3. Encrypted Banking & Payment Security',
        subtitle: 'PCI-DSS Level 1 Banking Infrastructure',
        description:
          'Cardholder financial data is processed via 256-bit AES encrypted payment gateways (Razorpay, Stripe) conforming to PCI-DSS Level 1 specifications. AUREVÉ never retains or has access to full credit card numbers or banking credentials on our application servers.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 3,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'APPOINTMENT_DISCRETION',
        title: '4. Salon Visits & Encrypted Virtual Consultations',
        subtitle: 'Private Viewing Privacy',
        description:
          'Private salon suite bookings and virtual video viewings are strictly confidential. Video streams are end-to-end encrypted and are never recorded without the explicit written authorization of the patron.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 4,
        isPublished: true,
        items: []
      },
      {
        sectionKey: 'PATRON_RIGHTS',
        title: '5. Patron Rights & Archival Erasure',
        subtitle: 'Right to Rectification & Discretion',
        description:
          'Patrons hold the right to inspect, update, or request the anonymization of their profile and marketing preferences at any time, subject only to mandatory legal bullion retention obligations under Indian law.',
        mediaUrl: '',
        mediaType: 'IMAGE',
        displayOrder: 5,
        isPublished: true,
        items: []
      }
    ],
    cta: {
      title: 'Dedicated Data Protection Officer',
      subtitle: 'For confidential privacy inquiries or deletion requests, reach our Chief Privacy Desk directly.',
      buttonText: 'Contact Privacy Desk',
      buttonLink: '/contact'
    },
    seo: {
      metaTitle: 'Privacy Policy & Discretion Covenant | AUREVÉ Haute Joaillerie',
      metaDescription: 'Learn about AUREVÉ high-standard privacy protection, encrypted transactions, and patron confidentiality protocols.'
    },
    isPublished: true
  }
};

/**
 * Fetch page content by key.
 */
export const getPageContent = async (pageKey, isAdmin = false) => {
  const query = { pageKey: pageKey.toUpperCase() };
  if (!isAdmin) {
    query.isPublished = true;
  }

  let content = await PageContent.findOne(query).lean();

  if (!content) {
    // Return standard default if not yet seeded/saved in database
    const fallback = DEFAULT_PAGE_CONTENTS[pageKey.toUpperCase()];
    if (!fallback) {
      throw new NotFoundError(`Page content not found for key: ${pageKey}`);
    }
    return fallback;
  }

  return content;
};

/**
 * Upsert page content by administrator.
 */
export const updatePageContent = async (pageKey, updateData, user) => {
  const key = pageKey.toUpperCase();
  if (!['OUR_STORY', 'BESPOKE_SERVICES', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY'].includes(key)) {
    throw new BadRequestError(`Invalid page key: ${pageKey}`);
  }

  const existing = await PageContent.findOne({ pageKey: key });

  const payload = {
    ...updateData,
    pageKey: key,
    lastUpdatedBy: user?._id || null
  };

  const updated = await PageContent.findOneAndUpdate(
    { pageKey: key },
    { $set: payload },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  await AuditLog.create({
    action: existing ? 'CMS_PAGE_UPDATED' : 'CMS_PAGE_INITIALIZED',
    entity: 'PageContent',
    entityId: updated._id,
    performedBy: user?._id || null,
    ipAddress: '127.0.0.1',
    changes: { pageKey: key, title: updated.title, isPublished: updated.isPublished }
  }).catch((err) => logger.warn('[AuditLog] Failed to log CMS update:', err.message));

  return updated;
};
