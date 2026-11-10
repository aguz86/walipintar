import React from 'react';

interface WhatsAppIconProps {
  className?: string;
  size?: number | string;
}

/**
 * WhatsAppIcon
 * Menampilkan favicon / ikon resmi WhatsApp (lingkaran hijau #25D366 dengan bubble & gagang telepon putih)
 * yang mendampingi setiap teks WhatsApp di seluruh aplikasi.
 */
export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  className = 'w-4 h-4 inline-block shrink-0 align-middle',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="WhatsApp"
    >
      {/* Background Badge Hijau Resmi WhatsApp */}
      <circle cx="16" cy="16" r="16" fill="#25D366" />

      {/* Bubble Chat & Phone Handset Putih */}
      <path
        d="M16 6.5C10.75 6.5 6.5 10.75 6.5 16C6.5 17.82 7.02 19.52 7.91 20.97L6.85 25.15L11.18 24.12C12.57 24.99 14.23 25.5 16 25.5C21.25 25.5 25.5 21.25 25.5 16C25.5 10.75 21.25 6.5 16 6.5ZM21.05 19.64C20.84 20.24 19.98 20.75 19.51 20.82C19.06 20.89 18.49 20.92 16.32 20.02C13.72 18.94 12.06 16.3 11.93 16.12C11.8 15.94 10.87 14.71 10.87 13.43C10.87 12.15 11.53 11.52 11.78 11.26C12.02 11 12.3 10.93 12.48 10.93C12.66 10.93 12.84 10.93 13 10.94C13.17 10.95 13.4 10.88 13.63 11.42C13.87 11.97 14.45 13.43 14.52 13.58C14.59 13.73 14.64 13.91 14.54 14.11C14.44 14.31 14.39 14.44 14.24 14.62C14.09 14.8 13.93 15.01 13.8 15.15C13.65 15.3 13.5 15.46 13.67 15.77C13.84 16.08 14.44 17.04 15.33 17.83C16.47 18.85 17.43 19.16 17.73 19.31C18.03 19.46 18.21 19.44 18.39 19.23C18.57 19.02 19.15 18.34 19.35 18.04C19.55 17.74 19.75 17.79 20.03 17.89C20.31 17.99 21.81 18.73 22.12 18.88C22.43 19.03 22.63 19.11 22.71 19.24C22.79 19.37 22.79 19.98 22.58 20.58L21.05 19.64Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
