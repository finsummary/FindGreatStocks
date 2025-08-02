import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, BarChart3, TrendingUp, Shield, Users } from "lucide-react";

export default function About() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <h1 className="text-xl font-bold text-primary">FindGreatStocks.com</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">About FindGreatStocks.com</h1>
          
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-xl text-muted-foreground mb-8">
              Your comprehensive platform for discovering exceptional investment opportunities across global markets.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-card p-6 rounded-lg border">
                <BarChart3 className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Real-Time Market Data</h3>
                <p className="text-muted-foreground">
                  Access authentic, real-time financial data for S&P 500, Nasdaq 100, and FTSE 100 companies powered by Financial Modeling Prep API.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border">
                <TrendingUp className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Comprehensive financial metrics including market cap, revenue, earnings, P/E ratios, returns analysis, and risk-adjusted performance indicators.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border">
                <Shield className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Reliable & Secure</h3>
                <p className="text-muted-foreground">
                  Built with modern security practices, automated daily updates, and enterprise-grade data integrity to ensure accurate investment insights.
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Personal Watchlists</h3>
                <p className="text-muted-foreground">
                  Create and manage personalized watchlists to track your favorite stocks across multiple indices with secure user authentication.
                </p>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                FindGreatStocks.com democratizes access to professional-grade financial analysis tools. We believe every investor deserves access to comprehensive, accurate, and timely market data to make informed investment decisions.
              </p>
              <p className="text-muted-foreground">
                Our platform combines cutting-edge technology with reliable data sources to deliver insights that were once available only to institutional investors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Key Features</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Complete coverage of 703 companies across S&P 500, Nasdaq 100, and FTSE 100 indices</li>
                <li>Real-time price updates and market capitalizations</li>
                <li>Comprehensive fundamental analysis with revenue, earnings, and P/E ratios</li>
                <li>Multi-year performance tracking (3Y, 5Y, 10Y annualized returns)</li>
                <li>Risk analysis with maximum drawdown and AR/MDD ratios</li>
                <li>Advanced sorting and filtering capabilities</li>
                <li>Secure user authentication and persistent watchlists</li>
                <li>Mobile-responsive design for on-the-go analysis</li>
                <li>Daily automated data updates after market close</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Data Sources</h2>
              <p className="text-muted-foreground">
                All financial data is sourced from Financial Modeling Prep, a trusted provider of real-time and historical financial data. 
                Our system automatically updates stock prices, market capitalizations, and financial metrics daily after market close 
                to ensure you always have access to the most current information.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}