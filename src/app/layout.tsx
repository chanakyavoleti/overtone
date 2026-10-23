import type { Metadata } from "next";
import { connection } from "next/server";
import { ThemeProvider } from "@/lib/theme";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth/actions";
import "./globals.css";

export const instant = false;
export const ensureStatic = false as const;

export const metadata: Metadata = {
  title: {
    default: "Overtone — Rate, Review & Discover Music",
    template: "%s | Overtone",
  },
  description:
    "A community-driven music rating platform. Rate albums, write reviews, discover new music, and connect with fellow music enthusiasts.",
  keywords: ["music", "ratings", "reviews", "albums", "artists", "discovery"],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection(); // Opt out of static prerendering — this app needs cookies/session

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // Session unavailable - render as logged out
  }

  const headerUser = user
    ? {
        userId: user.id,
        username: user.username,
        displayName: user.displayName || undefined,
        role: user.role,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Header user={headerUser} />
          <main id="main-content">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
