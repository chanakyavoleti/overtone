import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Transactional Email Service
 * Handles password recovery and transactional notifications.
 *
 * Supports:
 * 1. Resend HTTP API (when RESEND_API_KEY is configured)
 * 2. Standard SMTP Transport (when SMTP_HOST, SMTP_USER, SMTP_PASS are configured)
 * 3. Diagnostic Safe Mode (logs full diagnostics and reset URL when no provider is configured)
 */

export interface SendPasswordResetEmailParams {
  toEmail: string;
  resetToken: string;
  username?: string;
  requestId?: string;
}

export type EmailProviderType = 'resend' | 'smtp' | 'unconfigured';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: EmailProviderType;
  requestId: string;
  resetUrl: string;
  deliveredOrAccepted: boolean;
  error?: string;
  errorCategory?:
    | 'AUTHENTICATION_ERROR'
    | 'REJECTED'
    | 'NETWORK_ERROR'
    | 'UNCONFIGURED'
    | 'UNKNOWN_ERROR';
}

/**
 * Determines the public base URL dynamically from environment,
 * preventing hard-coded localhost in production on Render or Vercel.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL;
    return (url.startsWith('http') ? url : `https://${url}`).replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

export async function sendPasswordResetEmail({
  toEmail,
  resetToken,
  username,
  requestId = crypto.randomUUID(),
}: SendPasswordResetEmailParams): Promise<EmailDeliveryResult> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const fromEmail =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    'Overtone Support <no-reply@overtone.app>';
  const resendApiKey = process.env.RESEND_API_KEY;

  const subject = 'Reset your Overtone password';
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Reset Your Overtone Password</title>
      </head>
      <body style="margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d12; color: #f0f2f5;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #12151d; border: 1px solid #232733; border-radius: 12px; padding: 36px;">
          <h2 style="margin-top: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Overtone</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            Hello ${username || 'there'},
          </p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
            We received a request to reset the password for your Overtone account (${toEmail}). Click the button below to set a new password. This link is valid for <strong>30 minutes</strong> and can only be used once.
          </p>
          <div style="margin: 32px 0;">
            <a href="${resetUrl}" style="background-color: #2D5A3D; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not make this request, you can safely ignore this email. Your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #232733; margin: 28px 0;" />
          <p style="color: #475569; font-size: 12px; word-break: break-all; line-height: 1.4;">
            If the button doesn't work, copy and paste this link into your browser:<br />
            <a href="${resetUrl}" style="color: #60a5fa; text-decoration: underline;">${resetUrl}</a>
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Reset your Overtone password

Hello ${username || 'there'},

We received a request to reset your password for your Overtone account (${toEmail}).
Click the link below or paste it into your browser to choose a new password.
This link expires in 30 minutes and can only be used once:

${resetUrl}

If you did not request a password reset, you can safely ignore this email.
`;

  // --------------------------------------------------------------------------
  // Provider 1: Resend HTTP API
  // --------------------------------------------------------------------------
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
          text: textContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const category = response.status === 401 || response.status === 403
          ? 'AUTHENTICATION_ERROR'
          : response.status >= 400 && response.status < 500
          ? 'REJECTED'
          : 'NETWORK_ERROR';

        console.error(`[EmailService][Req:${requestId}] Resend API error (${response.status}):`, errorText);

        return {
          success: false,
          deliveredOrAccepted: false,
          provider: 'resend',
          requestId,
          resetUrl,
          error: `Resend HTTP ${response.status}: ${errorText}`,
          errorCategory: category,
        };
      }

      const resData = (await response.json()) as { id?: string };
      console.info(`[EmailService][Req:${requestId}] Resend accepted email to ${toEmail}. Message ID: ${resData.id}`);

      return {
        success: true,
        deliveredOrAccepted: true,
        messageId: resData.id,
        provider: 'resend',
        requestId,
        resetUrl,
      };
    } catch (err: any) {
      console.error(`[EmailService][Req:${requestId}] Resend fetch exception:`, err);
      return {
        success: false,
        deliveredOrAccepted: false,
        provider: 'resend',
        requestId,
        resetUrl,
        error: err.message || 'Unknown network error calling Resend',
        errorCategory: 'NETWORK_ERROR',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Provider 2: SMTP Transport
  // --------------------------------------------------------------------------
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.info(`[EmailService][Req:${requestId}] SMTP sent email to ${toEmail}. Message ID: ${info.messageId}`);

      return {
        success: true,
        deliveredOrAccepted: true,
        messageId: info.messageId,
        provider: 'smtp',
        requestId,
        resetUrl,
      };
    } catch (smtpErr: any) {
      const isAuth = smtpErr.code === 'EAUTH' || smtpErr.responseCode === 535;
      console.error(`[EmailService][Req:${requestId}] SMTP delivery failure:`, smtpErr);

      return {
        success: false,
        deliveredOrAccepted: false,
        provider: 'smtp',
        requestId,
        resetUrl,
        error: smtpErr.message || 'SMTP delivery failed',
        errorCategory: isAuth ? 'AUTHENTICATION_ERROR' : 'NETWORK_ERROR',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Provider 3: Fallback Diagnostics (When credentials are not yet configured)
  // --------------------------------------------------------------------------
  console.warn(
    `[EmailService][Req:${requestId}] Transactional email credentials are NOT configured. ` +
    `To enable live delivery, set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in environment variables. ` +
    `Password reset link for ${toEmail}: ${resetUrl}`
  );

  return {
    success: true,
    deliveredOrAccepted: false,
    provider: 'unconfigured',
    requestId,
    resetUrl,
    error: 'Email provider credentials not configured (set RESEND_API_KEY or SMTP settings).',
    errorCategory: 'UNCONFIGURED',
  };
}
