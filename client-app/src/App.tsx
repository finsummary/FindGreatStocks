import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useAnalytics } from './hooks/use-analytics';
import { HomePage as Home } from "./pages/home";
import { LoginPage } from "./pages/login";
import { WatchlistPage as Watchlist } from "./pages/watchlist";
import { PaymentSuccessPage } from './pages/payment-success';
import { PaymentCancelledPage } from './pages/payment-cancelled';
import { useAuth } from "@/providers/AuthProvider";
import { ProfilePage } from './pages/profile';
import { BillingPage } from './pages/billing';
import TermsPage from './pages/terms';
import PrivacyPage from './pages/privacy';
import DisclaimerPage from './pages/disclaimer';
import AboutPage from './pages/about';
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "./components/ui/sheet";
import { supabase } from "./lib/supabaseClient";
import Footer from "./components/footer";
import { useFlag } from "./providers/FeatureFlagsProvider";
import EducationPage from "./pages/education";
import AdminFlagsPage from "./pages/admin-flags";
import LandingPage from "./pages/landing";
import { useIsMobile } from "./hooks/use-mobile";
import { Menu } from "lucide-react";
import React, { useEffect, useRef, useState } from 'react';
import { MobileWarning } from "./components/mobile-warning";
import { PromoBanner } from "./components/promo-banner";

declare global { interface Window { posthog?: any } }

// Use relative paths to go through Vercel proxy (see vercel.json rewrites)
// Only use absolute URL if explicitly set via env var (for local dev with Railway)
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

// Component to conditionally show LandingPage or HomePage
function HomePageWrapper() {
  const { user } = useAuth();
  const [shouldShowLanding, setShouldShowLanding] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // If user is logged in, always show scanner
    if (user) {
      setShouldShowLanding(false);
      return;
    }

    // If user is not logged in, check if they clicked "Explore the Scanner"
    try {
      const hasClickedExplore = localStorage.getItem('fgs:landing:seen');
      setShouldShowLanding(hasClickedExplore !== '1');
    } catch {
      setShouldShowLanding(true);
    }
  }, [user]);

  // Show loading state while checking
  if (shouldShowLanding === null) {
    return <Home />; // Default to Home while checking
  }

  // If user is logged in, show scanner (Home)
  // If user is not logged in and hasn't clicked "Explore", show Landing Page
  // If user is not logged in but clicked "Explore", show scanner (Home)
  return shouldShowLanding ? <LandingPage /> : <Home />;
}

