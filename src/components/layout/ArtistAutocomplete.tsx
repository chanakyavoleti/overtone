'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, User, Disc3, Music, Loader2, ArrowRight } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import styles from './ArtistAutocomplete.module.css';

export interface AutocompleteItem {
  id: number | string;
  type: 'artist' | 'album' | 'soundtrack' | 'ep' | 'single' | 'track';
  title: string;
  subtitle?: string;
  slug: string;
  url: string;
  imageUrl?: string | null;
  badge?: string;
  matchScore: number;
}

interface ArtistAutocompleteProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSelect?: (item: AutocompleteItem) => void;
}

export default function ArtistAutocomplete({
  placeholder = 'Search artists, albums, tracks, soundtracks...',
  className = '',
  autoFocus = false,
  onSelect,
}: ArtistAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Failed to fetch suggestions');

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Autocomplete error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle typing with 180ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 180);
  };

  // Select an item
  const handleSelectItem = (item: AutocompleteItem) => {
    setIsOpen(false);
    setQuery('');
    if (onSelect) {
      onSelect(item);
    } else {
      router.push(item.url);
    }
  };

  // Submit full search form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelectItem(suggestions[selectedIndex]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key === 'ArrowDown' && suggestions.length > 0) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectItem(suggestions[selectedIndex]);
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const getFallbackIcon = (type: AutocompleteItem['type']) => {
    switch (type) {
      case 'artist':
        return <User size={16} className={styles.fallbackIcon} />;
      case 'track':
        return <Music size={16} className={styles.fallbackIcon} />;
      default:
        return <Disc3 size={16} className={styles.fallbackIcon} />;
    }
  };

  const getBadgeClass = (type: AutocompleteItem['type']) => {
    switch (type) {
      case 'artist':
        return `${styles.typeBadge} ${styles.typeBadgeArtist}`;
      case 'soundtrack':
        return `${styles.typeBadge} ${styles.typeBadgeSoundtrack}`;
      case 'track':
        return `${styles.typeBadge} ${styles.typeBadgeTrack}`;
      default:
        return styles.typeBadge;
    }
  };

  return (
    <div className={`${styles.wrapper} ${className}`} ref={containerRef}>
      <form className={styles.searchForm} onSubmit={handleFormSubmit} role="search">
        <Search className={styles.searchIcon} size={16} aria-hidden="true" />

        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search artists, albums, and tracks"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />

        {isLoading ? (
          <Loader2 className={styles.spinner} size={16} />
        ) : query ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
      </form>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((item, idx) => (
                <div
                  key={`${item.type}-${item.slug}-${item.id}-${idx}`}
                  role="option"
                  aria-selected={selectedIndex === idx}
                  className={`${styles.suggestionItem} ${
                    selectedIndex === idx ? styles.suggestionItemActive : ''
                  }`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div
                    className={styles.photoWrapper}
                    style={{ borderRadius: item.type === 'artist' ? 'var(--radius-full)' : 'var(--radius-sm)' }}
                  >
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      className={styles.photo}
                      fallback={getFallbackIcon(item.type)}
                    />
                  </div>

                  <div className={styles.info}>
                    <span className={styles.artistName}>{item.title}</span>
                    {item.subtitle && <span className={styles.meta}>{item.subtitle}</span>}
                  </div>

                  {item.badge && (
                    <span className={getBadgeClass(item.type)}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}

              <div
                className={styles.footerAction}
                onClick={handleFormSubmit}
              >
                <span>Search all results for &ldquo;{query}&rdquo;</span>
                <ArrowRight size={14} />
              </div>
            </>
          ) : !isLoading && query.trim().length >= 2 ? (
            <div className={styles.noResults}>
              No music results found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
