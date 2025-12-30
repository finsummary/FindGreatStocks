import React, { useEffect, useRef } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';

interface WatchlistTourProps {
  run: boolean;
  onComplete?: () => void;
  onStop?: () => void;
}

const WATCHLIST_TOUR_STORAGE_KEY = 'fgs:watchlist_tour:completed';

export function WatchlistTour({ run, onComplete, onStop }: WatchlistTourProps) {
  // Use any type to avoid TypeScript issues with LegacyIntroJs vs IntroJs
  const introInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (run) {
      // Prevent page refresh during tour
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Check if tour is active
        const savedStep = localStorage.getItem('fgs:watchlist-tour:current-step');
        const tourCompleted = localStorage.getItem(WATCHLIST_TOUR_STORAGE_KEY);
        
        if (savedStep !== null && !tourCompleted) {
          // Tour is in progress - warn user
          e.preventDefault();
          e.returnValue = 'Вы находитесь в процессе онбординга. Вы уверены, что хотите покинуть страницу?';
          return e.returnValue;
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Check if tour was interrupted by page refresh
      const savedStep = localStorage.getItem('fgs:watchlist-tour:current-step');
      const wasInterrupted = savedStep !== null;
      
      // Initialize Intro.js
      // @ts-ignore - introJs() returns LegacyIntroJs but we need IntroJs type
      const intro = introJs();
      // @ts-ignore - Type mismatch between LegacyIntroJs and IntroJs
      introInstanceRef.current = intro;

      // Check if mobile device
      const isMobile = window.innerWidth <= 640;

      // Build steps dynamically based on available elements
      const steps: any[] = [
        {
          intro: `
            <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Welcome to Your Watchlist</h3>
            <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
              Your watchlist is where you can track and analyze companies you're interested in.
              Let's take a quick tour to show you how to use it effectively.
            </p>
          `,
          element: '[data-tour="watchlist-header"]',
          position: isMobile ? 'bottom' : 'bottom',
        },
      ];

      // Add watchlist selector step if element exists
      const watchlistSelector = document.querySelector('[data-tour="watchlist-selector"]');
      if (watchlistSelector) {
        steps.push({
          intro: `
            <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Select a Watchlist</h3>
            <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
              If you have multiple watchlists, use this selector to switch between them.
              Each watchlist can contain different companies for different investment strategies.
            </p>
          `,
          element: '[data-tour="watchlist-selector"]',
          position: isMobile ? 'bottom' : 'bottom',
        });
      }

      // Add manage watchlists button step if element exists
      const manageButton = document.querySelector('[data-tour="manage-watchlists-button"]');
      if (manageButton) {
        steps.push({
          intro: `
            <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Manage Watchlists</h3>
            <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
              Click this button to create, rename, or delete watchlists.
              You can organize companies into different watchlists based on your investment goals.
            </p>
          `,
          element: '[data-tour="manage-watchlists-button"]',
          position: isMobile ? 'bottom' : 'bottom',
        });
      }

      // Add table step
      steps.push({
        intro: `
          <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">Your Companies</h3>
          <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">
            This table shows all companies in your selected watchlist. You can:
          </p>
          <ul style="font-size: 0.875rem; margin-top: 0.5rem; padding-left: 1.5rem; list-style: disc;">
            <li style="margin-bottom: 0.25rem;">View detailed financial metrics</li>
            <li style="margin-bottom: 0.25rem;">Remove companies by clicking the star icon</li>
            <li style="margin-bottom: 0.25rem;">Sort and filter columns</li>
            <li style="margin-bottom: 0.25rem;">Search for specific companies</li>
          </ul>
        `,
        element: '[data-tour="watchlist-table"]',
        position: isMobile ? 'top' : 'top',
      });

      // Add final step
      steps.push({
        intro: `
          <h3 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">You're All Set!</h3>
          <p style="font-size: 0.875rem;">
            Start adding companies to your watchlist from the main page by clicking the star icon next to any company.
            You can always come back here to review and analyze your selected companies.
          </p>
        `,
        element: '[data-tour="watchlist-header"]',
        position: isMobile ? 'bottom' : 'bottom',
      });

      // Configure Intro.js
      intro.setOptions({
        steps,
        showProgress: true,
        showBullets: true,
        showStepNumbers: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: 'Next',
        prevLabel: 'Back',
        skipLabel: 'Skip',
        doneLabel: 'Finish',
        tooltipClass: 'customIntroJS',
        highlightClass: 'customIntroJSHighlight',
        buttonClass: 'customIntroJSButton',
      });

      // Event handlers
      intro.oncomplete(() => {
        console.log('Watchlist tour completed');
        try {
          localStorage.setItem(WATCHLIST_TOUR_STORAGE_KEY, '1');
          localStorage.removeItem('fgs:watchlist-tour:current-step');
          localStorage.removeItem('fgs:watchlist-tour:active');
          window.dispatchEvent(new CustomEvent('fgs:watchlist-tour-completed'));
        } catch {}
        // Remove beforeunload listener when tour completes
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (onComplete) onComplete();
        if (onStop) onStop();
      });

      intro.onexit(() => {
        console.log('Watchlist tour exited');
        try {
          localStorage.setItem(WATCHLIST_TOUR_STORAGE_KEY, '1');
          localStorage.removeItem('fgs:watchlist-tour:current-step');
          localStorage.removeItem('fgs:watchlist-tour:active');
        } catch {}
        // Remove beforeunload listener when tour exits
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (onStop) onStop();
      });

      intro.onchange((targetElement) => {
        console.log('Watchlist tour step changed', targetElement);
        // Save current step to localStorage to survive page refresh
        try {
          // @ts-ignore - currentStep exists but may not be in types
          const currentStep = (typeof intro.currentStep === 'function' ? intro.currentStep() : intro.currentStep) || 0;
          localStorage.setItem('fgs:watchlist-tour:current-step', currentStep.toString());
          // Set explicit flag that tour is active
          localStorage.setItem('fgs:watchlist-tour:active', '1');
        } catch {}
        
        // Remove highlighting from all elements first
        const allHighlighted = document.querySelectorAll('.introjs-showElement, .introjs-relativePosition');
        allHighlighted.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.zIndex = '';
          htmlEl.style.position = '';
        });
        
        // Scroll element into view and ensure tooltip is visible
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Ensure only the current highlighted element is visible above overlay
          setTimeout(() => {
            const highlightedElement = document.querySelector('.introjs-showElement') as HTMLElement;
            if (highlightedElement) {
              // Only apply styles to the current element
              highlightedElement.style.zIndex = '999999';
              highlightedElement.style.position = 'relative';
            }
            const helperLayer = document.querySelector('.introjs-helperLayer') as HTMLElement;
            if (helperLayer) {
              helperLayer.style.zIndex = '999998';
            }
          }, 50);
          
          // Mobile positioning
          if (isMobile) {
            setTimeout(() => {
              const tooltip = document.querySelector('.introjs-tooltip') as HTMLElement;
              
              if (tooltip) {
                // Set reasonable max width for tooltip
                const maxWidth = Math.min(400, window.innerWidth - 40);
                tooltip.style.maxWidth = `${maxWidth}px`;
                tooltip.style.width = 'auto';
                tooltip.style.minWidth = '280px';
                
                // Position at bottom for all steps on mobile
                tooltip.style.position = 'fixed';
                tooltip.style.bottom = '20px';
                tooltip.style.top = 'auto';
                tooltip.style.left = '50%';
                tooltip.style.right = 'auto';
                tooltip.style.transform = 'translateX(-50%)';
                
                tooltip.style.margin = '0';
                tooltip.style.zIndex = '1000000';
                
                // Ensure tooltip content is scrollable if too tall
                const tooltipText = tooltip.querySelector('.introjs-tooltiptext') as HTMLElement;
                if (tooltipText) {
                  const viewportHeight = window.innerHeight;
                  const maxHeight = viewportHeight - 150; // Leave space for buttons and padding
                  tooltipText.style.maxHeight = `${maxHeight}px`;
                  tooltipText.style.overflowY = 'auto';
                }
                
                // Ensure only the current highlighted element is visible
                const highlightedElement = document.querySelector('.introjs-showElement') as HTMLElement;
                if (highlightedElement) {
                  highlightedElement.style.zIndex = '999999';
                  highlightedElement.style.position = 'relative';
                }
                
                // Scroll tooltip into view
                tooltip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
              }
            }, 100);
          }
        }
      });

      // Mark tour as active before starting
      try {
        localStorage.setItem('fgs:watchlist-tour:active', '1');
      } catch {}

      // Start the tour
      // If tour was interrupted, start from saved step
      if (wasInterrupted) {
        try {
          const stepIndex = parseInt(savedStep || '0', 10);
          if (!isNaN(stepIndex) && stepIndex > 0) {
            // @ts-ignore - startStep parameter exists but not in types
            intro.start(stepIndex);
          } else {
            intro.start();
          }
        } catch {
          intro.start();
        }
      } else {
        intro.start();
      }

      return () => {
        // Remove beforeunload listener
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Cleanup on unmount
        if (introInstanceRef.current) {
          introInstanceRef.current.exit();
        }
      };
    }
  }, [run, onComplete, onStop]);

  return null; // Intro.js renders its own UI
}

