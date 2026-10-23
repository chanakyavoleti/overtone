import { getIronSession, SessionOptions, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: number;
  username?: string;
  role?: string;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

const sessionPassword =
  process.env.SESSION_SECRET ||
  'overtone_music_rating_platform_session_secret_min_32_characters_long!';

export const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: 'overtone_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds (604,800)
  },
  ttl: 7 * 24 * 60 * 60,
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.isLoggedIn === undefined) {
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  return session;
}

const session = {
  getSession,
  sessionOptions,
  defaultSession,
};

export default session;
