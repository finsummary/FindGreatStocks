import React from 'react';
import SEOHead from '../components/SEOHead';

const DisclaimerPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Investment Disclaimer - FindGreatStocks"
        description="Important investment disclaimer and risk warnings for FindGreatStocks platform. Understand the risks and limitations of using our financial analysis tools."
        keywords="investment disclaimer, risk warning, financial advice disclaimer, investment risks, FindGreatStocks disclaimer"
        canonicalUrl="/disclaimer"
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Investment Disclaimer</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>IMPORTANT NOTICE:</strong> This disclaimer contains important information about the risks associated with using our platform and making investment decisions. Please read it carefully.
                    </p>
                  </div>
                </div>
              </div>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Not Financial Advice</h2>
                <p className="text-gray-700 mb-4">
                  <strong>The information provided on FindGreatStocks is for educational and informational purposes only.</strong> It is not intended as investment advice, financial advice, trading advice, or any other type of advice. You should not treat any of the platform's content as such.
                </p>
                <p className="text-gray-700 mb-4">
                  Before making any investment decisions, you should seek advice from independent financial advisors who are authorized to provide investment advice in your jurisdiction.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Investment Risks</h2>
                <p className="text-gray-700 mb-4">All investments carry risk, including the risk of losing your entire investment. Key risks include:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Market Risk:</strong> The value of investments can go down as well as up</li>
                  <li><strong>Liquidity Risk:</strong> You may not be able to sell your investments when you want to</li>
                  <li><strong>Concentration Risk:</strong> Investing in a small number of stocks increases risk</li>
                  <li><strong>Currency Risk:</strong> Foreign investments may be affected by currency fluctuations</li>
                  <li><strong>Inflation Risk:</strong> Inflation may erode the real value of your investments</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Past Performance</h2>
                <p className="text-gray-700 mb-4">
                  <strong>Past performance is not indicative of future results.</strong> Historical data, analysis, and metrics provided on our platform should not be relied upon as a guarantee of future performance. Market conditions change, and what worked in the past may not work in the future.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Accuracy and Limitations</h2>
                <p className="text-gray-700 mb-4">While we strive to provide accurate information, we cannot guarantee:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>The accuracy, completeness, or timeliness of any financial data</li>
                  <li>That our analysis methods will identify profitable investments</li>
                  <li>That our tools will work correctly in all market conditions</li>
                  <li>That third-party data sources are reliable or up-to-date</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. DCF Analysis Limitations</h2>
                <p className="text-gray-700 mb-4">
                  Our Discounted Cash Flow (DCF) analysis uses assumptions that may not reflect reality:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Future cash flows are estimates and may not materialize</li>
                  <li>Discount rates and growth assumptions are subjective</li>
                  <li>Terminal value calculations are highly sensitive to assumptions</li>
                  <li>Market conditions can change rapidly, affecting valuations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. No Guarantee of Results</h2>
                <p className="text-gray-700 mb-4">
                  We make no representations or warranties that:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Using our platform will result in profitable investments</li>
                  <li>Our analysis will identify the best investment opportunities</li>
                  <li>Following our recommendations will lead to financial success</li>
                  <li>Our tools will work correctly in all circumstances</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Responsibility</h2>
                <p className="text-gray-700 mb-4">You are solely responsible for:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>All investment decisions you make</li>
                  <li>Conducting your own research and due diligence</li>
                  <li>Understanding the risks associated with your investments</li>
                  <li>Ensuring your investments are suitable for your financial situation</li>
                  <li>Seeking professional advice when appropriate</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by law, FindGreatStocks shall not be liable for any:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Investment losses or financial damages</li>
                  <li>Loss of profits or business opportunities</li>
                  <li>Indirect, incidental, or consequential damages</li>
                  <li>Errors or omissions in our data or analysis</li>
                  <li>System failures or technical issues</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Regulatory Compliance</h2>
                <p className="text-gray-700 mb-4">
                  Our platform is not regulated by any financial services authority. We are not licensed to provide investment advice, and our services should not be considered as such.
                </p>
                <p className="text-gray-700 mb-4">
                  If you are unsure about the regulatory status of our services in your jurisdiction, please consult with a qualified professional.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
                <p className="text-gray-700 mb-4">
                  If you have any questions about this disclaimer, please contact us at:
                </p>
                <p className="text-gray-700">
                  Email: <a href="mailto:hello@FindGreatStocks.com" className="text-blue-600 hover:text-blue-800">hello@FindGreatStocks.com</a>
                </p>
              </section>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Remember:</strong> Investing involves risk, and you should never invest money you cannot afford to lose. Always do your own research and consider seeking professional financial advice.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DisclaimerPage;