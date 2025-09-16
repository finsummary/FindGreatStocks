import React from 'react';
import SEOHead from '../components/SEOHead';

const AboutPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="About Us - FindGreatStocks"
        description="Learn about FindGreatStocks mission to democratize investment analysis. Discover our story, values, and commitment to providing professional-grade financial tools."
        keywords="about FindGreatStocks, investment analysis platform, financial tools, company mission, team"
        canonicalUrl="/about"
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">About FindGreatStocks</h1>
            
            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-700 mb-4">
                  At FindGreatStocks, we believe that sophisticated investment analysis should be accessible to everyone, not just Wall Street professionals. Our mission is to democratize financial analysis by providing individual investors with the same powerful tools and insights that institutional investors use.
                </p>
                <p className="text-gray-700 mb-4">
                  We're committed to empowering investors with data-driven insights, comprehensive analysis tools, and educational resources that help them make more informed investment decisions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Do</h2>
                <p className="text-gray-700 mb-4">
                  FindGreatStocks is a comprehensive investment analysis platform that provides:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Advanced Financial Metrics:</strong> DCF analysis, DuPont analysis, AR/MDD ratios, and other professional-grade metrics</li>
                  <li><strong>Comprehensive Stock Screening:</strong> Analyze thousands of stocks across major indices (Dow Jones, S&P 500, Nasdaq 100)</li>
                  <li><strong>Educational Content:</strong> In-depth guides and blog posts explaining complex financial concepts</li>
                  <li><strong>Portfolio Management:</strong> Watchlist functionality and portfolio tracking tools</li>
                  <li><strong>Real-time Data:</strong> Up-to-date market data and financial information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Values</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Transparency</h3>
                    <p className="text-blue-800">
                      We believe in open, honest communication about our methods, data sources, and limitations. No black boxes or hidden algorithms.
                    </p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">Education</h3>
                    <p className="text-green-800">
                      We're committed to helping users understand not just what the numbers mean, but why they matter for investment decisions.
                    </p>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">Accessibility</h3>
                    <p className="text-purple-800">
                      Professional-grade analysis tools should be available to all investors, regardless of their background or experience level.
                    </p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">Innovation</h3>
                    <p className="text-orange-800">
                      We continuously improve our platform with new features, better data, and more sophisticated analysis methods.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Technology</h2>
                <p className="text-gray-700 mb-4">
                  FindGreatStocks is built on modern, robust technology that ensures reliability, security, and performance:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Real-time Data Integration:</strong> We source data from reputable financial data providers</li>
                  <li><strong>Advanced Analytics:</strong> Sophisticated algorithms for financial analysis and risk assessment</li>
                  <li><strong>Secure Infrastructure:</strong> Enterprise-grade security to protect your data and privacy</li>
                  <li><strong>Scalable Architecture:</strong> Built to handle growing user base and increasing data volumes</li>
                  <li><strong>User-friendly Interface:</strong> Intuitive design that makes complex analysis accessible</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment to You</h2>
                <p className="text-gray-700 mb-4">
                  We're committed to providing you with:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Accurate Data:</strong> We work with trusted data providers and implement quality controls</li>
                  <li><strong>Regular Updates:</strong> Our platform is continuously updated with new features and improvements</li>
                  <li><strong>Educational Resources:</strong> Comprehensive guides and tutorials to help you make better decisions</li>
                  <li><strong>Customer Support:</strong> Responsive support team to help you get the most out of our platform</li>
                  <li><strong>Privacy Protection:</strong> Your data is secure and never shared without your consent</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disclaimer</h2>
                <p className="text-gray-700 mb-4">
                  While we provide powerful analysis tools and educational content, it's important to remember that:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Our platform is for educational and informational purposes only</li>
                  <li>We do not provide investment advice or recommendations</li>
                  <li>All investment decisions carry risk and should be made carefully</li>
                  <li>Past performance does not guarantee future results</li>
                  <li>You should always conduct your own research and consider consulting with financial advisors</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
                <p className="text-gray-700 mb-4">
                  We'd love to hear from you! Whether you have questions, suggestions, or just want to share your success stories, we're here to help.
                </p>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <p className="text-gray-700 mb-2">
                    <strong>Email:</strong> <a href="mailto:hello@FindGreatStocks.com" className="text-blue-600 hover:text-blue-800">hello@FindGreatStocks.com</a>
                  </p>
                  <p className="text-gray-700">
                    We typically respond to all inquiries within 24 hours during business days.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Join Our Community</h2>
                <p className="text-gray-700 mb-4">
                  Become part of a growing community of informed investors who are using data-driven analysis to make better investment decisions. Start your journey with FindGreatStocks today.
                </p>
                <div className="text-center">
                  <a
                    href="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Analyzing Stocks
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;