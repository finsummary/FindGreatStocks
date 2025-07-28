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

### July 28, 2025 - Enhanced Multi-Strategy Data Collection and Database Recovery
- **Multi-Strategy Approach**: Implemented comprehensive stock universe access using multiple FMP endpoints (stock-screener, exchange-based filtering)
- **Database Recovery**: Successfully restored and expanded to 3,936 companies with $83.04T total market cap
- **Enhanced Financial Data**: Added comprehensive metrics including P/E ratios, EPS, trading volume, beta values
- **Improved ETF Filtering**: Advanced pattern matching to ensure only authentic companies in rankings
- **Batch Processing**: Efficient 50-company batches with rate limiting and error handling
- **Performance Optimized**: 32-second sync time with robust error recovery
- **API Integration**: Fixed authentication issues and implemented proper URL formatting
- **Global Coverage**: Authentic companies from NYSE, NASDAQ, and major international exchanges