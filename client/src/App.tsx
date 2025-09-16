import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { HomePage as Home } from "./pages/home";
import { LoginPage } from "./pages/login";
import { WatchlistPage as Watchlist } from "./pages/watchlist";
import { PaymentSuccessPage } from './pages/payment-success';
import { PaymentCancelledPage } from './pages/payment-cancelled';
import { useAuth } from "@/providers/AuthProvider";
import { ProfilePage } from './pages/profile';
import { BillingPage } from './pages/billing';
import BlogPage from './pages/blog';
import BlogPostPage from './pages/blog-post';
import TermsPage from './pages/terms';
import PrivacyPage from './pages/privacy';
import DisclaimerPage from './pages/disclaimer';
import AboutPage from './pages/about';
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { supabase } from "./lib/supabaseClient";
import Footer from "./components/footer";

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); // Redirect to home after logout
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center shadow-sm">
        <Link className="flex items-center justify-center" to="/">
          <img 
            src="/src/assets/logo.svg" 
            alt="FindGreatStocks Logo" 
            className="h-8 w-8"
          />
          <span className="ml-2 text-lg font-semibold">Find<span className="font-bold">Great</span>Stocks</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Button asChild variant="ghost">
            <Link to="/blog">Blog</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/watchlist">Watchlist</Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-full border px-2 py-1 hover:bg-muted/50">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{(user.email || 'U').slice(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm hidden sm:inline">{user.email}</span>
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
            <Button asChild>
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
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
