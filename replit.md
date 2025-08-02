# CompaniesMarketCap Application

## Overview

This is a full-stack financial data application that displays companies ranked by market capitalization. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data storage and Drizzle ORM for database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with CSS variables for theming, supports light/dark mode

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API design
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reload with tsx for development server

### Database Schema
- **Companies Table**: Stores financial data including market cap, stock price, daily changes, country info, and rankings
- **Users Table**: Basic user management for favorites functionality
- **Favorites Table**: Junction table linking users to their favorite companies

## Key Components

### Data Layer
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Schema Definition**: Centralized in `shared/schema.ts` for type consistency
- **Storage Interface**: Abstracted storage layer with in-memory fallback for development

### API Endpoints
- `GET /api/companies` - Paginated company listings with filtering and sorting
- `GET /api/companies/:symbol` - Individual company details
- Market statistics and favorites endpoints (planned)

### Frontend Components
- **CompanyTable**: Main data grid with sorting, filtering, and pagination
- **Theme Provider**: Light/dark mode support with system preference detection
- **UI Components**: Comprehensive component library from shadcn/ui

### Development Tools
- **Vite Configuration**: Optimized for development with hot reload
- **TypeScript**: Strict type checking across frontend and backend
- **Path Aliases**: Clean imports with @ and @shared prefixes

## Data Flow

1. **Client Request**: Frontend makes API calls using TanStack Query
2. **Server Processing**: Express routes handle requests and query database
3. **Database Operations**: Drizzle ORM executes type-safe SQL queries
4. **Response Handling**: JSON responses with proper error handling
5. **Client Updates**: React Query manages caching and state updates

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connection
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components for accessibility
- **drizzle-orm**: Type-safe database ORM

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **TailwindCSS**: Utility-first CSS framework

### Utilities
- **zod**: Runtime type validation and schema generation
- **date-fns**: Date manipulation utilities
- **wouter**: Lightweight routing for React

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code for production deployment
- **Database**: Drizzle migrations handle schema changes

### Environment Configuration
- **Database**: Requires `DATABASE_URL` environment variable
- **Development**: Local development with hot reload
- **Production**: Bundled Node.js application serving static assets

### Architecture Decisions

1. **Monorepo Structure**: Frontend, backend, and shared code in single repository for easier development and type sharing
2. **TypeScript Throughout**: Ensures type safety from database to UI components
3. **Drizzle ORM**: Chosen for type safety and PostgreSQL compatibility (may be extended with Postgres later)
4. **In-Memory Fallback**: Development storage layer allows testing without database setup
5. **Component Library**: shadcn/ui provides consistent, accessible UI components
6. **Server-Side Rendering**: Vite handles SSR-ready React application structure
7. **Automated Data Updates**: Daily scheduler automatically refreshes company prices after market close

## Recent Changes

### August 2, 2025 - UX Enhancement: Stock Scanner as Default Home Page
- **Immediate Access**: Stock scanner now serves as the default home page for all users (authenticated and non-authenticated)
- **Authentication Flow**: Users only prompted to sign in when attempting to add stocks to watchlist, not for viewing data
- **Smart Routing**: Landing page moved to /welcome as optional marketing page, stock scanner accessible immediately
- **Critical Data Formatting Fixes**: 
  - Fixed S&P 500/Nasdaq 100 returns displaying 100x larger values (removed double percentage conversion)
  - Fixed FTSE 100 returns showing near-zero values (added decimal-to-percentage conversion for 0.0772 → 7.72%)
  - Corrected Max Drawdown formatting across all three indices with proper percentage display
  - Updated AR/MDD ratio calculations to handle different data formats correctly
- **Google Ads Error Handling**: Temporarily disabled Google Ads initialization until proper AdSense publisher ID configured
- **Enhanced User Experience**: Sign In button appears in header for non-authenticated users with clear prompts for watchlist access

### August 2, 2025 - Production Deployment and GitHub Preparation
- **Website Rebranding**: Complete rebrand from "MarketCapClone" to "FindGreatStocks.com" across all interfaces
- **GitHub Repository Setup**: Created comprehensive README.md, LICENSE, .gitignore, and DEPLOYMENT.md for open source distribution
- **Legal Compliance Framework**: Created professional About, Terms of Service, Privacy Policy, Investment Disclaimer, and Contact pages
- **SEO Optimization**: Added proper meta tags and page titles for search engine optimization
- **Professional Documentation**: Complete deployment guide for Replit with custom domain configuration (Namecheap)
- **Production Ready**: All analytics, ads, and legal frameworks prepared for live deployment
- **Contact Integration**: Established hello@FindGreatStocks.com as primary support email across all pages

