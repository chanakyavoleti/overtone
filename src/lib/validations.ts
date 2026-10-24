import { z } from 'zod';

// ============================================================================
// Target Type
// ============================================================================
export const targetTypeEnum = z.enum(['album', 'track', 'artist']);
export type TargetType = z.infer<typeof targetTypeEnum>;

// ============================================================================
// Authentication Schemas
// ============================================================================
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// Rating Schema
// ============================================================================
export const ratingSchema = z.object({
  score: z
    .number()
    .int('Score must be an integer')
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100'),
  targetType: targetTypeEnum,
  targetId: z
    .number()
    .int('Target ID must be an integer')
    .positive('Target ID must be positive'),
});

export type RatingInput = z.infer<typeof ratingSchema>;

// ============================================================================
// Review Schema
// ============================================================================
export const reviewSchema = z.object({
  title: z
    .string()
    .max(200, 'Title cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  body: z
    .string()
    .min(1, 'Review body cannot be empty')
    .max(10000, 'Review cannot exceed 10,000 characters'),
  targetType: targetTypeEnum,
  targetId: z
    .number()
    .int('Target ID must be an integer')
    .positive('Target ID must be positive'),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// ============================================================================
// List Schema
// ============================================================================
export const listSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2,000 characters')
    .optional()
    .or(z.literal('')),
  isPublic: z
    .boolean()
    .default(true),
});

export type ListInput = z.infer<typeof listSchema>;

// ============================================================================
// Password Reset Schemas
// ============================================================================
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
