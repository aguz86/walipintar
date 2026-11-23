import React from 'react';
import { X } from 'lucide-react';

interface CloseButton3DProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const CloseButton3D: React.FC<CloseButton3DProps> = ({
  onClick,
  className = '',
  size = 'md',
  ariaLabel = 'Tutup',
  title,
  disabled = false,
  type = 'button',
}) => {
  const sizeClasses =
    size === 'xs'
      ? 'w-6 h-6'
      : size === 'sm'
      ? 'w-8 h-8'
      : 'w-9 h-9 sm:w-10 sm:h-10';

  const iconClasses =
    size === 'xs'
      ? 'w-3.5 h-3.5 stroke-[3]'
      : size === 'sm'
      ? 'w-4 h-4 stroke-[3]'
      : 'w-5 h-5 stroke-[3]';

  const shadowBase =
    size === 'xs'
      ? 'shadow-[0_2.5px_0_0_#991b1b,0_4px_8px_rgba(220,38,38,0.3),inset_0_1.5px_2px_rgba(255,255,255,0.55)] active:translate-y-[2px] active:shadow-[0_0.5px_0_0_#991b1b,0_1px_3px_rgba(220,38,38,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.4)]'
      : size === 'sm'
      ? 'shadow-[0_3px_0_0_#991b1b,0_5px_10px_rgba(220,38,38,0.32),inset_0_2px_2px_rgba(255,255,255,0.55)] active:translate-y-[2.5px] active:shadow-[0_0.5px_0_0_#991b1b,0_2px_4px_rgba(220,38,38,0.25),inset_0_2px_2px_rgba(255,255,255,0.4)]'
      : 'shadow-[0_4px_0_0_#991b1b,0_6px_12px_rgba(220,38,38,0.35),inset_0_2px_3px_rgba(255,255,255,0.55)] active:translate-y-[3px] active:shadow-[0_1px_0_0_#991b1b,0_2px_4px_rgba(220,38,38,0.25),inset_0_2px_2px_rgba(255,255,255,0.4)]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`rounded-full flex items-center justify-center transition-all select-none ${sizeClasses} ${
        disabled
          ? 'bg-gradient-to-b from-rose-200 to-rose-300 text-white/80 border border-rose-300 shadow-[0_2px_0_0_#fda4af] cursor-default opacity-60'
          : `bg-gradient-to-b from-rose-400 via-red-500 to-red-600 hover:from-rose-400 hover:via-red-500 hover:to-red-700 text-white border border-red-700/80 ring-2 ring-white/85 cursor-pointer ${shadowBase}`
      } ${className}`}
    >
      <X className={`${iconClasses} drop-shadow-[0_1px_1px_rgba(127,29,29,0.7)]`} />
    </button>
  );
};