### August 2, 2025 - Complete Authentication System Implementation
- **Replit Auth Integration**: Full OpenID Connect authentication system with secure user sessions
- **Protected Routes**: Watchlist and user-specific endpoints require authentication with proper 401 responses
- **User Database Schema**: Created sessions table and updated users table for Replit Auth compatibility
- **Landing Page**: Beautiful sign-in page for non-authenticated users with feature highlights
- **User Profile Display**: Shows user name, email, and profile picture in header when authenticated
- **Persistent Watchlists**: User watchlists now saved permanently to database linked to authenticated user accounts
- **Authentication Flow**: Complete sign-in/sign-out functionality with automatic redirects and error handling
- **Session Management**: Secure session storage using PostgreSQL with proper cleanup and expiration

### August 2, 2025 - Google Analytics & Ads Integration + Clean UI
- **Google Analytics Ready**: Complete Google Analytics 4 integration with page view tracking, event tracking, and user interaction analytics
- **Google Ads Placement**: Added top and bottom Google Ads banners with proper AdSense integration for monetization
- **Streamlined Interface**: Removed market statistics header section for cleaner, focused user experience
- **Analytics Tracking**: Event tracking for tab switches, watchlist interactions, and user logout actions
- **Production Ready**: All analytics and ads code prepared for deployment - requires Google Analytics ID and AdSense publisher ID setup

### August 2, 2025 - Complete Triple-Index Support with FTSE 100
- **Triple-Index Automated Updates**: Enhanced scheduler system updates S&P 500, Nasdaq 100, and FTSE 100 after 4 PM ET market close
- **Real-time Price Data**: Financial Modeling Prep API integration fetches authentic stock prices and market caps daily for all three indices
- **FTSE 100 Complete Integration**: Added full FTSE 100 support with database schema, import system, daily updater, and API endpoints
- **Triple-Tab Navigation**: Frontend now displays all three indices (S&P 500, Nasdaq 100, FTSE 100) with seamless tab switching
- **Update Status Display**: Added market status indicator showing next update countdown and schedule information
- **Batch Processing**: Efficient API handling for 600+ companies (503 S&P 500 + 100 Nasdaq + 100 FTSE) with rate limiting and error handling
- **Manual Update Triggers**: Separate admin endpoints for forcing immediate price updates on all three indices
- **Consistent Logo Integration**: All indices use Financial Modeling Prep logo URLs for unified branding across platforms
- **Column Highlighting**: Currently sorted column displays with blue background for improved visual feedback
- **Watchlist System**: Complete personal stock tracking with star icons, dedicated watchlist page, and CSV export
- **Database Persistence**: Watchlist data stored permanently with user preferences maintained across sessions
- **Clean Interface**: Streamlined design removing unnecessary controls, focused on core functionality
- **Professional Branding**: Rebranded to "FindGreatStocks" with S&P 500 market intelligence focus

### August 1, 2025 - Enhanced UI and Complete Data Population
- **Responsive Table Design**: Fixed horizontal scrolling by implementing fixed table layout with optimized column widths
- **Full Column Headers**: All column names now display completely (Market Cap, 3Y Return, 5Y Return, Max Drawdown, AR/MDD Ratio)
- **Ranking Options**: Added comprehensive "Rank by..." dropdown with 9 sorting options (Market Cap, Revenue, Returns, AR/MDD Ratio, etc.)
- **Complete Fundamental Data**: Fixed missing Revenue/Earnings/P/E data for companies 101+ by populating all 503 companies with authentic Financial Modeling Prep API data
- **99.6% Data Coverage**: Successfully populated fundamental metrics for 277 out of 278 companies with comprehensive financial data
- **Professional Layout**: Optimized table for investment analysis with compact, readable design fitting all 15 metrics without scrolling

### July 31, 2025 - Complete Risk-Adjusted Analytics with AR/MDD Ratio
- **AR/MDD Ratio Column**: Added Annualized Return to Maximum Drawdown ratio for superior risk-adjusted performance analysis
- **Enhanced Column Layout**: Expanded company name column width (280px) for better readability of full company names
- **Risk-Adjusted Performance Ranking**: NVIDIA (1.21 AR/MDD), Eli Lilly (1.09 AR/MDD), Broadcom (0.85 AR/MDD) show best risk-adjusted returns
- **Color-Coded AR/MDD Ratios**: Green (≥0.5), Yellow (≥0.2), Red (<0.2) for intuitive risk-adjusted performance assessment
- **Professional Investment Table**: 15 columns including Market Cap, Price, Revenue, Earnings, P/E, 3Y/5Y/10Y Returns, Max Drawdown, AR/MDD Ratio, Today's Change
- **Complete Risk Analytics**: Maximum Drawdown analysis combined with return ratios for comprehensive downside risk evaluation
- **Enhanced S&P 500 Scanner**: "Add Max Drawdown" button for one-click risk analysis enhancement across all companies
- **Optimized UI Layout**: Better column spacing and truncated company names with improved visual hierarchy
- **Database Schema Enhanced**: Added return_drawdown_ratio_10_year field with automatic calculation from existing return and drawdown data
- **Investment-Grade Analysis Platform**: Complete fundamental, technical, and risk-adjusted metrics for professional stock analysis