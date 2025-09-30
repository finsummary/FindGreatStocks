import React from 'react';
import SEOHead from '../components/SEOHead';

const PrivacyPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Privacy Policy - FindGreatStocks"
        description="Privacy policy for FindGreatStocks investment analysis platform. Learn how we collect, use, and protect your personal information and data."
        keywords="privacy policy, data protection, personal information, GDPR, user privacy, FindGreatStocks privacy"
        canonicalUrl="/privacy"
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
                <p className="text-gray-700 mb-4">We collect information you provide directly to us, such as when you:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Create an account</li>
                  <li>Subscribe to our premium services</li>
                  <li>Contact us for support</li>
                  <li>Use our investment analysis tools</li>
                </ul>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Email address</li>
                  <li>Name (if provided)</li>
                  <li>Payment information (processed securely through Stripe)</li>
                  <li>Account preferences and settings</li>
                </ul>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">Usage Information</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Pages visited and features used</li>
                  <li>Time spent on the platform</li>
                  <li>Investment watchlists and portfolio data</li>
                  <li>Device and browser information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-700 mb-4">We use the information we collect to:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Provide and improve our services</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send you important updates about our platform</li>
                  <li>Respond to your inquiries and provide customer support</li>
                  <li>Analyze usage patterns to enhance user experience</li>
                  <li>Ensure platform security and prevent fraud</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
                <p className="text-gray-700 mb-4">
                  We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform (e.g., Stripe for payments, Supabase for data storage)</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, user information may be transferred as part of the business assets</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
                <p className="text-gray-700 mb-4">
                  We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure authentication and authorization systems</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and monitoring</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Cookies and Tracking</h2>
                <p className="text-gray-700 mb-4">
                  We use cookies and similar technologies to enhance your experience on our platform. These technologies help us:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li>Remember your preferences and settings</li>
                  <li>Analyze how you use our platform</li>
                  <li>Provide personalized content and features</li>
                  <li>Improve platform performance</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  You can control cookie settings through your browser preferences, though this may affect some platform functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
                <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights regarding your personal information:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Objection:</strong> Object to certain processing of your information</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  To exercise these rights, please contact us at <a href="mailto:hello@FindGreatStocks.com" className="text-blue-600 hover:text-blue-800">hello@FindGreatStocks.com</a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
                <p className="text-gray-700 mb-4">
                  We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal or regulatory purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
                <p className="text-gray-700 mb-4">
                  Our platform is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-700 mb-4">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date. We encourage you to review this privacy policy periodically.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
                <p className="text-gray-700 mb-4">
                  If you have any questions about this privacy policy or our data practices, please contact us at:
                </p>
                <p className="text-gray-700">
                  Email: <a href="mailto:hello@FindGreatStocks.com" className="text-blue-600 hover:text-blue-800">hello@FindGreatStocks.com</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPage;