import { Readable } from 'stream';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { validateStorageFolder } from '../utils/fileValidator.js';
import { AppError, ValidationError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export class MediaService {
  /**
   * Generates responsive image transformation URLs for luxury showcase.
   *
   * @param {string} publicId - Cloudinary public ID
   * @returns {Object} Responsive URL map
   */
  static generateResponsiveUrls(publicId) {
    if (!publicId) return null;

    return {
      thumbnail: cloudinary.url(publicId, {
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ],
        secure: true
      }),
      card: cloudinary.url(publicId, {
        transformation: [
          { width: 600, crop: 'limit' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ],
        secure: true
      }),
      pdp: cloudinary.url(publicId, {
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ],
        secure: true
      }),
      zoom: cloudinary.url(publicId, {
        transformation: [
          { width: 2000, crop: 'limit' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ],
        secure: true
      })
    };
  }

  /**
   * Generates video thumbnail URL from Cloudinary video asset.
   *
   * @param {string} publicId - Cloudinary video public ID
   * @returns {string} Thumbnail image URL
   */
  static generateVideoThumbnailUrl(publicId) {
    if (!publicId) return '';

    return cloudinary.url(publicId, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [
        { width: 800, crop: 'limit' },
        { start_offset: '1' }
      ],
      secure: true
    });
  }

  /**
   * Pipes an in-memory buffer into Cloudinary upload stream.
   *
   * @param {Buffer} buffer - File buffer
   * @param {Object} options - Cloudinary upload options
   * @returns {Promise<Object>} Cloudinary API response
   */
  static async uploadStream(buffer, options = {}) {
    if (!isCloudinaryConfigured()) {
      throw new AppError(
        'Cloudinary service is not configured. Please supply valid CLOUDINARY credentials in environment.',
        503,
        'INTEGRATION_UNAVAILABLE'
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'aureve/products',
          resource_type: options.resourceType || 'auto',
          fetch_format: 'auto',
          quality: 'auto:good',
          overwrite: false,
          unique_filename: true,
          ...options
        },
        (error, result) => {
          if (error) {
            logger.error(`[CLOUDINARY UPLOAD ERROR]: ${error.message}`, { error });
            return reject(new AppError(`Cloudinary upload failed: ${error.message}`, 502, 'MEDIA_UPLOAD_FAILED'));
          }
          resolve(result);
        }
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Uploads a single validated media file (image or video).
   *
   * @param {Object} params
   * @param {Object} params.file - Multer file object
   * @param {string} [params.folder] - Target namespace
   * @param {string} [params.alt] - Accessible alt text
   * @param {number} [params.displayOrder] - Sorting index
   * @param {string} [params.videoType] - Video category
   * @returns {Promise<Object>} Standardized media asset descriptor
   */
  static async uploadSingleMedia({ file, folder = 'aureve/products', alt, displayOrder = 0, videoType }) {
    const validatedFolder = validateStorageFolder(folder);
    const isVideo = file.mediaType === 'video';

    const result = await this.uploadStream(file.buffer, {
      folder: validatedFolder,
      resourceType: isVideo ? 'video' : 'image'
    });

    // Enforce video duration limits (max 60 seconds)
    if (isVideo && result.duration && result.duration > 60) {
      // Remove violating video asset from Cloudinary immediately
      await this.deleteMediaAsset(result.public_id, 'video').catch((err) =>
        logger.warn(`Failed to cleanup oversized video ${result.public_id}: ${err.message}`)
      );
      throw new ValidationError(
        `Video duration (${result.duration.toFixed(1)}s) exceeds maximum allowed limit of 60 seconds.`
      );
    }

    const responsiveUrls = !isVideo ? this.generateResponsiveUrls(result.public_id) : null;
    const thumbnail = isVideo
      ? this.generateVideoThumbnailUrl(result.public_id)
      : responsiveUrls?.thumbnail || result.secure_url;

    return {
      publicId: result.public_id,
      url: result.secure_url,
      mediaType: isVideo ? 'video' : 'image',
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      durationSeconds: isVideo ? Math.round(result.duration || 0) : 0,
      alt: alt || file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      displayOrder: Number(displayOrder) || 0,
      videoType: videoType || (isVideo ? 'PRODUCT_360' : undefined),
      thumbnail,
      responsiveUrls
    };
  }

  /**
   * Uploads multiple media files in batch with automatic rollback on partial failures.
   *
   * @param {Object} params
   * @param {Array<Object>} params.files - Array of Multer file objects
   * @param {string} [params.folder] - Target namespace
   * @param {Array<string>} [params.alts] - Optional alt text array
   * @param {Array<number>} [params.displayOrders] - Optional ordering array
   * @returns {Promise<Array<Object>>} Standardized media assets array
   */
  static async uploadMultipleMedia({ files, folder = 'aureve/products', alts = [], displayOrders = [] }) {
    const validatedFolder = validateStorageFolder(folder);
    const uploadedAssets = [];

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const alt = alts[index] || undefined;
        const displayOrder = displayOrders[index] !== undefined ? displayOrders[index] : index;

        const asset = await this.uploadSingleMedia({
          file,
          folder: validatedFolder,
          alt,
          displayOrder
        });

        uploadedAssets.push(asset);
      }

      return uploadedAssets;
    } catch (error) {
      // Rollback: delete already uploaded assets from Cloudinary to prevent orphaned storage
      if (uploadedAssets.length > 0) {
        logger.warn(
          `[MEDIA UPLOAD ROLLBACK] Batch upload failed. Purging ${uploadedAssets.length} partially uploaded asset(s)...`
        );
        for (const asset of uploadedAssets) {
          await this.deleteMediaAsset(asset.publicId, asset.mediaType).catch((cleanupErr) =>
            logger.error(`Failed to cleanup orphaned asset ${asset.publicId}: ${cleanupErr.message}`)
          );
        }
      }
      throw error;
    }
  }

  /**
   * Replaces an existing Cloudinary asset with a newly uploaded asset safely.
   * Uploads new asset first, then deletes old asset.
   *
   * @param {Object} params
   * @param {string} params.oldPublicId - Existing public ID to replace
   * @param {Object} params.file - New Multer file object
   * @param {string} [params.folder] - Target namespace
   * @param {string} [params.oldResourceType] - Old asset resource type
   * @param {string} [params.alt] - New alt text
   * @param {number} [params.displayOrder] - Display order
   * @returns {Promise<Object>} New media asset descriptor
   */
  static async replaceMediaAsset({
    oldPublicId,
    publicId,
    file,
    folder = 'aureve/products',
    oldResourceType = 'image',
    resourceType = 'image',
    alt,
    displayOrder
  }) {
    const targetOldPublicId = oldPublicId || publicId;
    const targetResourceType = oldResourceType || resourceType || 'image';

    // 1. Upload new asset first
    const newAsset = await this.uploadSingleMedia({
      file,
      folder,
      alt,
      displayOrder
    });

    // 2. Safely purge old asset from Cloudinary
    if (targetOldPublicId) {
      await this.deleteMediaAsset(targetOldPublicId, targetResourceType).catch((err) =>
        logger.warn(`Could not delete previous asset ${targetOldPublicId}: ${err.message}`)
      );
    }

    return newAsset;
  }

  /**
   * Deletes a single media asset from Cloudinary.
   *
   * @param {string} publicId - Cloudinary public ID
   * @param {string} [resourceType='image'] - 'image' | 'video' | 'raw'
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteMediaAsset(publicId, resourceType = 'image') {
    if (!publicId) {
      throw new ValidationError('Public ID is required for deletion.');
    }

    if (!isCloudinaryConfigured()) {
      logger.warn(`[CLOUDINARY MOCK DELETE] Asset deletion skipped for ${publicId} (SMTP/Cloudinary unconfigured).`);
      return { publicId, result: 'ok', mocked: true };
    }

    try {
      const response = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true
      });

      logger.info(`[CLOUDINARY DELETED] Asset ${publicId} (Type: ${resourceType}, Result: ${response.result})`);
      return {
        publicId,
        result: response.result,
        success: response.result === 'ok' || response.result === 'not found'
      };
    } catch (error) {
      logger.error(`[CLOUDINARY DELETE ERROR] Failed to delete ${publicId}: ${error.message}`);
      throw new AppError(`Failed to delete media asset: ${error.message}`, 502, 'MEDIA_DELETE_FAILED');
    }
  }

  /**
   * Deletes multiple media assets in batch from Cloudinary.
   *
   * @param {Array<string>} publicIds - Array of public IDs to delete
   * @param {string} [resourceType='image'] - 'image' | 'video'
   * @returns {Promise<Object>} Batch deletion result
   */
  static async deleteBatchMediaAssets(publicIds, resourceType = 'image') {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new ValidationError('Array of public IDs is required for batch deletion.');
    }

    if (!isCloudinaryConfigured()) {
      return { deleted: publicIds, mocked: true };
    }

    try {
      const response = await cloudinary.api.delete_resources(publicIds, {
        resource_type: resourceType,
        invalidate: true
      });

      logger.info(`[CLOUDINARY BATCH DELETED] Purged ${publicIds.length} assets.`);
      return response;
    } catch (error) {
      logger.error(`[CLOUDINARY BATCH DELETE ERROR]: ${error.message}`);
      throw new AppError(`Batch media deletion failed: ${error.message}`, 502, 'MEDIA_DELETE_FAILED');
    }
  }

  /**
   * Generates a signed upload signature for direct browser-to-Cloudinary upload flows.
   * Keeps CLOUDINARY_API_SECRET strictly on the server.
   *
   * @param {Object} params
   * @param {string} [params.folder] - Target namespace
   * @param {string} [params.resourceType] - 'image' | 'video'
   * @returns {Object} Signed upload parameters
   */
  static generateUploadSignature({ folder = 'aureve/products', resourceType = 'image' } = {}) {
    if (!isCloudinaryConfigured()) {
      throw new AppError(
        'Cloudinary service is not configured. Cannot generate upload signature.',
        503,
        'INTEGRATION_UNAVAILABLE'
      );
    }

    const validatedFolder = validateStorageFolder(folder);
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
      folder: validatedFolder,
      timestamp
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

    return {
      signature,
      timestamp,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      folder: validatedFolder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`
    };
  }
}
