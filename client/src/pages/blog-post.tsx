import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
  readTime: string;
  tags: string[];
  slug: string;
  metaDescription: string;
}

const blogPosts: { [key: string]: BlogPost } = {
  'ar-mdd-ratio-ultimate-risk-adjusted-performance-metric': {
    id: '1',
    title: 'AR/MDD Ratio: The Ultimate Risk-Adjusted Performance Metric',
    content: `
      <h1>What is the AR/MDD Ratio?</h1>
      <p>The Annual Return to Maximum Drawdown (AR/MDD) ratio is one of the most powerful metrics for evaluating investment performance. It measures how much return you get for each unit of risk taken, making it an essential tool for comparing different investments.</p>
      
      <h2>Understanding Maximum Drawdown</h2>
      <p>Maximum Drawdown (MDD) represents the largest peak-to-trough decline in an investment's value over a specific period. It's measured as a percentage and shows the worst-case scenario loss an investor would have experienced.</p>
      
      <p>For example, if a stock reaches $100, drops to $70, then recovers to $120, the maximum drawdown would be 30% (from $100 to $70).</p>
      
      <h2>Calculating AR/MDD Ratio</h2>
      <p>The formula is simple:</p>
      <div class="formula">
        <strong>AR/MDD = Annual Return ÷ Maximum Drawdown</strong>
      </div>
      
      <p>For instance, if a stock has an annual return of 15% and a maximum drawdown of 10%, the AR/MDD ratio would be 1.5.</p>
      
      <h2>Why AR/MDD Matters</h2>
      <p>Traditional metrics like total return don't account for risk. A stock might have high returns but also experience significant volatility, making it unsuitable for risk-averse investors.</p>
      
      <p>The AR/MDD ratio solves this by:</p>
      <ul>
        <li><strong>Risk Adjustment:</strong> Higher ratios indicate better risk-adjusted returns</li>
        <li><strong>Comparison Tool:</strong> Allows fair comparison between different investments</li>
        <li><strong>Portfolio Optimization:</strong> Helps identify the best risk-reward combinations</li>
      </ul>
      
      <h2>Interpreting AR/MDD Values</h2>
      <ul>
        <li><strong>Above 2.0:</strong> Excellent risk-adjusted performance</li>
        <li><strong>1.0 - 2.0:</strong> Good risk-adjusted performance</li>
        <li><strong>0.5 - 1.0:</strong> Moderate risk-adjusted performance</li>
        <li><strong>Below 0.5:</strong> Poor risk-adjusted performance</li>
      </ul>
      
      <h3>Real-World Application</h3>
      <p>When analyzing stocks on our platform, we calculate AR/MDD ratios for 3-year, 5-year, and 10-year periods. This gives you a comprehensive view of how a company has performed across different market cycles.</p>
      
      <p>Look for companies with consistently high AR/MDD ratios across multiple timeframes - these are typically the most reliable long-term investments.</p>
    `,
    date: '2025-01-15',
    readTime: '8 min read',
    tags: ['Risk Management', 'Performance Analysis', 'Portfolio Optimization'],
    slug: 'ar-mdd-ratio-ultimate-risk-adjusted-performance-metric',
    metaDescription: 'Learn how the AR/MDD ratio helps identify the best performing stocks with the lowest risk. Master this essential risk-adjusted performance metric for better investment decisions.'
  },
  'dupont-analysis-decomposing-return-on-equity': {
    id: '2',
    title: 'DuPont Analysis: Decomposing Return on Equity for Better Investment Decisions',
    content: `
      <h2>What is DuPont Analysis?</h2>
      <p>DuPont Analysis is a powerful framework that breaks down Return on Equity (ROE) into three key components, helping investors understand what drives a company's profitability. Originally developed by the DuPont Corporation, this analysis reveals whether a company's ROE comes from operational efficiency, asset utilization, or financial leverage.</p>
      
      <h2>The DuPont Formula</h2>
      <p>The classic DuPont formula decomposes ROE as follows:</p>
      <div class="formula">
        <strong>ROE = Net Profit Margin × Asset Turnover × Financial Leverage</strong>
      </div>
      
      <p>Where:</p>
      <ul>
        <li><strong>Net Profit Margin</strong> = Net Income ÷ Revenue</li>
        <li><strong>Asset Turnover</strong> = Revenue ÷ Total Assets</li>
        <li><strong>Financial Leverage</strong> = Total Assets ÷ Shareholders' Equity</li>
      </ul>
      
      <h2>Understanding Each Component</h2>
      
      <h2>1. Net Profit Margin</h2>
      <p>This measures how much profit a company generates from each dollar of revenue. A higher margin indicates better cost control and pricing power.</p>
      <ul>
        <li><strong>High Margin:</strong> Premium products, strong brand, efficient operations</li>
        <li><strong>Low Margin:</strong> Commoditized products, price competition, high costs</li>
      </ul>
      
      <h2>2. Asset Turnover</h2>
      <p>This shows how efficiently a company uses its assets to generate revenue. Higher turnover means better asset utilization.</p>
      <ul>
        <li><strong>High Turnover:</strong> Efficient operations, lean asset base</li>
        <li><strong>Low Turnover:</strong> Capital-intensive business, underutilized assets</li>
      </ul>
      
      <h2>3. Financial Leverage</h2>
      <p>This indicates how much debt a company uses relative to its equity. Higher leverage amplifies both returns and risks.</p>
      <ul>
        <li><strong>High Leverage:</strong> More debt, amplified returns/risks</li>
        <li><strong>Low Leverage:</strong> Conservative financing, stable returns</li>
      </ul>
      
      <h2>Why DuPont Analysis Matters</h2>
      <p>Two companies can have the same ROE but achieve it in completely different ways:</p>
      
      <div class="example">
        <h2>Company A: High Margin, Low Turnover</h2>
        <p>ROE = 20% × 0.5 × 2.0 = 20%</p>
        <p>This company has premium products but requires significant capital investment.</p>
        
        <h2>Company B: Low Margin, High Turnover</h2>
        <p>ROE = 5% × 2.0 × 2.0 = 20%</p>
        <p>This company operates on thin margins but generates high sales volume.</p>
      </div>
      
      <h2>Using DuPont Analysis for Investment Decisions</h2>
      <p>When analyzing stocks on our platform, we calculate all three DuPont components to help you understand:</p>
      
      <ul>
        <li><strong>Sustainability:</strong> Is the ROE driven by sustainable operational improvements?</li>
        <li><strong>Risk Profile:</strong> How much leverage is the company using?</li>
        <li><strong>Competitive Position:</strong> Does the company have pricing power or operational efficiency?</li>
        <li><strong>Growth Potential:</strong> Can the company improve any of the three components?</li>
      </ul>
      
      <h2>Red Flags to Watch For</h2>
      <ul>
        <li><strong>Excessive Leverage:</strong> ROE driven primarily by debt</li>
        <li><strong>Declining Margins:</strong> Losing competitive advantage</li>
        <li><strong>Asset Inefficiency:</strong> Poor capital allocation</li>
      </ul>
      
      <h2>Best Practices</h2>
      <p>Look for companies with:</p>
      <ul>
        <li>Consistently high or improving profit margins</li>
        <li>Efficient asset utilization</li>
        <li>Reasonable leverage levels</li>
        <li>All three components working together sustainably</li>
      </ul>
    `,
    date: '2025-01-12',
    readTime: '10 min read',
    tags: ['Financial Analysis', 'ROE Decomposition', 'Profitability'],
    slug: 'dupont-analysis-decomposing-return-on-equity',
    metaDescription: 'Master the DuPont formula to understand what drives a company\'s profitability. Learn how to analyze Net Profit Margin, Asset Turnover, and Financial Leverage for smarter investment decisions.'
  },
  'discounted-cash-flow-dcf-valuing-stocks-like-pro': {
    id: '3',
    title: 'Discounted Cash Flow (DCF): Valuing Stocks Like a Pro',
    content: `
      <h1>What is Discounted Cash Flow (DCF) Analysis?</h1>
      <p>Discounted Cash Flow (DCF) analysis is the gold standard for valuing stocks. It estimates the intrinsic value of a company by projecting its future cash flows and discounting them back to present value. This method helps determine whether a stock is undervalued or overvalued based on its fundamental earning potential.</p>
      
      <h2>The Core Concept</h2>
      <p>The fundamental principle behind DCF is that money today is worth more than money in the future due to:</p>
      <ul>
        <li><strong>Time Value of Money:</strong> You can invest today's money and earn returns</li>
        <li><strong>Inflation:</strong> Purchasing power decreases over time</li>
        <li><strong>Risk:</strong> Future cash flows are uncertain</li>
      </ul>
      
      <h2>The DCF Formula</h2>
      <p>The basic DCF formula is:</p>
      <div class="formula">
        <strong>DCF Value = Σ [CFt / (1 + r)^t] + [TV / (1 + r)^n]</strong>
      </div>
      
      <p>Where:</p>
      <ul>
        <li><strong>CFt</strong> = Cash flow in year t</li>
        <li><strong>r</strong> = Discount rate (required rate of return)</li>
        <li><strong>TV</strong> = Terminal value</li>
        <li><strong>n</strong> = Number of years in projection period</li>
      </ul>
      
      <h2>Step-by-Step DCF Process</h2>
      
      <h2>1. Project Future Cash Flows</h2>
      <p>Start with the company's most recent free cash flow and project it forward based on:</p>
      <ul>
        <li>Historical growth rates</li>
        <li>Industry trends</li>
        <li>Company-specific factors</li>
        <li>Management guidance</li>
      </ul>
      
      <h2>2. Determine the Discount Rate</h2>
      <p>The discount rate reflects the required return for the investment. Common approaches include:</p>
      <ul>
        <li><strong>WACC (Weighted Average Cost of Capital):</strong> Company's cost of capital</li>
        <li><strong>Required Return:</strong> Your personal required rate of return</li>
        <li><strong>Risk-Free Rate + Risk Premium:</strong> Government bond yield + equity risk premium</li>
      </ul>
      
      <h2>3. Calculate Terminal Value</h2>
      <p>Since we can't project cash flows forever, we estimate a terminal value using:</p>
      <ul>
        <li><strong>Perpetuity Growth Method:</strong> TV = CFn+1 / (r - g)</li>
        <li><strong>Exit Multiple Method:</strong> TV = CFn × Exit Multiple</li>
      </ul>
      
      <h2>4. Discount to Present Value</h2>
      <p>Apply the discount rate to each projected cash flow and the terminal value.</p>
      
      <h2>Key Assumptions in DCF</h2>
      
      <h2>Growth Rate</h2>
      <p>The growth rate is perhaps the most critical assumption. Consider:</p>
      <ul>
        <li>Historical growth patterns</li>
        <li>Industry growth rates</li>
        <li>Economic cycles</li>
        <li>Company life cycle stage</li>
      </ul>
      
      <h2>Discount Rate</h2>
      <p>The discount rate should reflect:</p>
      <ul>
        <li>Risk-free rate (government bonds)</li>
        <li>Equity risk premium</li>
        <li>Company-specific risk factors</li>
        <li>Market conditions</li>
      </ul>
      
      <h2>Terminal Value</h2>
      <p>Terminal value assumptions include:</p>
      <ul>
        <li>Long-term growth rate (typically 2-3%)</li>
        <li>Exit multiple (based on comparable companies)</li>
        <li>Economic assumptions</li>
      </ul>
      
      <h2>Using DCF on Our Platform</h2>
      <p>Our platform automatically calculates DCF values for all stocks using:</p>
      <ul>
        <li><strong>Latest Free Cash Flow:</strong> Most recent 12-month FCF</li>
        <li><strong>10% Discount Rate:</strong> Standard industry assumption</li>
        <li><strong>2.5% Terminal Growth:</strong> Long-term economic growth rate</li>
        <li><strong>10-Year Projection:</strong> Detailed cash flow modeling</li>
      </ul>
      
      <h2>Interpreting DCF Results</h2>
      
      <h2>Margin of Safety</h2>
      <p>Margin of Safety = (DCF Value - Current Price) / DCF Value</p>
      <ul>
        <li><strong>Positive:</strong> Stock may be undervalued</li>
        <li><strong>Negative:</strong> Stock may be overvalued</li>
        <li><strong>20%+ Safety:</strong> Attractive investment opportunity</li>
      </ul>
      
      <h2>Implied Growth Rate</h2>
      <p>Our platform also calculates the growth rate the current price implies, helping you assess if market expectations are realistic.</p>
      
      <h2>Limitations of DCF</h2>
      <ul>
        <li><strong>Assumption Sensitivity:</strong> Small changes in inputs create large valuation differences</li>
        <li><strong>Projection Accuracy:</strong> Future cash flows are inherently uncertain</li>
        <li><strong>Market Dynamics:</strong> Ignores market sentiment and short-term factors</li>
        <li><strong>Industry Specifics:</strong> Some industries are harder to model than others</li>
      </ul>
      
      <h2>Best Practices</h2>
      <ul>
        <li>Use conservative assumptions</li>
        <li>Perform sensitivity analysis</li>
        <li>Compare with other valuation methods</li>
        <li>Regularly update assumptions</li>
        <li>Consider multiple scenarios</li>
      </ul>
    `,
    date: '2025-01-10',
    readTime: '12 min read',
    tags: ['Valuation', 'DCF Analysis', 'Intrinsic Value'],
    slug: 'discounted-cash-flow-dcf-valuing-stocks-like-pro',
    metaDescription: 'Discover how to calculate intrinsic value using DCF analysis. Learn the step-by-step process of projecting future cash flows and determining if a stock is undervalued or overvalued.'
  },
  'reverse-dcf-what-growth-rate-market-expects': {
    id: '4',
    title: 'Reverse DCF: What Growth Rate Does the Market Expect?',
    content: `
      <h1>What is Reverse DCF Analysis?</h1>
      <p>While traditional DCF analysis calculates intrinsic value based on projected cash flows, reverse DCF works backwards from the current stock price to determine what growth rate the market is expecting. This powerful technique helps you understand market sentiment and identify potential mispricings.</p>
      
      <h2>The Reverse DCF Process</h2>
      <p>Instead of asking "What is this stock worth?", reverse DCF asks "What growth rate justifies the current price?"</p>
      
      <p>The process involves:</p>
      <ol>
        <li>Starting with the current stock price</li>
        <li>Using a fixed discount rate and terminal growth rate</li>
        <li>Solving for the growth rate that makes the DCF value equal to the current price</li>
      </ol>
      
      <h2>Why Reverse DCF Matters</h2>
      <p>Understanding market expectations is crucial because:</p>
      <ul>
        <li><strong>Reality Check:</strong> Is the expected growth rate realistic?</li>
        <li><strong>Investment Decision:</strong> Can the company meet these expectations?</li>
        <li><strong>Risk Assessment:</strong> What happens if growth falls short?</li>
        <li><strong>Opportunity Identification:</strong> Find stocks with low implied growth rates</li>
      </ul>
      
      <h2>Interpreting Implied Growth Rates</h2>
      
      <h2>High Implied Growth (>15%)</h2>
      <p>When the market expects high growth, consider:</p>
      <ul>
        <li><strong>Is it achievable?</strong> Compare to historical growth and industry averages</li>
        <li><strong>What drives it?</strong> New products, market expansion, acquisitions?</li>
        <li><strong>What's the downside?</strong> How much would the stock fall if growth disappoints?</li>
      </ul>
      
      <h2>Low Implied Growth (<5%)</h2>
      <p>When the market expects low growth, look for:</p>
      <ul>
        <li><strong>Undervaluation:</strong> Market may be too pessimistic</li>
        <li><strong>Turnaround potential:</strong> New management, restructuring, market recovery</li>
        <li><strong>Dividend yield:</strong> Even with low growth, high dividends can provide returns</li>
      </ul>
      
      <h2>Negative Implied Growth</h2>
      <p>This suggests the market expects declining cash flows, which could indicate:</p>
      <ul>
        <li>Industry disruption</li>
        <li>Competitive threats</li>
        <li>Management issues</li>
        <li>Economic headwinds</li>
      </ul>
      
      <h2>Using Reverse DCF on Our Platform</h2>
      <p>Our platform calculates the implied growth rate for every stock using:</p>
      <ul>
        <li><strong>Current Market Price:</strong> Latest stock price</li>
        <li><strong>Latest Free Cash Flow:</strong> Most recent 12-month FCF</li>
        <li><strong>10% Discount Rate:</strong> Standard industry assumption</li>
        <li><strong>2.5% Terminal Growth:</strong> Long-term economic growth rate</li>
        <li><strong>10-Year Projection:</strong> Detailed modeling period</li>
      </ul>
      
      <h2>Case Study: Tech vs. Value Stocks</h2>
      
      <h2>High-Growth Tech Stock</h2>
      <p>Example: A tech company trading at $100 with $5 FCF per share</p>
      <ul>
        <li>Implied growth rate: 25%</li>
        <li>Question: Can it maintain 25% growth for 10 years?</li>
        <li>Risk: High expectations = high volatility</li>
      </ul>
      
      <h2>Mature Value Stock</h2>
      <p>Example: A utility company trading at $50 with $8 FCF per share</p>
      <ul>
        <li>Implied growth rate: 2%</li>
        <li>Question: Is 2% growth too conservative?</li>
        <li>Opportunity: Market may be undervaluing growth potential</li>
      </ul>
      
      <h2>Red Flags in Reverse DCF</h2>
      
      <h2>Unrealistic Expectations</h2>
      <ul>
        <li>Implied growth > 30% for mature companies</li>
        <li>Growth expectations that exceed industry limits</li>
        <li>Ignoring cyclical or seasonal factors</li>
      </ul>
      
      <h2>Market Inefficiencies</h2>
      <ul>
        <li>Implied growth < 0% for profitable companies</li>
        <li>Extreme pessimism in cyclical downturns</li>
        <li>Overreaction to short-term news</li>
      </ul>
      
      <h2>Combining Reverse DCF with Other Metrics</h2>
      
      <h2>Compare with Historical Growth</h2>
      <p>If implied growth is much higher than historical growth, the stock may be overvalued.</p>
      
      <h2>Industry Benchmarking</h2>
      <p>Compare implied growth with industry averages and competitors.</p>
      
      <h2>Management Guidance</h2>
      <p>Check if management's growth targets align with market expectations.</p>
      
      <h2>Investment Strategies Using Reverse DCF</h2>
      
      <h2>Growth at a Reasonable Price (GARP)</h2>
      <p>Look for stocks where implied growth is reasonable relative to the company's capabilities.</p>
      
      <h2>Value Opportunities</h2>
      <p>Find stocks with low implied growth rates that you believe can grow faster.</p>
      
      <h2>Contrarian Investing</h2>
      <p>Identify situations where market expectations are too high or too low.</p>
      
      <h2>Limitations of Reverse DCF</h2>
      <ul>
        <li><strong>Assumption Dependency:</strong> Results depend on discount rate and terminal growth</li>
        <li><strong>Market Efficiency:</strong> Assumes market price reflects rational expectations</li>
        <li><strong>Single Metric:</strong> Should be combined with other analysis methods</li>
        <li><strong>Short-term Noise:</strong> Market prices can be influenced by temporary factors</li>
      </ul>
      
      <h2>Best Practices</h2>
      <ul>
        <li>Use multiple discount rates for sensitivity analysis</li>
        <li>Compare implied growth with historical performance</li>
        <li>Consider industry and economic context</li>
        <li>Regularly update assumptions</li>
        <li>Combine with fundamental analysis</li>
      </ul>
    `,
    date: '2025-01-08',
    readTime: '9 min read',
    tags: ['Market Analysis', 'Growth Expectations', 'Valuation'],
    slug: 'reverse-dcf-what-growth-rate-market-expects',
    metaDescription: 'Learn how to use reverse DCF analysis to understand market expectations. Discover what growth rate the current stock price implies and whether it\'s realistic or not.'
  }
};

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    // ensure links open in new tab
    root.querySelectorAll('a[href]').forEach(a => {
      (a as HTMLAnchorElement).target = '_blank';
      (a as HTMLAnchorElement).rel = 'noopener noreferrer';
    });
  }, [slug]);
  
  const post = slug ? blogPosts[slug] : null;
  
  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={post.title}
        description={post.metaDescription || post.title}
        keywords={(post.tags || []).join(', ')}
        canonicalUrl={`/blog/${post.slug}`}
        article={{
          publishedTime: post.date,
          author: 'FindGreatStocks Team',
          section: 'Investment Analysis',
          tags: post.tags || []
        }}
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="mb-6">
            <Link to="/blog" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Blog
            </Link>
          </nav>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">{post.date}</span>
            <span className="text-sm text-gray-500">{post.readTime}</span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-6">{post.title}</h1>
          
          <div className="flex flex-wrap gap-2">
            {(post.tags || []).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg shadow-md p-8">
          <style>{`
            .blog-article h1 { font-size: 1.875rem; line-height: 2.25rem; margin: 1.25rem 0; font-weight: 700; }
            .blog-article h2 { font-size: 1.5rem; line-height: 2rem; margin: 1rem 0; font-weight: 700; }
            .blog-article h3 { font-size: 1.25rem; line-height: 1.75rem; margin: 0.75rem 0; font-weight: 600; }
            .blog-article h4 { font-size: 1.125rem; line-height: 1.75rem; margin: 0.5rem 0; font-weight: 600; }
            .blog-article p { margin: 1rem 0; line-height: 1.8; }
            .blog-article ul, .blog-article ol { margin: 1rem 0; padding-left: 1.5rem; }
            .blog-article li { margin: 0.25rem 0; }
          `}</style>
          <div ref={contentRef} className="blog-article" dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Apply This Knowledge?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Use our advanced analysis tools to find stocks that meet your investment criteria
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Analyzing Stocks
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default BlogPostPage;
