import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex justify-between items-center py-4">
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
    </header>
  );
}
