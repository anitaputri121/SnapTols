import React from 'react';

/** Logo YouTube (kotak merah + segitiga putih). Ukuran mengikuti className. */
export const YouTubeLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 17" className={className} aria-hidden="true" focusable="false">
    <rect width="24" height="17" rx="4.5" fill="#ff0000" />
    <path d="M9.6 4.6 16 8.5l-6.4 3.9z" fill="#ffffff" />
  </svg>
);
