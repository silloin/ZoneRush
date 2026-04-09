import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-gray-400 mt-2">Last updated: April 5, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you and ZoneRush 
              ("we," "our," or "us") governing your access to and use of our mobile application, website, and 
              related services (collectively, the "Service").
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              By accessing or using ZoneRush, you agree to be bound by these Terms. If you do not agree to all 
              the terms and conditions, you must not access or use the Service.
            </p>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. Your continued use of the Service after 
              any changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <p className="text-gray-300 leading-relaxed mb-4">To use ZoneRush, you must:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
              <li>Provide accurate and complete registration information</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              By creating an account, you represent and warrant that you meet these eligibility requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <h3 className="text-xl font-medium mb-3 text-blue-400">3.1 Account Creation</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              To access certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">3.2 Account Termination</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We reserve the right to suspend or terminate your account if:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>You violate these Terms</li>
              <li>Your account is inactive for an extended period</li>
              <li>Required by law or regulatory authorities</li>
              <li>We suspect fraudulent or illegal activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p className="text-gray-300 leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Use the Service for any illegal purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post offensive, discriminatory, or inappropriate content</li>
              <li>Impersonate others or provide false information</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to systems or data</li>
              <li>Use automated means to access the Service (bots, scrapers)</li>
              <li>Circumvent security measures or rate limits</li>
              <li>Reverse engineer or decompile the Service</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Violate intellectual property rights</li>
              <li>Cheat or manipulate running data (GPS spoofing)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Running Activities and Data</h2>
            <h3 className="text-xl font-medium mb-3 text-blue-400">5.1 Activity Tracking</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              ZoneRush tracks your running activities including location, distance, pace, and route. By using 
              the Service, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>GPS data may not be 100% accurate</li>
              <li>Running outdoors involves inherent risks</li>
              <li>You are responsible for your own safety during activities</li>
              <li>We are not liable for injuries or accidents</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">5.2 User-Generated Content</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You retain ownership of content you create (posts, photos, routes). However, you grant us a 
              non-exclusive, worldwide, royalty-free license to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Use, display, and distribute your content within the Service</li>
              <li>Modify or adapt content for technical purposes</li>
              <li>Create aggregated, anonymized insights</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You represent that you have the right to grant this license and that your content doesn't 
              infringe third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              ZoneRush and its original content, features, and functionality are owned by us and protected by 
              international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-300 leading-relaxed mb-4">
              You may not:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Copy, modify, or create derivative works</li>
              <li>Use our trademarks without permission</li>
              <li>Remove proprietary notices</li>
              <li>Use our branding in a way that suggests endorsement</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Payments and Subscriptions</h2>
            <h3 className="text-xl font-medium mb-3 text-blue-400">7.1 Pricing</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Some features require a paid subscription. Prices are displayed in your local currency and may 
              vary by region. We reserve the right to change prices with notice.
            </p>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">7.2 Billing</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Subscriptions automatically renew unless cancelled</li>
              <li>You will be charged at the start of each billing cycle</li>
              <li>Refunds are provided only as required by law</li>
              <li>Failed payments may result in service suspension</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">7.3 Cancellation</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You can cancel your subscription at any time through your account settings. Cancellation takes 
              effect at the end of the current billing period. No partial refunds for unused time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimers</h2>
            <h3 className="text-xl font-medium mb-3 text-blue-400">8.1 No Warranty</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Merchantability or fitness for a particular purpose</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Accuracy or completeness of information</li>
              <li>Security or privacy of data transmission</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">8.2 Health Disclaimer</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              ZoneRush is NOT a medical device or health monitoring tool. Consult a healthcare professional 
              before starting any exercise program. We are not responsible for health-related decisions based 
              on Service data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, ZONERUSH AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND 
              AGENTS SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, use, goodwill, or intangible losses</li>
              <li>Injuries or accidents during physical activities</li>
              <li>Unauthorized access to or alteration of your data</li>
              <li>Third-party conduct or content</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify, defend, and hold harmless ZoneRush and its affiliates from any claims, 
              damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising 
              from:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of third-party rights</li>
              <li>Your user-generated content</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Dispute Resolution</h2>
            <h3 className="text-xl font-medium mb-3 text-blue-400">11.1 Informal Resolution</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Before pursuing legal action, parties agree to attempt informal resolution through good-faith 
              negotiations for at least 30 days.
            </p>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">11.2 Arbitration</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Any disputes not resolved informally shall be settled by binding arbitration in accordance with 
              applicable arbitration rules. YOU WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN CLASS 
              ACTION LAWSUITS.
            </p>

            <h3 className="text-xl font-medium mb-3 text-blue-400 mt-6">11.3 Governing Law</h3>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by the laws of [Your Jurisdiction], without regard to conflict of 
              law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Either party may terminate this agreement:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>You: By deleting your account</li>
              <li>We: For violations of these Terms or any reason with notice</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Upon termination, your right to use the Service ceases immediately. Provisions that should 
              survive termination (intellectual property, disclaimers, limitation of liability) remain in effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Miscellaneous</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and ZoneRush</li>
              <li><strong>Severability:</strong> If any provision is invalid, the remainder remains enforceable</li>
              <li><strong>Waiver:</strong> Failure to enforce a right doesn't waive it</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
              <li><strong>Force Majeure:</strong> We're not liable for delays due to circumstances beyond our control</li>
              <li><strong>Contact:</strong> Questions about these Terms? Contact legal@zonerush.com</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Acceptance</h2>
            <p className="text-gray-300 leading-relaxed">
              By using ZoneRush, you acknowledge that you have read, understood, and agree to be bound by 
              these Terms of Service. If you do not agree, please discontinue use of the Service immediately.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
