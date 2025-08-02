import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-lg max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using FindGreatStocks.com, you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
              <p className="text-muted-foreground mb-4">
                Permission is granted to temporarily access the materials on FindGreatStocks.com for personal, non-commercial transitory viewing only. 
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained on the website</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Investment Disclaimer</h2>
              <p className="text-muted-foreground">
                The information provided on FindGreatStocks.com is for informational purposes only and should not be considered as financial advice. 
                All investment decisions should be made after careful consideration and preferably in consultation with a qualified financial advisor. 
                Past performance is not indicative of future results.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Accuracy</h2>
              <p className="text-muted-foreground">
                While we strive to provide accurate and up-to-date financial information, FindGreatStocks.com makes no warranties about the completeness, 
                reliability, and accuracy of this information. Any action you take upon the information on this website is strictly at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. User Accounts</h2>
              <p className="text-muted-foreground">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
                You are responsible for safeguarding the password and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Prohibited Uses</h2>
              <p className="text-muted-foreground mb-4">You may not use our service:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Limitations</h2>
              <p className="text-muted-foreground">
                In no event shall FindGreatStocks.com or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
                or due to business interruption) arising out of the use or inability to use the materials on FindGreatStocks.com, 
                even if FindGreatStocks.com or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Revisions</h2>
              <p className="text-muted-foreground">
                The materials appearing on FindGreatStocks.com could include technical, typographical, or photographic errors. 
                FindGreatStocks.com does not warrant that any of the materials on its website are accurate, complete, or current. 
                FindGreatStocks.com may make changes to the materials contained on its website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Governing Law</h2>
              <p className="text-muted-foreground">
                These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction 
                of the courts in that state or location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us at hello@FindGreatStocks.com
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}