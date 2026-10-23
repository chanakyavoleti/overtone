import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, reviewVotes, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';

// POST /api/reviews — create a review
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, title, body: reviewBody } = body;

    if (!['album', 'track', 'artist'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    if (!targetId || typeof targetId !== 'number') {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 });
    }

    if (!reviewBody || typeof reviewBody !== 'string' || reviewBody.trim().length === 0) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
    }

    if (reviewBody.length > 10000) {
      return NextResponse.json({ error: 'Review must be under 10,000 characters' }, { status: 400 });
    }

    if (title && typeof title === 'string' && title.length > 200) {
      return NextResponse.json({ error: 'Title must be under 200 characters' }, { status: 400 });
    }

    // Check for existing review
    const existing = db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, session.userId),
          eq(reviews.targetType, targetType),
          eq(reviews.targetId, targetId)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this. Edit your existing review instead.' },
        { status: 409 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    const result = db
      .insert(reviews)
      .values({
        userId: session.userId,
        targetType,
        targetId,
        title: title?.trim() || null,
        body: reviewBody.trim(),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return NextResponse.json({
      success: true,
      reviewId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Review create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/reviews?targetType=album&targetId=1&sort=newest&page=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tid = parseInt(targetId, 10);
    if (isNaN(tid)) {
      return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 });
    }

    // Get total count
    const totalResult = db
      .select({ total: count() })
      .from(reviews)
      .where(
        and(eq(reviews.targetType, targetType), eq(reviews.targetId, tid))
      )
      .get();

    const total = totalResult?.total ?? 0;

    // Get reviews with user info and vote counts
    const reviewList = db
      .select({
        id: reviews.id,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userId: reviews.userId,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(
        and(eq(reviews.targetType, targetType), eq(reviews.targetId, tid))
      )
      .orderBy(sort === 'oldest' ? asc(reviews.createdAt) : desc(reviews.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    // Get vote counts for each review
    const reviewsWithVotes = reviewList.map((review) => {
      const voteResult = db
        .select({ total: count() })
        .from(reviewVotes)
        .where(eq(reviewVotes.reviewId, review.id))
        .get();

      return {
        ...review,
        helpfulCount: voteResult?.total ?? 0,
      };
    });

    return NextResponse.json({
      reviews: reviewsWithVotes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Review fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
