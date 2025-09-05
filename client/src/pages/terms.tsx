import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
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
          <h1>Terms of Service</h1>
          <p>Last updated: August 19, 2024</p>

          <p>Please read these terms and conditions carefully before using Our Service.</p>

          <h2>Interpretation and Definitions</h2>
          
          <h3>Interpretation</h3>
          <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

          <h3>Definitions</h3>
          <p>For the purposes of these Terms and Conditions:</p>
          <ul>
            <li><strong>"Company"</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to FindGreatStocks.</li>
            <li><strong>"Service"</strong> refers to the Website.</li>
            <li><strong>"Terms and Conditions"</strong> (also referred to as "Terms") mean these Terms and Conditions that form the entire agreement between You and the Company regarding the use of the Service.</li>
            <li><strong>"Website"</strong> refers to FindGreatStocks, accessible from [Your Website URL]</li>
            <li><strong>"You"</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
          </ul>

          <h2>Acknowledgment</h2>
          <p>These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.</p>
          <p>Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.</p>
          <p>By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.</p>

          <h2>Termination</h2>
          <p>We may terminate or suspend Your access immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions.</p>
          <p>Upon termination, Your right to use the Service will cease immediately.</p>

          <h2>Governing Law</h2>
          <p>The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.</p>

          <h2>Changes to These Terms and Conditions</h2>
          <p>We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material We will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at Our sole discretion.</p>
          
          <h2>Contact Us</h2>
          <p>If you have any questions about these Terms and Conditions, You can contact us:</p>
          <ul>
            <li>By visiting this page on our website: [Contact Page URL]</li>
          </ul>
        </article>
      </main>
    </div>
  );
}