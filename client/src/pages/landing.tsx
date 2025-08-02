import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Find<span className="text-blue-600">Great</span>Stocks
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Professional S&P 500 market intelligence platform with real-time financial data, 
            advanced risk analytics, and personalized watchlist tracking.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Sign In to Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Real-Time Data</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Live stock prices and market caps updated daily from Financial Modeling Prep API
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Risk Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced metrics including 3Y/5Y/10Y returns, maximum drawdown, and AR/MDD ratios
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Personal Watchlist</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Save your favorite stocks and track them across sessions with persistent storage
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Complete Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All 503 S&P 500 companies with comprehensive fundamental and technical data
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Stats Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Market Overview
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">503</div>
              <div className="text-gray-600 dark:text-gray-300">S&P 500 Companies</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">$59.4T</div>
              <div className="text-gray-600 dark:text-gray-300">Total Market Cap</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">15</div>
              <div className="text-gray-600 dark:text-gray-300">Key Metrics</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-blue-600 text-white rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Building Your Watchlist?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Sign in with your account to save stocks and access personalized features
          </p>
          <Button 
            onClick={handleLogin}
            variant="secondary"
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg"
          >
            Sign In Now
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
          <p>Professional market intelligence • Real-time data • Secure authentication</p>
        </div>
      </div>
    </div>
  );
}