import React, { useState, useEffect, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, Step, EVENTS } from 'react-joyride';

interface GuidedTourProps {
  run: boolean;
  onComplete?: () => void;
  onStop?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:guided_tour:completed';

export function GuidedTour({ run, onComplete, onStop }: GuidedTourProps) {
  // CRITICAL: Use useMemo to keep steps stable during tour
  // This prevents the steps array from changing mid-tour, which causes premature termination
  const steps = useMemo<Step[]>(() => [
      {
        target: '[data-tour="market-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Choose a Market</h3>
            <p className="text-sm">
              Start by selecting a market to analyze. <strong>Dow Jones</strong> is available for free to all users.
              <strong>S&P 500</strong> and <strong>Nasdaq 100</strong> require a Premium subscription.
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '[data-tour="layout-selector"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Choose a Layout</h3>
            <p className="text-sm">
              Layouts help you analyze companies from different angles:
            </p>
            <ul className="text-sm mt-2 space-y-1" style={{ listStyle: 'disc', listStylePosition: 'outside', paddingLeft: '1.5rem', marginLeft: '0' }}>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Compounders (ROIC)</strong> - identify great compounders</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Cashflow & Leverage</strong> - assess cash generation and debt</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>DuPont ROE Decomposition</strong> - understand what drives returns</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Return on Risk</strong> - analyze risk-adjusted returns</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>DCF Valuation</strong> - estimate intrinsic value</li>
              <li style={{ paddingLeft: '0.5rem' }}><strong>Reverse DCF</strong> - understand growth expectations priced in</li>
            </ul>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="search"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Search Companies</h3>
            <p className="text-sm">
              Use the search to quickly find companies by name or ticker.
              For example, try searching for "Apple" or "AAPL".
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="watchlist"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Add to Watchlist</h3>
            <p className="text-sm">
              Click the star icon next to a company to add it to your personal watchlist.
              This helps you track companies you're interested in.
            </p>
            <p className="text-sm mt-2 text-muted-foreground">
              You need to sign in to use the watchlist feature.
            </p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tour="columns"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Explore Metrics</h3>
            <p className="text-sm">
              Hover over column headers to see detailed explanations of metrics.
              Each metric has a tooltip with a description.
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '[data-tour="upgrade"]',
        content: (
          <div>
            <h3 className="font-semibold text-lg mb-2">Unlock Premium</h3>
            <p className="text-sm">
              Get access to all markets (S&P 500, Nasdaq 100) and all layouts with our Lifetime Deal for just $49.
              This is a one-time payment for lifetime access!
            </p>
          </div>
        ),
        placement: 'left',
      },
    ], []); // Empty dependency array - steps never change

  const [stepIndex, setStepIndex] = useState(() => {
    if (!run) return 0;
    try {
      const saved = localStorage.getItem('fgs:guided-tour:stepIndex');
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        return isNaN(idx) ? 0 : idx;
      }
    } catch {}
    return 0;
  });

  // Reset stepIndex when tour starts
  useEffect(() => {
    if (run && steps.length > 0) {
      // Ensure stepIndex is valid
      if (stepIndex >= steps.length) {
        setStepIndex(0);
      }
    }
  }, [run, steps.length, stepIndex]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, type, index } = data;
    const currentSteps = steps;
    
    console.log('GuidedTour callback:', { type, index, action, status, stepIndex, target: currentSteps[index]?.target, stepsLength: currentSteps.length, run });
    
