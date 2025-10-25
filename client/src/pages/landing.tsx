import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            FindGreatStocks<span className="text-blue-600">.com</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Professional S&P 500 market intelligence platform with real-time financial data, 
            advanced risk analytics, and personalized watchlist tracking.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 text-base sm:text-lg"
          >
            Sign In to Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-16">
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


        {/* CTA Section */}
        <div className="text-center bg-blue-600 text-white rounded-lg p-6 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Ready to Start Building Your Watchlist?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
            Sign in with your account to save stocks and access personalized features
          </p>
          <Button 
            onClick={handleLogin}
            variant="secondary"
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-6 sm:px-8 py-3 text-base sm:text-lg"
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