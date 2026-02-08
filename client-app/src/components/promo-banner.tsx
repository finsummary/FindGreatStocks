import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const TOUR_STORAGE_KEY = 'fgs:guided_tour:completed';

interface PromoBannerProps {
  onClaimNow?: () => void;
}

export function PromoBanner({ onClaimNow }: PromoBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      try {
        // Check if banner was dismissed
        const dismissed = localStorage.getItem('fgs:promo-banner-dismissed');
        if (dismissed) {
          setIsVisible(false);
          return;
        }

        // Check if onboarding tour is completed
        const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!tourCompleted) {
          // Tour not completed yet - don't show banner
          setIsVisible(false);
          return;
        }

        // Tour is completed and banner not dismissed - show it
        setIsVisible(true);
      } catch {
        // On error, don't show banner
        setIsVisible(false);
      }
    };

    // Check on mount
    checkVisibility();

    // Listen for tour completion event
    const handleTourCompleted = () => {
      // Wait a bit after tour completion before showing banner
      setTimeout(checkVisibility, 500);
    };

    window.addEventListener('fgs:first-tour-completed', handleTourCompleted);

    // Also check periodically in case tour was completed in another tab
    const interval = setInterval(checkVisibility, 1000);

    return () => {
      window.removeEventListener('fgs:first-tour-completed', handleTourCompleted);
      clearInterval(interval);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('fgs:promo-banner-dismissed', '1');
    } catch {}
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-center py-2 px-4 relative z-50">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm sm:text-base">
        <span className="font-semibold">
          🎉 Start your <strong>7-day free trial</strong> - Get full access to all premium features!
        </span>
        <button
          onClick={onClaimNow}
          className="underline hover:no-underline font-medium ml-2 cursor-pointer bg-transparent border-none text-white"
        >
          Claim Now →
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 sm:right-4 h-6 w-6 text-white hover:bg-white/20 rounded-sm"
          onClick={handleClose}
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

