import { Users, Target, BarChart2, TrendingUp, CheckCircle, Shield, ArrowLeft } from 'lucide-react';
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
        <article className="prose dark:prose-invert max-w-4xl mx-auto">
          <h1>About Us</h1>
          <p>
            Welcome to FindGreatStocks, your premier destination for simplified stock analysis.
          </p>
          <section className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">About FindGreatStocks.com</h1>
            <p className="text-xl text-muted-foreground">
              Empowering investors with data-driven insights for smarter decision-making.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Our Mission</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <Target className="h-24 w-24 text-primary mx-auto mb-4" />
              </div>
              <div className="md:w-1/2">
                <p className="text-lg text-muted-foreground">
                  Our mission is to simplify the process of stock analysis by providing a powerful, intuitive, and accessible platform. We believe that every investor, from beginners to seasoned experts, should have access to high-quality financial data and sophisticated tools to make informed decisions. We are committed to transparency, accuracy, and continuous improvement to help you navigate the complexities of the stock market with confidence.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-card p-8 rounded-lg border mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex items-start space-x-4">
                <BarChart2 className="h-8 w-8 text-primary mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Comprehensive Data</h3>
                  <p className="text-muted-foreground">Access a wide range of fundamental and technical metrics for hundreds of stocks across major indices like the S&P 500 and Nasdaq 100.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <TrendingUp className="h-8 w-8 text-primary mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
                  <p className="text-muted-foreground">Utilize powerful tools like DCF valuation, DuPont analysis, and risk-adjusted return metrics to gain deeper insights into company performance.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-8 w-8 text-primary mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Customizable Watchlist</h3>
                  <p className="text-muted-foreground">Create and manage your personal watchlist to track the stocks that matter most to you, with all your key data points in one place.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4">Our Commitment to You</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We are dedicated to providing a reliable and user-friendly platform. Our data is sourced from trusted financial providers and updated regularly to ensure you have the most current information at your fingertips. Your success as an investor is our top priority.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}