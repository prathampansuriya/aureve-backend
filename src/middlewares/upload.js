import multer from 'multer';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_VIDEO_SIZE_BYTES,
  validateFileIntegrity
} from '../utils/fileValidator.js';
import { ValidationError, AppError } from '../utils/AppError.js';

// Configure in-memory storage buffer
const storage = multer.memoryStorage();

const allowedMimeSet = new Set([...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]);

const fileFilter = (req, file, cb) => {
  if (allowedMimeSet.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `Unsupported media type "${file.mimetype}". Allowed types: [${Array.from(allowedMimeSet).join(', ')}].`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES, // 50MB top ceiling for video, images further capped at 10MB
    files: 10
  },
  fileFilter
});

/**
 * Middleware handling single file upload with content validation.
 * Accepts both 'file' and 'files' form fields seamlessly.
 *
 * @param {string} fieldName - Form field name (default: 'file')
 */
export const uploadSingle = (fieldName = 'file') => {
  const fields = Array.from(new Set([fieldName, 'file', 'files'])).map((name) => ({
    name,
    maxCount: 1
  }));
  const multerMiddleware = upload.fields(fields);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('File size exceeds the permitted limit (max 10MB for images, 50MB for video).'));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(`Unexpected upload field "${err.field}". Expected field: "${fieldName}".`));
          }
          return next(new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_FAILED'));
        }
        return next(err);
      }

      // Normalize single file object onto req.file
      const extractedFile =
        req.files?.[fieldName]?.[0] ||
        req.files?.file?.[0] ||
        req.files?.files?.[0] ||
        req.file;

      if (!extractedFile) {
        return next(new ValidationError(`Required file is missing in field "${fieldName}".`));
      }

      req.file = extractedFile;

      try {
        const integrity = validateFileIntegrity(req.file);
        req.file.detectedMimeType = integrity.detectedMimeType;
        req.file.mediaType = integrity.mediaType;
        next();
      } catch (validationErr) {
        next(validationErr);
      }
    });
  };
};

/**
 * Middleware handling multiple file uploads with content validation.
 * Accepts 'files' array as well as fallback 'file' fields up to maxCount.
 *
 * @param {string} fieldName - Form field name (default: 'files')
 * @param {number} maxCount - Maximum allowed files (default: 10)
 */
export const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  const fields = Array.from(new Set([fieldName, 'files', 'file'])).map((name) => ({
    name,
    maxCount
  }));
  const multerMiddleware = upload.fields(fields);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError('One or more files exceed the permitted size limit.'));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ValidationError(`Too many files. Maximum allowed files per request is ${maxCount}.`));
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ValidationError(`Unexpected upload field "${err.field}". Expected field: "${fieldName}".`));
          }
          return next(new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_FAILED'));
        }
        return next(err);
      }

      // Collect all files from supported fields
      const collectedFiles = [];
      if (req.files) {
        if (Array.isArray(req.files[fieldName])) {
          collectedFiles.push(...req.files[fieldName]);
        }
        if (fieldName !== 'files' && Array.isArray(req.files.files)) {
          collectedFiles.push(...req.files.files);
        }
        if (fieldName !== 'file' && Array.isArray(req.files.file)) {
          collectedFiles.push(...req.files.file);
        }
      } else if (Array.isArray(req.files)) {
        collectedFiles.push(...req.files);
      } else if (req.file) {
        collectedFiles.push(req.file);
      }

      if (collectedFiles.length === 0) {
        return next(new ValidationError(`At least one file must be provided in field "${fieldName}".`));
      }

      if (collectedFiles.length > maxCount) {
        return next(new ValidationError(`Too many files. Maximum allowed files per request is ${maxCount}.`));
      }

      req.files = collectedFiles;

      try {
        for (const file of req.files) {
          const integrity = validateFileIntegrity(file);
          file.detectedMimeType = integrity.detectedMimeType;
          file.mediaType = integrity.mediaType;
        }
        next();
      } catch (validationErr) {
        next(validationErr);
      }
    });
  };
};
