# FindGreatStocks.com

A comprehensive market intelligence platform delivering advanced financial analytics across multiple global market indices, with real-time company insights and powerful tracking capabilities.

## 🚀 Features

- **Real-Time Market Data**: Live stock prices and market caps for S&P 500, Nasdaq 100, and FTSE 100 companies
- **Advanced Analytics**: Comprehensive financial metrics including revenue, earnings, P/E ratios, and risk-adjusted returns
- **Personal Watchlists**: Secure user authentication with persistent watchlist tracking
- **Risk Analysis**: Maximum drawdown analysis and AR/MDD ratios for investment decision-making
- **Multi-Index Support**: Complete coverage of 703 companies across three major indices
- **Daily Updates**: Automated data refreshing after market close using Financial Modeling Prep API

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui component library
- **TanStack Query** for server state management
- **Wouter** for lightweight client-side routing

### Backend
- **Node.js** with Express.js framework
- **TypeScript** with ES modules
- **PostgreSQL** with Drizzle ORM
- **Replit Auth** for secure user authentication
- **Financial Modeling Prep API** for real-time data

### Analytics & Monetization
- **Google Analytics 4** integration for user tracking
- **Google AdSense** banner placement for monetization

## 🏗️ Architecture

```
FindGreatStocks.com/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
├── server/                 # Express.js backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── scheduler.ts       # Daily data updates
│   └── *.ts              # Data import and enhancement scripts
├── shared/                # Shared TypeScript types
│   └── schema.ts         # Database schema and types
└── docs/                 # Legal and compliance pages
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Financial Modeling Prep API key

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# API Keys
FMP_API_KEY=your_financial_modeling_prep_api_key

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=your_google_analytics_id

# Session Security
SESSION_SECRET=your_secure_session_secret
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/findgreatstocks.git
cd findgreatstocks
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:push
```

4. Import initial data:
```bash
npm run data:import
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📊 Data Sources

All financial data is sourced from **Financial Modeling Prep**, providing:
- Real-time stock prices and market capitalizations
- Comprehensive fundamental data (revenue, earnings, P/E ratios)
- Historical performance metrics (3Y, 5Y, 10Y returns)
- Risk analysis data (maximum drawdown calculations)

## 🔐 Security

- **Secure Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions with secure cookies
- **Data Protection**: Environment-based API key management
- **Input Validation**: Zod schema validation on all API endpoints

## 📱 Responsive Design

Fully responsive design optimized for:
- Desktop computers (1920x1080+)
- Tablets (768px - 1024px)
- Mobile devices (320px - 767px)

## 🚀 Deployment

### Replit Deployment
1. Push your code to this Replit project
2. Set up environment variables in the Secrets tab
3. Click the "Deploy" button in Replit
4. Configure your custom domain in deployment settings

### Custom Domain Setup (Namecheap)
1. In your Namecheap domain management:
   - Add a CNAME record pointing to your Replit deployment URL
   - Configure DNS settings as provided by Replit
2. In Replit deployment settings:
   - Add your custom domain
   - Enable SSL/TLS certificates

## 📈 Analytics Setup

### Google Analytics
1. Create a Google Analytics 4 property
2. Get your Measurement ID (starts with "G-")
3. Add `VITE_GA_MEASUREMENT_ID` to your environment variables

### Google AdSense
1. Apply for Google AdSense approval
2. Get your Publisher ID
3. Update the ad client ID in `google-ads-banner.tsx`
4. Create ad units and update slot IDs

## 🛡️ Legal Compliance

The platform includes comprehensive legal pages:
- **Terms of Service**: User agreement and platform rules
- **Privacy Policy**: Data collection and user rights
- **Investment Disclaimer**: Risk warnings and liability limitations
- **About**: Company information and platform features
- **Contact**: Support information (hello@FindGreatStocks.com)

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push database schema changes
npm run data:import  # Import initial stock data
npm run data:update  # Update stock prices (manual)
```

## 📊 Database Schema

### Core Tables
- **companies**: S&P 500 company data and metrics
- **nasdaq100_companies**: Nasdaq 100 company data
- **ftse100_companies**: FTSE 100 company data
- **users**: User accounts and profiles
- **favorites**: User watchlist relationships
- **sessions**: Secure session storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email hello@FindGreatStocks.com or create an issue on GitHub.

## 🚀 Live Demo

Visit [FindGreatStocks.com](https://findgreatstocks.com) to see the platform in action.

---

Built with ❤️ using modern web technologies for smart investors worldwide.