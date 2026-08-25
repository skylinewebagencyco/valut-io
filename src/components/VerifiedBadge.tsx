import React from 'react';
import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
  tooltip = 'Verified Workplace Account',
}) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5 text-[8px]',
    sm: 'w-4 h-4 text-[9px]',
    md: 'w-5 h-5 text-[11px]',
    lg: 'w-6 h-6 text-xs',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center justify-center rounded-full bg-[#1D9BF0] text-white shadow-2xs flex-shrink-0 cursor-default select-none ${sizeClasses[size]} ${className}`}
      aria-label={tooltip}
    >
      <Check className={`${iconSizes[size]} stroke-[3.5]`} />
    </span>
  );
};
