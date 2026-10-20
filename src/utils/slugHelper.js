/**
 * Slug generation utility for AUREVÉ catalog models.
 * Generates URL-safe lowercase alphanumeric slugs with single hyphens.
 *
 * @param {string} text - Raw input text (title, name, etc.)
 * @returns {string} Sanitized URL-friendly slug
 */
export const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word chars except spaces and dashes
    .replace(/[\s_-]+/g, '-') // collapse spaces and dashes to single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
};
