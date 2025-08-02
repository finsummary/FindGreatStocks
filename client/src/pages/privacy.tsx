import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">We collect information you provide directly to us, such as when you:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Create an account and log in to our service</li>
                <li>Add stocks to your watchlist</li>
                <li>Contact us for support</li>
                <li>Use our website and interact with our features</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                This information may include your name, email address, profile information, and usage data related to your interactions with our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, security alerts, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
                <li>Personalize and improve your experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. 
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                <li>With your consent or at your direction</li>
                <li>For legal reasons, such as to comply with a subpoena or similar legal process</li>
                <li>To protect the rights, property, and safety of FindGreatStocks.com, our users, or others</li>
                <li>In connection with a business transaction, such as a merger or acquisition</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, 
                alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, 
                so we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Cookies and Analytics</h2>
              <p className="text-muted-foreground">
                We use cookies and similar tracking technologies to collect and track information about your use of our service and to improve our services. 
                We may also use Google Analytics to analyze website traffic and user behavior. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Third-Party Services</h2>
              <p className="text-muted-foreground">
                Our service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. 
                We encourage you to read the privacy policies of any third-party services you visit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information for as long as necessary to provide our services, comply with our legal obligations, 
                resolve disputes, and enforce our agreements. When we no longer need your personal information, we will securely delete or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Your Rights</h2>
              <p className="text-muted-foreground mb-4">Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>The right to access and receive a copy of your personal information</li>
                <li>The right to rectify or update your personal information</li>
                <li>The right to delete your personal information</li>
                <li>The right to restrict or object to our processing of your personal information</li>
                <li>The right to data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. 
                If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page 
                and updating the "Last updated" date at the top of this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at hello@FindGreatStocks.com
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}