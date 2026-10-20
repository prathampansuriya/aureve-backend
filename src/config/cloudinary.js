import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const isCloudinaryConfigured = () => {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
  logger.info(`[CLOUDINARY] Cloudinary initialized for cloud: "${env.CLOUDINARY_CLOUD_NAME}".`);
} else {
  logger.warn('[CLOUDINARY] Cloudinary credentials missing in environment. Real upload operations will be rejected.');
}

export { cloudinary };
