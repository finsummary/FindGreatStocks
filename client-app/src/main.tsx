import React from 'react';
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
import { initSentry } from './lib/sentry';

const queryClient = new QueryClient();

// Initialize Google Analytics
initSentry();
initGA();

function Bootstrap() {
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