    // CRITICAL: Handle FINISHED status FIRST, before other handlers
    // react-joyride calls FINISHED when it can't find an element, which closes the tour
    if (status === STATUS.FINISHED) {
      const lastStepIndex = currentSteps.length - 1;
      if (index === lastStepIndex) {
        // This is the last step - tour is complete
        console.log('Tour completed on last step');
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1');
          localStorage.removeItem('fgs:guided-tour:stepIndex');
          window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
        } catch {}
        if (onStop) onStop();
        if (onComplete) onComplete();
        return;
      } else {
        // FINISHED on non-last step = element not found error
        // CRITICAL: Prevent tour from closing by immediately advancing to next step
        console.error('ERROR: Tour marked as FINISHED on step', index, 'but not last step. This means element not found. Forcing continuation...');
        const nextIndex = index + 1;
        if (nextIndex < currentSteps.length) {
          // Immediately set next step to prevent tour from closing
          requestAnimationFrame(() => {
            setStepIndex(nextIndex);
          });
        }
        return; // Don't process other handlers
      }
    }
    
    // Handle close button click - user explicitly closed
    if (action === 'close') {
      console.log('Tour closed by user on step', index);
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
        localStorage.removeItem('fgs:guided-tour:stepIndex');
      } catch {}
      if (onStop) onStop();
      if (onComplete) onComplete();
      return;
    }
    
    // Handle skipped
    if (status === STATUS.SKIPPED) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
        localStorage.removeItem('fgs:guided-tour:stepIndex');
      } catch {}
      if (onStop) onStop();
      if (onComplete) onComplete();
      return;
    }

    // Handle step navigation
    if (type === 'step:after') {
      if (action === 'next') {
        const nextIndex = index + 1;
        if (nextIndex < currentSteps.length) {
          const nextTarget = currentSteps[nextIndex]?.target;
          if (nextTarget && typeof nextTarget === 'string') {
            const maxAttempts = 50;
            const delay = 200;
            let attempts = 0;
            const checkAndAdvance = () => {
              const element = document.querySelector(nextTarget);
              // Check if element exists and is visible
              if (element) {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                 window.getComputedStyle(element).display !== 'none' &&
                                 window.getComputedStyle(element).visibility !== 'hidden';
                
                if (isVisible) {
                  console.log('Element found and visible, advancing to step:', nextIndex, 'Target:', nextTarget, 'Attempts:', attempts);
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Use setTimeout to ensure scroll completes before advancing
                  setTimeout(() => {
                    setStepIndex(nextIndex);
                  }, 300);
                } else if (attempts < maxAttempts) {
                  attempts++;
                  setTimeout(checkAndAdvance, delay);
                } else {
                  console.warn('Element found but not visible after', maxAttempts, 'attempts. Skipping this step and continuing to next.');
                  // Skip this step if element is not visible (e.g., upgrade button for paid users)
                  if (nextIndex + 1 < currentSteps.length) {
                    setTimeout(() => {
                      setStepIndex(nextIndex + 1);
                    }, 100);
                  } else {
                    // This was the last step, finish tour
                    console.log('Skipped last step, finishing tour');
                    try {
                      localStorage.setItem(TOUR_STORAGE_KEY, '1');
                      localStorage.removeItem('fgs:guided-tour:stepIndex');
                      window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
                    } catch {}
                    if (onStop) onStop();
                    if (onComplete) onComplete();
                  }
                }
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkAndAdvance, delay);
              } else {
                console.warn('Element not found after', maxAttempts, 'attempts. Skipping this step and continuing to next. Target:', nextTarget);
                // Skip this step if element doesn't exist (e.g., upgrade button for paid users)
                if (nextIndex + 1 < currentSteps.length) {
                  setTimeout(() => {
                    setStepIndex(nextIndex + 1);
                  }, 100);
                } else {
                  // This was the last step, finish tour
                  console.log('Skipped last step, finishing tour');
                  try {
                    localStorage.setItem(TOUR_STORAGE_KEY, '1');
                    localStorage.removeItem('fgs:guided-tour:stepIndex');
                    window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
                  } catch {}
                  if (onStop) onStop();
                  if (onComplete) onComplete();
                }
              }
            };
            setTimeout(checkAndAdvance, 100);
          } else {
            // No target (like 'body'), advance immediately
            setTimeout(() => {
              setStepIndex(nextIndex);
            }, 100);
          }
        } else {
          // This is the last step
          console.log('Reached last step, finishing tour');
        }
      } else if (action === 'prev') {
        setStepIndex(index - 1);
      }
    // CRITICAL: Handle TARGET_NOT_FOUND explicitly to prevent tour from ending early
    // This happens when Joyride can't find the next step's target element
    else if (type === EVENTS.TARGET_NOT_FOUND || type === 'error:target_not_found') {
      const targetSelector = currentSteps[index]?.target;
      console.error('TARGET_NOT_FOUND for step:', index, 'Target:', targetSelector, 'Total steps:', currentSteps.length);
      
      // Don't end the tour - try to find the element or skip to next step
      if (targetSelector && typeof targetSelector === 'string') {
        const maxAttempts = 30;
        const delay = 200;
        let attempts = 0;
        
        const findElement = () => {
          const element = document.querySelector(targetSelector);
          if (element) {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && 
                             window.getComputedStyle(element).display !== 'none' &&
                             window.getComputedStyle(element).visibility !== 'hidden';
            
            if (isVisible) {
              console.log('Element found and visible after', attempts, 'attempts, scrolling to it');
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => {
                // Stay on current step if element is found
                if (stepIndex !== index) {
                  setStepIndex(index);
                }
              }, 300);
              return;
            }
          }
          
          // Element not found or not visible
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(findElement, delay);
          } else {
            // After max attempts, skip this step but DON'T end the tour
            console.warn('Element not found after', maxAttempts, 'attempts. Skipping step', index, 'to', index + 1);
            if (index < currentSteps.length - 1) {
              // Skip to next step - don't end tour
              setTimeout(() => {
                setStepIndex(index + 1);
              }, 100);
            } else {
              // This was the last step - only now finish the tour
              console.log('TARGET_NOT_FOUND on last step, finishing tour');
              try {
                localStorage.setItem(TOUR_STORAGE_KEY, '1');
                localStorage.removeItem('fgs:guided-tour:stepIndex');
                window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
              } catch {}
              if (onStop) onStop();
              if (onComplete) onComplete();
            }
          }
        };
        
        setTimeout(findElement, 0);
      } else {
        // No valid target selector - skip to next step
        console.warn('No valid target selector for step', index, 'skipping to next');
        if (index < currentSteps.length - 1) {
          setTimeout(() => {
            setStepIndex(index + 1);
          }, 100);
        } else {
          // Last step - finish tour
          try {
            localStorage.setItem(TOUR_STORAGE_KEY, '1');
            localStorage.removeItem('fgs:guided-tour:stepIndex');
            window.dispatchEvent(new CustomEvent('fgs:first-tour-completed'));
          } catch {}
          if (onStop) onStop();
          if (onComplete) onComplete();
        }
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      disableScrolling={false}
      disableOverlayClose={false}
      hideCloseButton={false}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#10b981',
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
    />
  );
}

export function useGuidedTour() {
  const [shouldRun, setShouldRun] = useState(false);

  useEffect(() => {
    // Check if user has completed the tour
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Show tour after a delay to let the page and table load
        const timer = setTimeout(() => {
          // Check if required elements exist before starting tour
          const marketSelector = document.querySelector('[data-tour="market-selector"]');
          const layoutSelector = document.querySelector('[data-tour="layout-selector"]');
          if (marketSelector && layoutSelector) {
            setShouldRun(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch {
      // If localStorage is not available, don't show tour
    }
  }, []);

  const startTour = () => {
    setShouldRun(true);
  };

  const stopTour = () => {
    setShouldRun(false);
  };

  return { shouldRun, startTour, stopTour };
}

