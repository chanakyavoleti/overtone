'use client';

import { useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}

// Known Deezer placeholder images or broken hash patterns
const PLACEHOLDER_PATTERNS = [
  'c9d19c4bba2c1605876c762729974916',
  'abd95cd3882021d0f16006cc391f993c',
  '/artist//',
];

export default function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  const isInvalid = !src || PLACEHOLDER_PATTERNS.some((pat) => src.includes(pat));

  if (isInvalid || hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

