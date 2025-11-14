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
import { supabase } from "./lib/supabaseClient";
import Footer from "./components/footer";
import { useFlag } from "./providers/FeatureFlagsProvider";
import EducationPage from "./pages/education";
import AdminFlagsPage from "./pages/admin-flags";
import { useEffect, useRef } from 'react';

declare global { interface Window { posthog?: any } }

function App() {
  useAnalytics();
  const { user } = useAuth();
  const navigate = useNavigate();
  const educationOn = useFlag('education');

  // Auto-reload tab when backend commit changes (prevents stale chunks → React #300)
  const initialCommitRef = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const r = await fetch(`/api/health?_=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const commit = String(j?.commit || '');
        if (initialCommitRef.current == null) {
          initialCommitRef.current = commit;
        } else if (commit && initialCommitRef.current && commit !== initialCommitRef.current) {
          // New deploy detected → reload to avoid mismatched React bundles
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
      <header className="px-4 lg:px-6 min-h-14 h-auto flex items-center flex-wrap gap-2">
        <Link className="flex items-center justify-center gap-2 min-w-0" to="/">
          <img
            src="/logo.svg"
            alt="FindGreatStocks Logo"
            className="h-8 w-8 flex-shrink-0"
          />
          <span className="truncate font-semibold text-xs sm:text-lg">FindGreatStocks.com</span>
        </Link>
        <nav className="ml-auto w-full sm:w-auto flex items-center justify-start sm:justify-end gap-2 sm:gap-4">
          {/* Admin flags link visible only to the owner account */}
          {user?.email?.toLowerCase() === 'findgreatstocks@gmail.com' && (
            <Button asChild variant="ghost" size="sm" className="!text-muted-foreground">
              <Link to="/admin/flags">Flags</Link>
            </Button>
          )}
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
            <a href="https://blog.findgreatstocks.com" target="_blank" rel="noopener noreferrer" onClick={() => { try { window.posthog?.capture?.('blog_clicked'); } catch {} }}>Blog</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/watchlist">Watchlist</Link>
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
      </header>
      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<Home />} />
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
