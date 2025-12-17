import React, { useState, useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface InvestmentGuideTourProps {
  run: boolean;
  onComplete?: () => void;
  selectedLayout?: string | null;
  onStop?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:investment_guide_tour:completed';

export function InvestmentGuideTour({ run, onComplete, selectedLayout: selectedLayoutProp, onStop }: InvestmentGuideTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  // Restore stepIndex from localStorage ONLY if tour is running (to persist across page navigations)
  const [stepIndex, setStepIndex] = useState(() => {
    if (!run) return 0; // Don't restore if tour is not running
    try {
      const saved = localStorage.getItem('fgs:investment-tour:stepIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const joyrideRef = useRef<Joyride>(null);

  // Save stepIndex to localStorage whenever it changes (only if tour is running)
  useEffect(() => {
    if (run) {
      try {
        localStorage.setItem('fgs:investment-tour:stepIndex', stepIndex.toString());
      } catch {}
    }
  }, [stepIndex, run]);

  // Listen for layout selection events
  useEffect(() => {
    const handleLayoutSelected = (event: CustomEvent) => {
      setSelectedLayout(event.detail?.layout || null);
    };

    const handleDropdownOpened = () => {
      setIsDropdownOpen(true);
    };

    const handleDropdownClosed = () => {
      setIsDropdownOpen(false);
    };

    window.addEventListener('fgs:layout-selected', handleLayoutSelected as EventListener);
    window.addEventListener('fgs:layout-dropdown-opened', handleDropdownOpened as EventListener);
    window.addEventListener('fgs:layout-dropdown-closed', handleDropdownClosed as EventListener);
    
    return () => {
      window.removeEventListener('fgs:layout-selected', handleLayoutSelected as EventListener);
      window.removeEventListener('fgs:layout-dropdown-opened', handleDropdownOpened as EventListener);
      window.removeEventListener('fgs:layout-dropdown-closed', handleDropdownClosed as EventListener);
    };
  }, []);

  // Also use prop if provided
  useEffect(() => {
    if (selectedLayoutProp) {
      setSelectedLayout(selectedLayoutProp);
    }
  }, [selectedLayoutProp]);

  useEffect(() => {
    // Simplified tour steps
    const tourSteps: Step[] = [
      // Step 1: Intro
      {
        target: 'body',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">How to Find Great Stocks at a Good Price</h3>
            <p className="text-sm mb-2">
              This guide will walk you through the investment analysis process.
            </p>
            <p className="text-sm">
              We'll start by identifying great companies using the Compounders (ROIC) layout.
            </p>
          </div>
        ),
        placement: 'center',
        disableBeacon: true,
      },
      // Step 2: Choose Layout button - user must click it, not Next button
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Step 1: Find Great Companies</h3>
            <p className="text-sm mb-2">
              Click on <strong>"Choose Layout"</strong> button below to see available layouts.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              ⚠️ Please click the "Choose Layout" button, not the "Next" button.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: false,
      },
      // Step 3: Compounders layout option
      {
        target: '[data-tour="compounders-layout"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Select Compounders (ROIC)</h3>
            <p className="text-sm mb-2">
              Click on <strong>Compounders (ROIC)</strong> to analyze companies based on their Return on Invested Capital.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Click on "Compounders (ROIC)" to continue.
            </p>
          </div>
        ),
        placement: 'top',
        disableBeacon: false,
      },
      // Step 4: ROIC % (Latest) - first column explanation
      {
        target: '[data-tour="tour-roic-latest"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC % (Latest)</h3>
            <p className="text-sm mb-2">
              This shows the Return on Invested Capital using the most recent fiscal year.
            </p>
            <p className="text-sm mb-2">
              <strong>ROIC</strong> measures how efficiently a company generates returns on its invested capital (debt + equity).
            </p>
            <p className="text-sm">
              Look for companies with <strong>ROIC ≥ 15%</strong> (green) - these are excellent compounders.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      // Step 5: ROIC 10Y Avg %
      {
        target: '[data-tour="tour-roic-10y-avg"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">ROIC 10Y Avg %</h3>
            <p className="text-sm mb-2">
              This is the average ROIC over the last 10 fiscal years (or available history).
            </p>
            <p className="text-sm mb-2">
              A <strong>higher average</strong> means the company has consistently strong capital efficiency over time.
            </p>
            <p className="text-sm">
              Great companies maintain high ROIC year after year, not just in one good year.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
    ];

    setSteps(tourSteps);
  }, []);

  // Auto-advance when dropdown opens on step 2
  useEffect(() => {
    if (run && stepIndex === 2 && isDropdownOpen) {
      setTimeout(() => {
        setStepIndex(3);
      }, 100);
    }
  }, [run, stepIndex, isDropdownOpen]);

  // Auto-advance when user selects compounders layout
  useEffect(() => {
    if (run && stepIndex === 3 && selectedLayout === 'compounders') {
      // Wait a bit for the layout to load and columns to render
      setTimeout(() => {
        setStepIndex(4);
      }, 1000);
    }
  }, [run, stepIndex, selectedLayout]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;
    const currentSteps = steps;
    
    console.log('Tour callback:', { type, index, action, status, stepIndex, target: currentSteps[index]?.target, stepsLength: currentSteps.length, run });
    
    // Handle close button click - user clicked X button
    if (action === 'close') {
      console.log('Tour closed by user on step', index);
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
      if (onStop) onStop();
      if (onComplete) onComplete();
      return;
    }
    
    // Handle skipped
    if (status === STATUS.SKIPPED) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
      } catch {}
      window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
      if (onStop) onStop();
      if (onComplete) onComplete();
      return;
    }
    
    // Handle tour finished
    if (status === STATUS.FINISHED) {
      if (index === currentSteps.length - 1) {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
        } catch {}
        window.dispatchEvent(new CustomEvent('fgs:investment-tour-step1-inactive'));
        if (onStop) onStop();
        if (onComplete) onComplete();
        return;
      } else {
        const lastStepIndex = currentSteps.length - 1;
        console.warn('Tour marked as FINISHED but not on last step. Continuing...', { index, lastStepIndex });
        if (index < lastStepIndex) {
          setTimeout(() => setStepIndex(index + 1), 300);
        }
        return;
      }
    }

    // Update step index when user navigates
    if (type === 'step:after') {
      if (action === 'next') {
        // Block advancement on step 2 if dropdown is not open
        if (stepIndex === 2 && !isDropdownOpen) {
          console.log('Blocking advancement on step 2 - dropdown not open');
          requestAnimationFrame(() => setStepIndex(2));
          return;
        }
        // Block advancement on step 3 if layout not selected
        if (stepIndex === 3 && selectedLayout !== 'compounders') {
          console.log('Blocking advancement on step 3 - layout not selected');
          requestAnimationFrame(() => setStepIndex(3));
          return;
        }
        
        // Allow normal navigation for other steps
        const nextIndex = index + 1;
        if (nextIndex < currentSteps.length) {
          const nextTarget = currentSteps[nextIndex]?.target;
          if (nextTarget && typeof nextTarget === 'string') {
            const maxAttempts = 30;
            const delay = 150;
            let attempts = 0;
            const checkAndAdvance = () => {
              const element = document.querySelector(nextTarget);
              if (element) {
                console.log('Element found, advancing to step:', nextIndex, 'Target:', nextTarget, 'Attempts:', attempts);
                // Scroll element into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                requestAnimationFrame(() => setStepIndex(nextIndex));
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkAndAdvance, delay);
              } else {
                console.warn('Element not found after', maxAttempts, 'attempts, advancing anyway. Target:', nextTarget);
                requestAnimationFrame(() => setStepIndex(nextIndex));
              }
            };
            setTimeout(checkAndAdvance, 50);
          } else {
            requestAnimationFrame(() => setStepIndex(nextIndex));
          }
        }
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    } else if (type === 'error:target_not_found') {
      console.warn('Tour target not found for step:', index, 'Target:', currentSteps[index]?.target);
      const targetSelector = currentSteps[index]?.target;
      if (targetSelector && typeof targetSelector === 'string') {
        const maxAttempts = 30;
        const delay = 200;
        let attempts = 0;
        const findElement = () => {
          const element = document.querySelector(targetSelector);
          if (element) {
            console.log('Element found after', attempts, 'attempts, scrolling to it');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (stepIndex !== index) {
              setStepIndex(index);
            }
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(findElement, delay);
          } else {
            console.warn('Element not found after', maxAttempts, 'attempts, skipping to next step:', index + 1);
            if (index < currentSteps.length - 1) {
              setStepIndex(index + 1);
            }
          }
        };
        setTimeout(findElement, 0);
      } else {
        console.warn('No valid target selector, continuing to next step:', index + 1);
        if (index < currentSteps.length - 1) {
          setStepIndex(index + 1);
        }
      }
    }
  };

  // Hide popup when dropdown is open on layout selection steps
  const shouldHidePopup = [2, 3].includes(stepIndex) && isDropdownOpen;

  if (!run || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      ref={joyrideRef}
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          zIndex: shouldHidePopup ? 1 : 10000,
        },
        tooltip: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        tooltipContainer: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        overlay: {
          display: shouldHidePopup ? 'none' : 'block',
          visibility: shouldHidePopup ? 'hidden' : 'visible',
        },
        spotlight: {
          display: shouldHidePopup ? 'none' : 'block',
        },
        buttonNext: {
          backgroundColor: 
            (stepIndex === 2 && !isDropdownOpen) || 
            (stepIndex === 3 && selectedLayout !== 'compounders')
              ? '#9ca3af' : '#10b981',
          cursor: 
            (stepIndex === 2 && !isDropdownOpen) || 
            (stepIndex === 3 && selectedLayout !== 'compounders')
              ? 'not-allowed' : 'pointer',
          opacity: 
            (stepIndex === 2 && !isDropdownOpen) || 
            (stepIndex === 3 && selectedLayout !== 'compounders')
              ? 0.6 : 1,
          fontSize: '14px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: '14px',
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '14px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}

export function useInvestmentGuideTour() {
  const [shouldRun, setShouldRun] = useState(false);

  const startTour = () => {
    setShouldRun(true);
    try {
      localStorage.setItem('fgs:investment-tour:shouldRun', 'true');
    } catch {}
  };

  const stopTour = () => {
    setShouldRun(false);
    try {
      localStorage.removeItem('fgs:investment-tour:shouldRun');
      localStorage.removeItem('fgs:investment-tour:stepIndex');
    } catch {}
  };

  return { shouldRun, startTour, stopTour };
}
