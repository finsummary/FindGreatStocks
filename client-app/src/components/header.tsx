import React from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="px-4 lg:px-6 h-14 flex items-center shadow-sm">
      <Link className="flex items-center justify-center" to="/">
        <span className="ml-2 text-lg font-semibold">FindGreatStocks.com</span>
      </Link>
      <nav className="ml-auto flex items-center gap-4 sm:gap-6">
        <Link to="/" className="text-sm font-medium hover:text-primary">
          Home
        </Link>
        <Link to="/login" className="text-sm font-medium hover:text-primary">
          Sign In
        </Link>
      </nav>
    </header>
  );
}
