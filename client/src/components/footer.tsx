import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src="/src/assets/logo.svg" 
                alt="FindGreatStocks Logo" 
                className="h-8 w-8"
              />
              <span className="ml-2 text-xl font-bold">Find<span className="font-black">Great</span>Stocks</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Empowering investors with professional-grade analysis tools and educational resources. 
              Make informed investment decisions with data-driven insights.
            </p>
            <div className="flex space-x-4">
              <a
                href="mailto:hello@FindGreatStocks.com"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-300 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/watchlist" className="text-gray-300 hover:text-white transition-colors">
                  Watchlist
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="text-gray-300 hover:text-white transition-colors">
                  Investment Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
              <p className="text-gray-300">
                Questions? We're here to help!
              </p>
              <a
                href="mailto:hello@FindGreatStocks.com"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                hello@FindGreatStocks.com
              </a>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} FindGreatStocks. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Investment analysis platform for educational purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-800 mt-6 pt-6">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">
              <strong>Important:</strong> FindGreatStocks is for educational and informational purposes only. 
              We do not provide investment advice. All investments carry risk, and past performance does not 
              guarantee future results. Please conduct your own research and consider consulting with 
              qualified financial advisors before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
