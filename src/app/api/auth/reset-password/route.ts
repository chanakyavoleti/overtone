import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validations';
import { verifyResetToken, resetPasswordWithToken } from '@/lib/auth/passwordReset';
import { checkRateLimit } from '@/lib/auth/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Reset token is required.' }, { status: 400 });
    }

    const verification = await verifyResetToken(token);
    return NextResponse.json({
      valid: verification.valid,
      error: verification.error,
    });
  } catch (error) {
    console.error('reset-password GET error:', error);
    return NextResponse.json({ valid: false, error: 'Could not verify token.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimit = checkRateLimit(`reset-password:${ip}`, {
      maxRequests: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Too many password reset attempts. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Invalid password reset submission.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { token, password } = validation.data;
    const result = await resetPasswordWithToken(token, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in.',
    });
  } catch (error) {
    console.error('reset-password POST error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting your password.' },
      { status: 500 }
    );
  }
}
