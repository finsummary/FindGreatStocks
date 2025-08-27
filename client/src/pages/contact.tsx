import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, MessageCircle, Clock, Globe } from "lucide-react";

export default function Contact() {
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
          <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
          <p className="text-xl text-muted-foreground mb-8">
            We'd love to hear from you. Get in touch with our team for any questions, feedback, or support.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border">
                <Mail className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Email Support</h3>
                <p className="text-muted-foreground mb-4">
                  For general inquiries, technical support, or feedback, please email us at:
                </p>
                <a 
                  href="mailto:hello@FindGreatStocks.com" 
                  className="text-primary hover:underline font-semibold text-lg"
                >
                  hello@FindGreatStocks.com
                </a>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <Clock className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Response Time</h3>
                <p className="text-muted-foreground">
                  We typically respond to all inquiries within 24-48 hours during business days. 
                  For urgent technical issues, please include "URGENT" in your subject line.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <Globe className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">Global Service</h3>
                <p className="text-muted-foreground">
                  FindGreatStocks.com serves users worldwide with financial data from major global indices. 
                  Our support team is available to assist users from all time zones.
                </p>
              </div>
            </div>

            {/* Contact Form Placeholder */}
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border">
                <MessageCircle className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">What can we help you with?</h3>
                <div className="space-y-4 text-muted-foreground">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">Technical Support</h4>
                    <p className="text-sm">Issues with website functionality, data loading, or account access</p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">Data Questions</h4>
                    <p className="text-sm">Questions about financial data accuracy, sources, or methodology</p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">Feature Requests</h4>
                    <p className="text-sm">Suggestions for new features or improvements to existing functionality</p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">Business Inquiries</h4>
                    <p className="text-sm">Partnership opportunities, API access, or enterprise solutions</p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">General Feedback</h4>
                    <p className="text-sm">Your thoughts on our platform and suggestions for improvement</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Before You Contact Us</h3>
                <p className="text-muted-foreground text-sm mb-3">
                  To help us assist you better, please include the following information in your email:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Your account email (if applicable)</li>
                  <li>Browser and device information</li>
                  <li>Detailed description of the issue or question</li>
                  <li>Screenshots (if reporting a technical issue)</li>
                  <li>Steps to reproduce the problem</li>
                </ul>
              </div>

              <div className="text-center">
                <Button 
                  onClick={() => window.location.href = 'mailto:hello@FindGreatStocks.com'}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How often is the financial data updated?</h3>
                <p className="text-muted-foreground text-sm">
                  Stock prices and market capitalizations are updated daily after market close (4:00 PM ET) using real-time data from Financial Modeling Prep API.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Is my watchlist data saved permanently?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, when you create an account and sign in, your watchlist is saved permanently to our secure database and will persist across sessions.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Do you provide investment advice?</h3>
                <p className="text-muted-foreground text-sm">
                  No, FindGreatStocks.com provides financial data and analysis tools for informational purposes only. We do not provide personalized investment advice.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Can I access the data via API?</h3>
                <p className="text-muted-foreground text-sm">
                  Currently, we don't offer public API access. For enterprise or bulk data needs, please contact us at hello@FindGreatStocks.com to discuss custom solutions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}