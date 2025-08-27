import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { HomePage as Home } from "./pages/home";
import About from "./pages/about";
import Contact from "./pages/contact";
import Disclaimer from "./pages/disclaimer";
import Privacy from "./pages/privacy";
import Terms from "./pages/terms";
import NotFound from "./pages/not-found";
import Landing from "./pages/landing";
import { WatchlistPage as Watchlist } from "./pages/watchlist";
import { LoginPage } from './pages/login';
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { initGoogleAds } from "./components/google-ads-banner";

function Router() {
  // Track page views when routes change
  useAnalytics();

  return (
    <Switch>
      {/* Public stock scanner available to all users */}
      <Route path="/" component={Home} />
      
      {/* Protected watchlist page */}
      <Route path="/watchlist" component={Watchlist} />
      
      {/* Landing page now optional/marketing page */}
      <Route path="/welcome" component={Landing} />
      
      {/* Public pages available to all users */}
      <Route path="/about" component={About} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
    
    // Initialize Google Ads only if AdSense publisher ID is available
    if (import.meta.env.VITE_ADSENSE_PUBLISHER_ID) {
      initGoogleAds();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
