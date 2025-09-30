import React from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  slug: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'AR/MDD Ratio: The Ultimate Risk-Adjusted Performance Metric',
    excerpt: 'Learn how the Annual Return to Maximum Drawdown ratio helps you identify the best performing stocks with the lowest risk. Discover why this metric is crucial for long-term investing success.',
    date: '2025-01-15',
    readTime: '8 min read',
    tags: ['Risk Management', 'Performance Analysis', 'Portfolio Optimization'],
    slug: 'ar-mdd-ratio-ultimate-risk-adjusted-performance-metric'
  },
  {
    id: '2',
    title: 'DuPont Analysis: Decomposing Return on Equity for Better Investment Decisions',
    excerpt: 'Master the DuPont formula to understand what drives a company\'s profitability. Learn how to analyze Net Profit Margin, Asset Turnover, and Financial Leverage to make smarter investment choices.',
    date: '2025-01-12',
    readTime: '10 min read',
    tags: ['Financial Analysis', 'ROE Decomposition', 'Profitability'],
    slug: 'dupont-analysis-decomposing-return-on-equity'
  },
  {
    id: '3',
    title: 'Discounted Cash Flow (DCF): Valuing Stocks Like a Pro',
    excerpt: 'Discover how to calculate intrinsic value using DCF analysis. Learn the step-by-step process of projecting future cash flows and determining if a stock is undervalued or overvalued.',
    date: '2025-01-10',
    readTime: '12 min read',
    tags: ['Valuation', 'DCF Analysis', 'Intrinsic Value'],
    slug: 'discounted-cash-flow-dcf-valuing-stocks-like-pro'
  },
  {
    id: '4',
    title: 'Reverse DCF: What Growth Rate Does the Market Expect?',
    excerpt: 'Learn how to use reverse DCF analysis to understand market expectations. Discover what growth rate the current stock price implies and whether it\'s realistic or not.',
    date: '2025-01-08',
    readTime: '9 min read',
    tags: ['Market Analysis', 'Growth Expectations', 'Valuation'],
    slug: 'reverse-dcf-what-growth-rate-market-expects'
  }
];

const BlogPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Investment Analysis Blog"
        description="Master the art of stock analysis with our comprehensive guides on financial metrics, valuation techniques, and risk management strategies used by professional investors."
        keywords="stock analysis, financial metrics, DCF analysis, DuPont analysis, AR/MDD ratio, investment education, portfolio optimization, risk management"
        canonicalUrl="/blog"
      />
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Investment Analysis Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Master the art of stock analysis with our comprehensive guides on financial metrics, 
              valuation techniques, and risk management strategies used by professional investors.
            </p>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          {blogPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-500">{post.date}</span>
                  <span className="text-sm text-gray-500">{post.readTime}</span>
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
                  <Link to={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>
                
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Read more
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Apply These Concepts?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Use our advanced stock analysis tools to find the best investment opportunities
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

export default BlogPage;