function App() {
  useAnalytics();
  const { user } = useAuth();
  const navigate = useNavigate();
  const educationOn = useFlag('education');
  const isMobile = useIsMobile();

  // Auto-reload tab when backend commit changes (prevents stale chunks → React #300)
  // BUT: Don't reload if user is in the middle of onboarding tour
  const initialCommitRef = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        // Check if tour is in progress - don't reload during tour
        const tourActive = localStorage.getItem('fgs:guided-tour:active');
        const savedStep = localStorage.getItem('fgs:guided-tour:current-step');
        const tourCompleted = localStorage.getItem('fgs:guided_tour:completed');
        if ((tourActive === '1' || savedStep !== null) && !tourCompleted) {
          // Tour is in progress - skip reload check completely
          return;
        }
        
        const r = await fetch(`${API_BASE}/api/health?_=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const commit = String(j?.commit || '');
        if (initialCommitRef.current == null) {
          initialCommitRef.current = commit;
        } else if (commit && initialCommitRef.current && commit !== initialCommitRef.current) {
          // New deploy detected → reload to avoid mismatched React bundles
          // BUT: Double-check if tour is active right before reload
          const checkActive = localStorage.getItem('fgs:guided-tour:active');
          const checkStep = localStorage.getItem('fgs:guided-tour:current-step');
          const checkCompleted = localStorage.getItem('fgs:guided_tour:completed');
          if ((checkActive === '1' || checkStep !== null) && !checkCompleted) {
            // Tour started between checks - skip reload
            console.log('Skipping auto-reload due to active guided tour.');
            return;
          }
          window.location.reload();
        }
      } catch {}
    };
    ping();
    const id = setInterval(ping, 60000); // check every 60s
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Identify user in PostHog
  useEffect(() => {
    const email = (user?.email || '').toLowerCase();
    if (email) {
      try { window.posthog?.identify?.(email, { email, plan: (user as any)?.subscriptionTier || 'free' }); } catch {}
    } else {
      try { window.posthog?.reset?.(); } catch {}
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); // Redirect to home after logout
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PromoBanner />
      <header className="px-4 lg:px-6 min-h-14 h-auto flex items-center flex-wrap gap-2">
        <Link className="flex items-center justify-center gap-2 min-w-0" to="/">
          <img
            src="/logo.svg"
            alt="FindGreatStocks Logo"
            className="h-8 w-8 flex-shrink-0"
          />
          <span className="truncate font-semibold text-xs sm:text-lg">FindGreatStocks.com</span>
        </Link>
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto min-h-[44px] min-w-[44px] p-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white">
              <SheetHeader>
                <SheetTitle className="text-slate-900">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {user?.email?.toLowerCase() === 'findgreatstocks@gmail.com' && (
                  <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100 justify-start min-h-[48px]">
                    <SheetClose asChild>
                      <Link to="/admin/flags" className="w-full text-left">Flags</Link>
                    </SheetClose>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100 justify-start min-h-[48px]">
                  <SheetClose asChild>
                    <Link to="/start-here" data-tour="start-here" className="w-full text-left">Start Here</Link>
                  </SheetClose>
                </Button>
                {educationOn ? (
                  <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100 justify-start min-h-[48px]">
                    <SheetClose asChild>
                      <Link to="/education" className="w-full text-left">Education</Link>
                    </SheetClose>
                  </Button>
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">Education (Coming Soon)</div>
                )}
                <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100 justify-start min-h-[48px]">
                  <a href="https://blog.findgreatstocks.com" target="_blank" rel="noopener noreferrer" onClick={() => { try { (window as any).phCapture?.('blog_clicked'); } catch {} }} className="w-full text-left">Blog</a>
                </Button>
                <Button asChild variant="outline" size="sm" className="justify-start min-h-[48px] border-slate-300 text-slate-700 hover:bg-slate-50">
                  <SheetClose asChild>
                    <Link to="/watchlist" data-tour="watchlist-nav-button" className="w-full text-left">Watchlist</Link>
                  </SheetClose>
                </Button>
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-200 mt-2 pt-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{(user.email || 'U').slice(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate text-slate-700">{user.email}</span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100 justify-start min-h-[48px]">
                      <SheetClose asChild>
                        <Link to="/profile" className="w-full text-left">Profile</Link>
                      </SheetClose>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-slate-100 justify-start min-h-[48px]">
                      <SheetClose asChild>
                        <Link to="/billing" className="w-full text-left">Billing</Link>
                      </SheetClose>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 justify-start min-h-[48px]" onClick={handleLogout}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <Button asChild size="sm" className="justify-start min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white">
                    <SheetClose asChild>
                      <Link to="/login" className="w-full text-left">Login</Link>
                    </SheetClose>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="ml-auto w-full sm:w-auto flex items-center justify-start sm:justify-end gap-2 sm:gap-4">
            {/* Admin flags link visible only to the owner account */}
            {user?.email?.toLowerCase() === 'findgreatstocks@gmail.com' && (
              <Button asChild variant="ghost" size="sm" className="!text-muted-foreground">
                <Link to="/admin/flags">Flags</Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm" className="!text-muted-foreground hover:!text-muted-foreground">
              <Link to="/start-here" data-tour="start-here">Start Here</Link>
            </Button>
            {educationOn ? (
              <Button asChild variant="ghost" size="sm" className="!text-muted-foreground hover:!text-muted-foreground">
                <Link to="/education">Education</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="!text-muted-foreground hover:!text-muted-foreground">
                    Education
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem disabled className="text-muted-foreground">Coming Soon</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button asChild variant="ghost" size="sm">
              <a href="https://blog.findgreatstocks.com" target="_blank" rel="noopener noreferrer" onClick={() => { try { (window as any).phCapture?.('blog_clicked'); } catch {} }}>Blog</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/watchlist" data-tour="watchlist-nav-button">Watchlist</Link>
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{(user.email || 'U').slice(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm hidden sm:inline max-w-[180px] truncate">{user.email}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/billing">Billing</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1 p-4 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<HomePageWrapper />} />
          <Route path="/start-here" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/billing" element={<BillingPage />} />
          {/* Blog routes temporarily disabled */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="/admin/flags" element={<AdminFlagsPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
