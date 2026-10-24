import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { sendPasswordResetEmail } from '@/lib/email/emailService';

const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hash raw token with SHA-256 for secure database storage and lookup.
 */
export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Initiates password reset for a given email address.
 * Generates a 32-byte hex token, hashes it with SHA-256, saves it with 30-min expiry,
 * and sends an email.
 * Always resolves successfully to prevent user enumeration attacks.
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  emailSent: boolean;
  message: string;
  token?: string; // Included only in non-production environments for automated testing
}> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .get();

  // If user does not exist, return generic success message to prevent user enumeration
  if (!user) {
    return {
      success: true,
      emailSent: false,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    };
  }

  // Invalidate any existing unused reset tokens for this user
  const now = Date.now();
  db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .run();

  // Generate cryptographically secure 32-byte random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = now + TOKEN_EXPIRY_MS;

  // Insert token record into database
  db.insert(passwordResetTokens)
    .values({
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: now,
    })
    .run();

  // Send the reset email
  await sendPasswordResetEmail({
    toEmail: user.email,
    resetToken: rawToken,
    username: user.username,
  });

  return {
    success: true,
    emailSent: true,
    message: 'If an account exists with this email, you will receive password reset instructions.',
    ...(process.env.NODE_ENV !== 'production' ? { token: rawToken } : {}),
  };
}

/**
 * Verifies if a reset token is valid and unexpired.
 */
export async function verifyResetToken(rawToken: string): Promise<{
  valid: boolean;
  userId?: number;
  error?: string;
}> {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, error: 'Reset token is required.' };
  }

  const tokenHash = hashResetToken(rawToken);
  const now = Date.now();

  const record = db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .get();

  if (!record) {
    return {
      valid: false,
      error: 'This password reset link is invalid or has expired. Please request a new one.',
    };
  }

  return {
    valid: true,
    userId: record.userId,
  };
}

/**
 * Resets user password using a verified single-use token.
 */
export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const verification = await verifyResetToken(rawToken);
  if (!verification.valid || !verification.userId) {
    return {
      success: false,
      error: verification.error || 'Password reset link is invalid or has expired.',
    };
  }

  const tokenHash = hashResetToken(rawToken);
  const now = Date.now();

  // Hash new password using bcrypt asynchronously (12 rounds)
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update user's password in database
  db.update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    })
    .where(eq(users.id, verification.userId))
    .run();

  // Mark this token as used
  db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .run();

  // Invalidate any other active tokens for this user
  db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, verification.userId),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .run();

  return { success: true };
}
