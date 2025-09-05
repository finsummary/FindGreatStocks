import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Disclaimer() {
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
            <h1>Disclaimer</h1>
            <p>Last updated: August 19, 2024</p>
            <p>The information provided by FindGreatStocks ("we," "us," or "our") on [Your Website URL] (the "Site") is for general informational purposes only. All information on the Site is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site.</p>
            <p>Under no circumstance shall we have any liability to you for any loss or damage of any kind incurred as a result of the use of the site or reliance on any information provided on the site. Your use of the site and your reliance on any information on the site is solely at your own risk.</p>
            
            <h2>EXTERNAL LINKS DISCLAIMER</h2>
            <p>The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties or links to websites and features in banners or other advertising. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.</p>
            
            <h2>PROFESSIONAL DISCLAIMER</h2>
            <p>The Site cannot and does not contain financial advice. The financial information is provided for general informational and educational purposes only and is not a substitute for professional advice. Accordingly, before taking any actions based upon such information, we encourage you to consult with the appropriate professionals. We do not provide any kind of financial advice. The use or reliance of any information contained on this site is solely at your own risk.</p>
        </article>
      </main>
    </div>
  );
}