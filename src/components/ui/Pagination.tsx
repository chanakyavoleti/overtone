import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  queryParam?: string;
  extraParams?: Record<string, string | number | undefined>;
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  queryParam = 'page',
  extraParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(extraParams)) {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    }
    if (pageNum > 1) {
      params.set(queryParam, String(pageNum));
    }
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  // Generate range with ellipsis
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <nav className={styles.pagination} aria-label="Pagination Navigation">
      <ul className={styles.list}>
        {/* Previous button */}
        <li>
          {currentPage > 1 ? (
            <Link
              href={buildUrl(currentPage - 1)}
              className={styles.pageBtn}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span className={styles.btnText}>Previous</span>
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.disabled}`} aria-disabled="true">
              <ChevronLeft size={16} aria-hidden="true" />
              <span className={styles.btnText}>Previous</span>
            </span>
          )}
        </li>

        {/* Numbered buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <li key={`ellipsis-${idx}`}>
                <span className={styles.ellipsis} aria-hidden="true">
                  …
                </span>
              </li>
            );
          }

          const pageNum = p as number;
          const isCurrent = pageNum === currentPage;

          return (
            <li key={pageNum}>
              <Link
                href={buildUrl(pageNum)}
                className={`${styles.pageBtn} ${isCurrent ? styles.active : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${pageNum}`}
              >
                {pageNum}
              </Link>
            </li>
          );
        })}

        {/* Next button */}
        <li>
          {currentPage < totalPages ? (
            <Link
              href={buildUrl(currentPage + 1)}
              className={styles.pageBtn}
              aria-label="Next page"
            >
              <span className={styles.btnText}>Next</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span className={`${styles.pageBtn} ${styles.disabled}`} aria-disabled="true">
              <span className={styles.btnText}>Next</span>
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
