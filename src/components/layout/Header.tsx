'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Sun, Moon, User, Star, BookOpen, List, Library, Settings, LogOut, Shield } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import ArtistAutocomplete from '@/components/layout/ArtistAutocomplete';
import styles from './Header.module.css';

interface HeaderUser {
  userId: number;
  username: string;
  displayName?: string;
  role?: string;
}

interface HeaderProps {
  user: HeaderUser | null;
}

const NAV_LINKS = [
  { href: '/discover', label: 'Discover' },
  { href: '/music', label: 'Music' },
  { href: '/artists', label: 'Artists' },
  { href: '/charts', label: 'Charts' },
  { href: '/lists', label: 'Lists' },
  { href: '/community', label: 'Community' },
];

export default function Header({ user }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      // Silently fail - session will expire
    }
  };

  const initials = user
    ? (user.displayName || user.username).slice(0, 1).toUpperCase()
    : '';

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logo} aria-label="Overtone — home">
          Over<span className={styles.logoAccent}>tone</span>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname.startsWith(link.href) ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.searchWrapper}>
          <ArtistAutocomplete placeholder="Search artists, albums, spellings..." />
        </div>

        <div className={styles.actions}>
          <button
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            type="button"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {user ? (
            <div className={styles.userMenu} ref={userMenuRef}>
              <button
                className={styles.userBtn}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
                type="button"
              >
                <span className={styles.avatar}>{initials}</span>
              </button>

              {userMenuOpen && (
                <div className={styles.dropdown} role="menu">
                  <Link href={`/user/${user.username}`} className={styles.dropdownItem} role="menuitem">
                    <User size={16} /> Profile
                  </Link>
                  <Link href="/my/ratings" className={styles.dropdownItem} role="menuitem">
                    <Star size={16} /> My Ratings
                  </Link>
                  <Link href="/my/reviews" className={styles.dropdownItem} role="menuitem">
                    <BookOpen size={16} /> My Reviews
                  </Link>
                  <Link href="/my/lists" className={styles.dropdownItem} role="menuitem">
                    <List size={16} /> My Lists
                  </Link>
                  <Link href="/my/collection" className={styles.dropdownItem} role="menuitem">
                    <Library size={16} /> Collection
                  </Link>
                  <div className={styles.dropdownDivider} role="separator" />
                  <Link href="/settings" className={styles.dropdownItem} role="menuitem">
                    <Settings size={16} /> Settings
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" className={styles.dropdownItem} role="menuitem">
                      <Shield size={16} /> Admin
                    </Link>
                  )}
                  <div className={styles.dropdownDivider} role="separator" />
                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    onClick={handleLogout}
                    role="menuitem"
                    type="button"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className={styles.authLink}>
                Sign In
              </Link>
              <Link href="/register" className={styles.signUpBtn}>
                Sign Up
              </Link>
            </>
          )}

          <button
            className={`${styles.iconBtn} ${styles.mobileMenuBtn}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            type="button"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <nav
        className={`${styles.mobileNav} ${mobileMenuOpen ? styles.mobileNavOpen : ''}`}
        aria-label="Mobile navigation"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.mobileNavLink}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
