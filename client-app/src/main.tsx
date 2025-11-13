import React, { useEffect } from 'react';
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/error-boundary';
import { AuthProvider } from './providers/AuthProvider';
import { HelmetProvider } from 'react-helmet-async';
import { initGA } from './lib/analytics';
import { ThemeProvider } from './components/theme-provider';
import { FeatureFlagsProvider } from './providers/FeatureFlagsProvider';

const queryClient = new QueryClient();

// Initialize Google Analytics
initGA();

function Bootstrap() {
  // Initialize Microsoft Clarity if project ID is provided
  useEffect(() => {
    const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
    if (!clarityId) return;
    try {
      (window as any).clarity = (window as any).clarity || function() {
        ((window as any).clarity.q = (window as any).clarity.q || []).push(arguments as any);
      };
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.clarity.ms/tag/${clarityId}`;
      const tag = document.getElementsByTagName('script')[0];
      tag.parentNode?.insertBefore(s, tag);
    } catch (e) {
      console.warn('[analytics] Failed to init Microsoft Clarity', e);
    }
  }, []);

  return (
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ThemeProvider defaultTheme="light">
                  <FeatureFlagsProvider>
                    <App />
                  </FeatureFlagsProvider>
                </ThemeProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Bootstrap />);
