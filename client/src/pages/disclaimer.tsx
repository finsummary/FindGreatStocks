import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function Disclaimer() {
  const [, setLocation] = useLocation();

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
          <div className="flex items-center space-x-3 mb-6">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h1 className="text-4xl font-bold">Investment Disclaimer</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none dark:prose-invert space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-amber-800 dark:text-amber-200 mb-3">Important Notice</h2>
              <p className="text-amber-700 dark:text-amber-300">
                The information provided on FindGreatStocks.com is for informational and educational purposes only. 
                It is not intended as financial advice and should not be construed as a recommendation to buy, sell, or hold any securities.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-bold mb-4">1. Not Financial Advice</h2>
              <p className="text-muted-foreground">
                FindGreatStocks.com provides financial data, analysis, and educational content, but this should not be considered personalized financial advice. 
                We are not licensed financial advisors, and the information presented should not replace consultation with qualified financial professionals 
                who can assess your individual circumstances and goals.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Investment Risks</h2>
              <p className="text-muted-foreground mb-4">All investments carry inherent risks, including but not limited to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Loss of principal investment</li>
                <li>Market volatility and fluctuations</li>
                <li>Economic, political, and regulatory changes</li>
                <li>Company-specific risks and business failures</li>
                <li>Currency and inflation risks</li>
                <li>Liquidity risks</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Past performance is not indicative of future results. You should carefully consider your risk tolerance and investment objectives before making any investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Data Accuracy and Timeliness</h2>
              <p className="text-muted-foreground">
                While we strive to provide accurate and up-to-date information sourced from reliable providers like Financial Modeling Prep, 
                we cannot guarantee the accuracy, completeness, or timeliness of all data. Financial markets move rapidly, and information may become outdated quickly. 
                Always verify information from multiple sources before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. No Guarantees</h2>
              <p className="text-muted-foreground">
                FindGreatStocks.com makes no warranties or guarantees about the performance of any securities, investment strategies, or market predictions. 
                All financial metrics, ratios, and analyses are based on historical data and mathematical calculations, which may not accurately predict future performance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Third-Party Data</h2>
              <p className="text-muted-foreground">
                Our platform relies on data from third-party providers. While we use reputable sources, we are not responsible for errors, omissions, 
                or delays in third-party data. Users should independently verify all information before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Personal Responsibility</h2>
              <p className="text-muted-foreground">
                You are solely responsible for your investment decisions and their consequences. Before investing, you should:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                <li>Conduct your own research and due diligence</li>
                <li>Consult with qualified financial advisors</li>
                <li>Consider your financial situation, goals, and risk tolerance</li>
                <li>Understand the risks associated with any investment</li>
                <li>Only invest money you can afford to lose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                FindGreatStocks.com, its owners, employees, and affiliates shall not be liable for any direct, indirect, incidental, special, 
                or consequential damages arising from the use of this website or reliance on the information provided. This includes, but is not limited to, 
                financial losses from investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Regulatory Compliance</h2>
              <p className="text-muted-foreground">
                Users are responsible for ensuring their investment activities comply with applicable laws and regulations in their jurisdiction. 
                Securities laws vary by country and region, and what may be permissible in one jurisdiction may be restricted in another.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Professional Advice Recommendation</h2>
              <p className="text-muted-foreground">
                We strongly recommend consulting with licensed financial advisors, tax professionals, and legal counsel before making significant investment decisions. 
                Professional advisors can provide personalized guidance based on your specific financial situation and goals.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Questions and Contact</h2>
              <p className="text-muted-foreground">
                If you have any questions about this disclaimer or need clarification on any information provided on our website, 
                please contact us at hello@FindGreatStocks.com
              </p>
            </section>

            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mt-8">
              <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-3">Final Reminder</h2>
              <p className="text-red-700 dark:text-red-300">
                Investing in stocks and other securities involves substantial risk of loss. Never invest money you cannot afford to lose, 
                and always seek professional financial advice before making investment decisions.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}