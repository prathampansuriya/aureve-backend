# AUREVÉ Backend API Service

Node.js / Express.js / Mongoose REST API engine for the AUREVÉ luxury jewellery e-commerce platform.

## Environment Variables

Configure your `.env` file according to `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...

JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Brand Identity in Transactional Emails
EMAIL_LOGO_URL=https://res.cloudinary.com/your-cloud/image/upload/v1/aureve/logo.png
```

> **Note on `EMAIL_LOGO_URL`:**
> Provide a public HTTPS Cloudinary URL pointing to the AUREVÉ brand logo. When configured, this remote URL is rendered in transactional email headers (appointments, orders, password resets). If omitted or invalid, transactional emails gracefully fall back to the styled AUREVÉ typography wordmark.

## Seed Systems

### 1. Master Catalog & Core Configuration Seed
Populates categories (12), collections (14), master products (40), variants (80), banners (6), sections (5), showrooms (4), coupons (4), offers (2), and CMS pages (`OUR_STORY`, `BESPOKE_SERVICES`).

```bash
npm run seed
```
- **Idempotent:** Safe to run repeatedly; existing documents are updated by unique slugs/SKUs without duplication.
- **Production Guard:** Refuses execution in production unless `--force-production` flag is supplied.
- **Reference Date:** October 2026.

### 2. Cloudinary Asset URL Applier
```bash
npm run seed:assets
```
- Manually editable script located at `src/scripts/seed-assets.js`.
- Contains mappings for all seeded entities using replacement marker `REPLACE_WITH_CLOUDINARY_HTTPS_URL`.
- **Refusal Guard:** Will strictly refuse to write to MongoDB if any placeholder markers remain unresolved.
- Replace the markers with your actual Cloudinary URLs (generated following `prompts.md`) before running.

## Super-Admin Provisioning
To bootstrap or promote the root administrator account:
```bash
npm run seed:admin
```
