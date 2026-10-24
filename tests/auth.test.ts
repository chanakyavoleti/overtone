import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { users, passwordResetTokens } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requestPasswordReset, verifyResetToken, resetPasswordWithToken, hashResetToken } from '../src/lib/auth/passwordReset';
import { checkRateLimit, resetRateLimit } from '../src/lib/auth/rateLimit';
import bcrypt from 'bcryptjs';

describe('Authentication & Password Recovery Flow', () => {
  const testEmail = 'testuser_recovery@example.com';
  const testUsername = 'testuser_recovery';
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'NewPassword456!';

  beforeEach(() => {
    // Clean up previous test user & tokens
    const existing = db.select().from(users).where(eq(users.email, testEmail)).get();
    if (existing) {
      db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, existing.id)).run();
      db.delete(users).where(eq(users.id, existing.id)).run();
    }

    // Insert clean user
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(initialPassword, salt);
    db.insert(users).values({
      username: testUsername,
      email: testEmail,
      passwordHash: hash,
      displayName: 'Test User',
      role: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).run();
  });

  it('generates a secure reset token and verifies it correctly', async () => {
    const res = await requestPasswordReset(testEmail);
    expect(res.success).toBe(true);
    expect(res.emailSent).toBe(true);
    expect(res.token).toBeDefined();

    const rawToken = res.token!;
    expect(rawToken.length).toBe(64); // 32 bytes hex = 64 chars

    // Check token is hashed in DB
    const tokenHash = hashResetToken(rawToken);
    const tokenInDb = db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).get();
    expect(tokenInDb).toBeDefined();
    expect(tokenInDb?.usedAt).toBeNull();

    // Verify token validity
    const verification = await verifyResetToken(rawToken);
    expect(verification.valid).toBe(true);
    expect(verification.userId).toBeDefined();
  });

  it('handles password reset for non-existent email gracefully without leaking user existence', async () => {
    const res = await requestPasswordReset('nonexistent_user_999@example.com');
    expect(res.success).toBe(true);
    expect(res.emailSent).toBe(false);
  });

  it('successfully resets password and marks token as used', async () => {
    const reqRes = await requestPasswordReset(testEmail);
    const rawToken = reqRes.token!;

    // Reset password
    const resetRes = await resetPasswordWithToken(rawToken, newPassword);
    expect(resetRes.success).toBe(true);

    // Verify token cannot be reused
    const tokenHash = hashResetToken(rawToken);
    const tokenInDb = db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).get();
    expect(tokenInDb?.usedAt).not.toBeNull();

    const secondVerification = await verifyResetToken(rawToken);
    expect(secondVerification.valid).toBe(false);

    // Verify the user can authenticate with the new password
    const userInDb = db.select().from(users).where(eq(users.email, testEmail)).get();
    expect(userInDb).toBeDefined();
    const isNewPasswordValid = await bcrypt.compare(newPassword, userInDb!.passwordHash);
    expect(isNewPasswordValid).toBe(true);
    const isOldPasswordValid = await bcrypt.compare(initialPassword, userInDb!.passwordHash);
    expect(isOldPasswordValid).toBe(false);
  });

  it('rejects expired tokens', async () => {
    const reqRes = await requestPasswordReset(testEmail);
    const rawToken = reqRes.token!;
    const tokenHash = hashResetToken(rawToken);

    // Artificially expire token
    const past = Date.now() - 1000 * 60;
    db.update(passwordResetTokens)
      .set({ expiresAt: past })
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .run();

    const verification = await verifyResetToken(rawToken);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('expired');
  });

  it('rate limiter enforces request limits and resets properly', () => {
    const key = 'test-ip-rate-limit';
    resetRateLimit(key);

    // Max 3 requests per window
    const opts = { maxRequests: 3, windowMs: 10_000 };
    expect(checkRateLimit(key, opts).success).toBe(true);
    expect(checkRateLimit(key, opts).success).toBe(true);
    expect(checkRateLimit(key, opts).success).toBe(true);

    // 4th request must be blocked
    const fourth = checkRateLimit(key, opts);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);

    // After reset, should allow requests again
    resetRateLimit(key);
    expect(checkRateLimit(key, opts).success).toBe(true);
  });
});
