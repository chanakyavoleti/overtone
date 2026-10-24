import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validations';
import { requestPasswordReset } from '@/lib/auth/passwordReset';
import { checkRateLimit } from '@/lib/auth/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Extract IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimit = checkRateLimit(`forgot-password:${ip}`, {
      maxRequests: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Please enter a valid email address';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const result = await requestPasswordReset(validation.data.email);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('forgot-password route error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
