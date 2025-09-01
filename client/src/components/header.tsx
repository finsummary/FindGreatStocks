import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="py-4 border-b bg-white dark:bg-gray-900/50 dark:border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold cursor-pointer">FindGreatStocks</h1>
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/watchlist">
                <Button variant="ghost">Watchlist</Button>
              </Link>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/login?signup=true">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
