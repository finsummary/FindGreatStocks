import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-300">
            © {new Date().getFullYear()} FindGreatStocks.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
