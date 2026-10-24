/**
 * Transactional Email Service
 * Handles password recovery and transactional notifications.
 *
 * Supports:
 * - Resend REST API (when RESEND_API_KEY is configured in environment)
 * - Safe fallback simulation / logging (when live provider credentials are not yet configured)
 */

export interface SendPasswordResetEmailParams {
  toEmail: string;
  resetToken: string;
  username?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: 'resend' | 'simulated' | 'unconfigured';
  resetUrl: string;
  error?: string;
}

export async function sendPasswordResetEmail({
  toEmail,
  resetToken,
  username,
}: SendPasswordResetEmailParams): Promise<EmailDeliveryResult> {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Overtone <no-reply@overtone.app>';
  const resendApiKey = process.env.RESEND_API_KEY;

  const subject = 'Reset your Overtone password';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d12; color: #f0f2f5; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #12151d; border: 1px solid #232733; border-radius: 12px; padding: 32px;">
          <h2 style="margin-top: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Overtone</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Hello ${username || 'there'},
          </p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            We received a request to reset your password for your Overtone account. Click the button below to choose a new password. This link is valid for 30 minutes and can only be used once.
          </p>
          <div style="margin: 32px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #232733; margin: 24px 0;" />
          <p style="color: #475569; font-size: 12px; word-break: break-all;">
            Or copy and paste this URL into your browser:<br />
            <a href="${resetUrl}" style="color: #60a5fa; text-decoration: underline;">${resetUrl}</a>
          </p>
        </div>
      </body>
    </html>
  `;

  // 1. Try Resend if configured
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EmailService] Resend API error:', errorText);
        return {
          success: false,
          provider: 'resend',
          resetUrl,
          error: `Resend error: ${response.status}`,
        };
      }

      const resData = (await response.json()) as { id?: string };
      return {
        success: true,
        messageId: resData.id,
        provider: 'resend',
        resetUrl,
      };
    } catch (err) {
      console.error('[EmailService] Error calling email provider:', err);
      return {
        success: false,
        provider: 'resend',
        resetUrl,
        error: err instanceof Error ? err.message : 'Unknown provider error',
      };
    }
  }

  // 2. Fallback for environments where provider credentials are not yet configured
  console.info(
    `[EmailService] Transactional email credentials not configured in environment (RESEND_API_KEY). ` +
    `Password reset link for ${toEmail}: ${resetUrl}`
  );

  return {
    success: true,
    provider: 'unconfigured',
    resetUrl,
  };
}
