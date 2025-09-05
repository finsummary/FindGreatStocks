import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { HomePage as Home } from "./pages/home";
import { LoginPage } from "./pages/login";
import { WatchlistPage as Watchlist } from "./pages/watchlist";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "./components/ui/button";
import { supabase } from "./lib/supabaseClient";

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="ml-2 text-lg font-semibold">FindGreatStocks</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium hover:underline underline-offset-4"
            to="/watchlist"
          >
            Watchlist
          </Link>
          {user ? (
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
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
        </Routes>
      </main>
    </div>
  );
}

export default App;
