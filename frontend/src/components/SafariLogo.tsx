import React from 'react';
import { cn } from '../lib/utils';
import logoUrl from '../assets/logo_safari.png';

interface SafariLogoProps {
  className?: string;
  showText?: boolean;
}

export function SafariLogo({ className, showText = false }: SafariLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img 
        src={logoUrl} 
        alt="Safari Logo" 
        className="h-full w-auto object-contain"
      />
      {showText && (
        <span className="archivo-black text-xl uppercase tracking-tighter text-white">Safari</span>
      )}
    </div>
  );
}
