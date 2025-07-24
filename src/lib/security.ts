import DOMPurify from 'dompurify';
import { z } from 'zod';

// Content sanitization
export const sanitizeHTML = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
  });
};

export const sanitizeText = (content: string): string => {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
};

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Email validation
export const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

// Input validation schemas
export const memoryContentSchema = z.string()
  .min(10, 'Memory description must be at least 10 characters')
  .max(2000, 'Memory description must be less than 2000 characters')
  .refine(
    (content) => !content.includes('<script>'),
    'Invalid content detected'
  );

export const commentSchema = z.string()
  .min(1, 'Comment cannot be empty')
  .max(500, 'Comment must be less than 500 characters')
  .refine(
    (content) => !content.includes('<script>'),
    'Invalid content detected'
  );

export const videoDescriptionSchema = z.string()
  .max(1000, 'Description must be less than 1000 characters')
  .refine(
    (content) => !content.includes('<script>'),
    'Invalid content detected'
  );

// File validation
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  return { valid: true };
};

export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only MP4, WebM, and MOV videos are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 100MB' };
  }

  return { valid: true };
};

// Rate limiting helpers
export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return {
    isAllowed: (key: string): boolean => {
      const now = Date.now();
      const record = attempts.get(key);

      if (!record || now > record.resetTime) {
        attempts.set(key, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (record.count >= maxAttempts) {
        return false;
      }

      record.count++;
      return true;
    },
    getRemainingTime: (key: string): number => {
      const record = attempts.get(key);
      if (!record) return 0;
      return Math.max(0, record.resetTime - Date.now());
    }
  };
};

// Security headers for responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
};