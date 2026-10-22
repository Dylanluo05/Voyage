import { z } from 'zod';

/** Any https URL (rejects data:, javascript:, http:). */
export const httpsUrl = z
  .string()
  .max(2000)
  .url()
  .refine((u) => u.startsWith('https://'), 'URL must start with https://');

// Photos users upload from the browser go to this Cloudinary account; only
// URLs under it are accepted for stored photos.
const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/dge3aejes/';

export const uploadedPhotoUrl = z
  .string()
  .max(2000)
  .refine((u) => u.startsWith(CLOUDINARY_PREFIX), 'Photo must be uploaded through Voyage');
