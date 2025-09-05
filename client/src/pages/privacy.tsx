import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Privacy() {
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
          <h1>Privacy Policy</h1>
          <p>Last updated: August 19, 2024</p>

          <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
          
          <h2>Collecting and Using Your Personal Data</h2>
          <h3>Types of Data Collected</h3>
          <h4>Personal Data</h4>
          <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to, Email address.</p>
          
          <h4>Usage Data</h4>
          <p>Usage Data is collected automatically when using the Service. Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
          
          <h2>Use of Your Personal Data</h2>
          <p>The Company may use Personal Data for the following purposes:</p>
          <ul>
            <li>To provide and maintain our Service, including to monitor the usage of our Service.</li>
            <li>To manage Your Account: to manage Your registration as a user of the Service.</li>
            <li>For the performance of a contract: the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.</li>
            <li>To contact You: To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
          </ul>

          <h2>Disclosure of Your Personal Data</h2>
          <p>We may share Your personal information in the following situations: with Service Providers, for business transfers, with affiliates, with business partners, and with other users.</p>

          <h2>Security of Your Personal Data</h2>
          <p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>

          <h2>Changes to this Privacy Policy</h2>
          <p>We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>

          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, You can contact us.</p>
        </article>
      </main>
    </div>
  );
}