export function useWatchlistTour(user?: { id?: string } | null) {
  const [shouldRun, setShouldRun] = React.useState(false);

  React.useEffect(() => {
    // Check if user has completed the tour
    try {
      const completed = localStorage.getItem(WATCHLIST_TOUR_STORAGE_KEY);
      const savedStep = localStorage.getItem('fgs:watchlist-tour:current-step');
      
      // If tour was interrupted (saved step exists), restore it
      if (!completed && savedStep !== null) {
        const stepIndex = parseInt(savedStep, 10);
        if (!isNaN(stepIndex) && stepIndex >= 0) {
          // Tour was interrupted - restore it
          setShouldRun(true);
          return;
        }
      }
      
      const startTourIfReady = () => {
        // Check if required elements exist before starting tour
        const watchlistHeader = document.querySelector('[data-tour="watchlist-header"]');
        const watchlistTable = document.querySelector('[data-tour="watchlist-table"]');
        
        // Header and table are required, selector and manage button are optional
        if (watchlistHeader && watchlistTable) {
          setShouldRun(true);
          return true;
        }
        return false;
      }

      // For new users visiting watchlist page for the first time, auto-start tour
      if (!completed && user?.id) {
        // Check if tour was already started for this user session
        const tourStartedForUser = localStorage.getItem(`fgs:user:${user.id}:watchlist-tour-started`);
        if (!tourStartedForUser) {
          // Mark that tour was started for this user
          localStorage.setItem(`fgs:user:${user.id}:watchlist-tour-started`, '1');
          
          // Show tour after a delay to let the page and table load
          const timer = setTimeout(() => {
            startTourIfReady();
          }, 2000);
          
          return () => {
            clearTimeout(timer);
          };
        }
      }
    } catch {
      // If localStorage is not available, don't show tour
    }
  }, [user?.id]);

  const startTour = () => {
    setShouldRun(true);
  };

  const stopTour = () => {
    setShouldRun(false);
  };

  return { shouldRun, startTour, stopTour };
}

