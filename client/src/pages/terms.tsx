import React from 'react';
import SEOHead from '../components/SEOHead';

const TermsPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Terms and Conditions - FindGreatStocks"
        description="Terms and conditions for using FindGreatStocks investment analysis platform. Read our terms of service, user agreements, and platform policies."
        keywords="terms and conditions, user agreement, terms of service, investment platform terms, FindGreatStocks terms"
        canonicalUrl="/terms"
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 mb-4">
                  By accessing and using FindGreatStocks ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                <p className="text-gray-700 mb-4">
                  FindGreatStocks provides financial analysis tools, stock screening capabilities, and investment research data. Our platform includes:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Stock market data and analysis for Dow Jones, S&P 500, and Nasdaq 100 companies</li>
                  <li>Financial metrics including P/E ratios, DCF analysis, DuPont analysis, and AR/MDD ratios</li>
                  <li>Investment research tools and educational content</li>
                  <li>Portfolio tracking and watchlist functionality</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Investment Disclaimer</h2>
                <p className="text-gray-700 mb-4">
                  <strong>IMPORTANT:</strong> The information provided on this platform is for educational and informational purposes only. It is not intended as investment advice, financial advice, or a recommendation to buy, sell, or hold any securities.
                </p>
                <p className="text-gray-700 mb-4">
                  All investment decisions carry risk, and past performance does not guarantee future results. You should always conduct your own research and consult with qualified financial advisors before making investment decisions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Accuracy</h2>
                <p className="text-gray-700 mb-4">
                  While we strive to provide accurate and up-to-date information, we cannot guarantee the accuracy, completeness, or timeliness of any data provided. Financial data is sourced from third-party providers and may contain errors or delays.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Responsibilities</h2>
                <p className="text-gray-700 mb-4">As a user of our platform, you agree to:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Use the platform only for lawful purposes</li>
                  <li>Not attempt to gain unauthorized access to our systems</li>
                  <li>Not use automated tools to extract data without permission</li>
                  <li>Respect intellectual property rights</li>
                  <li>Provide accurate information when creating an account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Subscription and Payment</h2>
                <p className="text-gray-700 mb-4">
                  Our platform offers both free and premium subscription tiers. Premium features require a valid subscription and payment. All payments are processed securely through Stripe.
                </p>
                <p className="text-gray-700 mb-4">
                  Subscriptions automatically renew unless cancelled. You may cancel your subscription at any time through your account settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
                <p className="text-gray-700 mb-4">
                  Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  FindGreatStocks shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our platform, including but not limited to investment losses.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Modifications</h2>
                <p className="text-gray-700 mb-4">
                  We reserve the right to modify these terms at any time. Changes will be posted on this page with an updated revision date. Your continued use of the platform constitutes acceptance of any changes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
                <p className="text-gray-700 mb-4">
                  If you have any questions about these Terms and Conditions, please contact us at:
                </p>
                <p className="text-gray-700">
                  Email: <a href="mailto:hello@FindGreatStocks.com" className="text-blue-600 hover:text-blue-800">hello@FindGreatStocks.com</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPage;