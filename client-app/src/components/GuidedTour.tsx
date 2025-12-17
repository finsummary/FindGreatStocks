import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface GuidedTourProps {
  run: boolean;
  onComplete?: () => void;
  onStop?: () => void;
}

const TOUR_STORAGE_KEY = 'fgs:guided_tour:completed';

export function GuidedTour({ run, onComplete, onStop }: GuidedTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(() => {
    if (!run) return 0;
    try {
      const saved = localStorage.getItem('fgs:guided-tour:stepIndex');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Save stepIndex to localStorage
  useEffect(() => {
    if (run) {
      try {
        localStorage.setItem('fgs:guided-tour:stepIndex', stepIndex.toString());
      } catch {}
    }
  }, [stepIndex, run]);

  useEffect(() => {
    // Define tour steps
    const tourSteps: Step[] = [
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
    ];

    setSteps(tourSteps);
  }, []);

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
    
    // Handle tour finished - only on last step
    // IMPORTANT: react-joyride may call FINISHED when it can't find an element
    // We need to differentiate between actual completion and error
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
        // FINISHED on non-last step is likely an error (element not found)
        // Don't stop the tour - try to continue to next step
        console.warn('Tour marked as FINISHED but not on last step. This is likely an error. Continuing to next step...', { 
          index, 
          lastStepIndex,
          target: currentSteps[index]?.target 
        });
        // Check if next step target exists
        const nextTarget = currentSteps[index + 1]?.target;
        if (nextTarget) {
          // Try to find next element and advance
          const maxAttempts = 50;
          const delay = 200;
          let attempts = 0;
          const checkNextAndAdvance = () => {
            const element = typeof nextTarget === 'string' ? document.querySelector(nextTarget) : null;
            if (element || attempts >= maxAttempts) {
              console.log('Advancing to next step after FINISHED error', { nextIndex: index + 1, found: !!element, attempts });
              setTimeout(() => setStepIndex(index + 1), 100);
            } else {
              attempts++;
              setTimeout(checkNextAndAdvance, delay);
            }
          };
          setTimeout(checkNextAndAdvance, 0);
        } else {
          // No target, advance immediately
          setTimeout(() => setStepIndex(index + 1), 100);
        }
        return;
      }
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
    } else if (type === 'error:target_not_found') {
      console.warn('Tour target not found for step:', index, 'Target:', currentSteps[index]?.target);
      const targetSelector = currentSteps[index]?.target;
      if (targetSelector && typeof targetSelector === 'string') {
        const maxAttempts = 50;
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
                if (stepIndex !== index) {
                  setStepIndex(index);
                }
              }, 300);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(findElement, delay);
            } else {
              console.warn('Element found but not visible after', maxAttempts, 'attempts, skipping to next step:', index + 1);
              if (index < currentSteps.length - 1) {
                setTimeout(() => setStepIndex(index + 1), 100);
              }
            }
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(findElement, delay);
          } else {
            console.warn('Element not found after', maxAttempts, 'attempts, skipping to next step:', index + 1);
            if (index < currentSteps.length - 1) {
              setTimeout(() => setStepIndex(index + 1), 100);
            }
          }
        };
        setTimeout(findElement, 0);
      } else {
        console.warn('No valid target selector, continuing to next step:', index + 1);
        if (index < currentSteps.length - 1) {
          setTimeout(() => setStepIndex(index + 1), 100);
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

