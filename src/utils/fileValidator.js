import { ValidationError } from './AppError.js';

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_FOLDERS = [
  'aureve/products',
  'aureve/categories',
  'aureve/collections',
  'aureve/banners',
  'aureve/promotions',
  'aureve/stores',
  'aureve/lookbook',
  'aureve/reviews',
  'aureve/cms',
  'aureve/offers'
];

/**
 * Inspects raw buffer binary headers to determine true file type via magic bytes.
 *
 * @param {Buffer} buffer - In-memory file buffer
 * @returns {string|null} Detected MIME type or null if unrecognized
 */
export const detectMimeTypeFromBuffer = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP signature: "RIFF" .... "WEBP"
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP
  if (isRiff && isWebp) {
    return 'image/webp';
  }

  // WebM signature: EBML header 1A 45 DF A3 (anywhere in first 32 bytes)
  const scanLimitWebm = Math.min(buffer.length - 4, 32);
  for (let i = 0; i <= scanLimitWebm; i++) {
    if (buffer[i] === 0x1a && buffer[i + 1] === 0x45 && buffer[i + 2] === 0xdf && buffer[i + 3] === 0xa3) {
      return 'video/webm';
    }
  }

  // MP4 / QuickTime (MOV) signature: "ftyp" within first 64 bytes
  const scanLimitFtyp = Math.min(buffer.length - 8, 64);
  for (let i = 0; i <= scanLimitFtyp; i++) {
    if (
      buffer[i] === 0x66 && // 'f'
      buffer[i + 1] === 0x74 && // 't'
      buffer[i + 2] === 0x79 && // 'y'
      buffer[i + 3] === 0x70 // 'p'
    ) {
      const brand = buffer.toString('utf8', i + 4, i + 8);
      if (brand === 'qt  ') {
        return 'video/quicktime';
      }
      return 'video/mp4';
    }
  }

  // QuickTime (MOV) alternative signature: "moov" or "mdat" or "wide" within first 64 bytes
  const scanLimitMoov = Math.min(buffer.length - 4, 64);
  for (let i = 0; i <= scanLimitMoov; i++) {
    const tag = buffer.toString('utf8', i, i + 4);
    if (tag === 'moov' || tag === 'mdat' || tag === 'wide') {
      return 'video/quicktime';
    }
  }

  return null;
};

/**
 * Validates a file's size and binary content integrity.
 *
 * @param {Object} file - Multer file object
 * @returns {{ detectedMimeType: string, mediaType: 'image'|'video' }}
 */
export const validateFileIntegrity = (file) => {
  if (!file || !file.buffer) {
    throw new ValidationError('No file buffer provided for upload.');
  }

  let detectedMime = detectMimeTypeFromBuffer(file.buffer);

  // Fallback for valid video containers where custom AI encoder metadata offsets atoms
  if (!detectedMime && file.mimetype && ALLOWED_VIDEO_MIMES.includes(file.mimetype) && file.buffer.length >= 16) {
    const headerSnippet = file.buffer.slice(0, 128).toString('binary');
    if (
      headerSnippet.includes('ftyp') ||
      headerSnippet.includes('moov') ||
      headerSnippet.includes('mdat') ||
      headerSnippet.includes('wide') ||
      headerSnippet.includes('isom') ||
      headerSnippet.includes('mp4')
    ) {
      detectedMime = file.mimetype === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
    }
  }

  if (!detectedMime) {
    throw new ValidationError(
      `The file "${file.originalname}" failed binary signature validation. Only genuine JPEG, PNG, WebP images and MP4, WebM, MOV videos are accepted.`
    );
  }

  const isImage = ALLOWED_IMAGE_MIMES.includes(detectedMime);
  const isVideo = ALLOWED_VIDEO_MIMES.includes(detectedMime);

  if (!isImage && !isVideo) {
    throw new ValidationError(
      `Unsupported file type "${detectedMime}". Allowed image types: [${ALLOWED_IMAGE_MIMES.join(', ')}]. Allowed video types: [${ALLOWED_VIDEO_MIMES.join(', ')}].`
    );
  }

  if (isImage && file.buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new ValidationError(
      `Image file size (${(file.buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed limit of 10MB.`
    );
  }

  if (isVideo && file.buffer.length > MAX_VIDEO_SIZE_BYTES) {
    throw new ValidationError(
      `Video file size (${(file.buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed limit of 50MB.`
    );
  }

  return {
    detectedMimeType: detectedMime,
    mediaType: isImage ? 'image' : 'video'
  };
};

/**
 * Validates and normalizes target Cloudinary storage folder.
 * Supports both canonical names (e.g. 'aureve/products') and short aliases (e.g. 'products', 'categories').
 *
 * @param {string} [folder] - Requested target folder
 * @returns {string} Validated folder path
 */
export const validateStorageFolder = (folder = 'aureve/products') => {
  if (!folder || typeof folder !== 'string' || !folder.trim()) {
    return 'aureve/products';
  }

  let normalized = folder.trim().replace(/^\/+|\/+$/g, '');

  // Alias mappings
  if (normalized === 'product-videos' || normalized === 'products') {
    normalized = 'aureve/products';
  } else if (!normalized.startsWith('aureve/') && normalized !== 'aureve') {
    // Automatically prepend 'aureve/' if given a short segment like 'categories', 'collections', etc.
    const candidate = `aureve/${normalized}`;
    if (ALLOWED_FOLDERS.some((allowed) => candidate === allowed || candidate.startsWith(`${allowed}/`))) {
      normalized = candidate;
    }
  }

  const isAllowed = ALLOWED_FOLDERS.some((allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`));

  if (!isAllowed) {
    throw new ValidationError(
      `Invalid storage folder "${folder}". Folder must belong to an approved AUREVÉ namespace: [${ALLOWED_FOLDERS.join(', ')}].`
    );
  }

  return normalized;
};
