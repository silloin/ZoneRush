import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-gray-400 mt-2">Last updated: April 5, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Welcome to ZoneRush ("we," "our," or "us"). We are committed to protecting your privacy and ensuring 
              the security of your personal information. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our mobile application and website (collectively, the "Service").
            </p>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using ZoneRush, you agree to the terms of this Privacy Policy. If you do not agree with 
              our policies and practices, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 text-blue-400">2.1 Personal Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Name and email address</li>
              <li>Profile information (username, profile picture, bio)</li>
              <li>Location data (GPS coordinates during runs)</li>
              <li>Payment information (processed securely by third-party providers)</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-blue-400">2.2 Activity Data</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
              <li>Running routes and distances</li>
              <li>Workout history and performance metrics</li>
              <li>Achievements and progress</li>
              <li>Social interactions (comments, likes, follows)</li>
              <li>Training plan completion</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-blue-400">2.3 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Device information (model, OS version)</li>
              <li>IP address and browser type</li>
              <li>Usage patterns and app interactions</li>
              <li>Crash reports and performance data</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Provide and maintain the Service</li>
              <li>Track your running activities and generate insights</li>
              <li>Personalize your experience and training plans</li>
              <li>Enable social features and community interactions</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send notifications about your activities and updates</li>
              <li>Improve our Service through analytics</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Location Data</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              ZoneRush collects precise location data to track your running routes. We use this data to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Map your running routes</li>
              <li>Calculate distance and pace</li>
              <li>Enable territory capture features</li>
              <li>Create heatmaps of popular running areas</li>
              <li>Provide personalized route recommendations</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              You can control location access through your device settings. However, disabling location services 
              will limit core functionality of the app.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-300 leading-relaxed mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Other Users:</strong> Profile information and public activities visible to the community</li>
              <li><strong>Service Providers:</strong> Third-party vendors who help operate our Service</li>
              <li><strong>Payment Processors:</strong> Secure payment handling (we don't store full card details)</li>
              <li><strong>Analytics Partners:</strong> To understand usage patterns and improve Service</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect rights and safety</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We do NOT sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Rate limiting to prevent brute force attacks</li>
              <li>Secure database storage with PostgreSQL</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              While we strive to protect your information, no method of transmission over the Internet is 100% secure. 
              We cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
            <p className="text-gray-300 leading-relaxed mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your account and data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
              <li>Restrict or object to certain processing</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@zonerush.com or use the account settings in the app.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. GDPR Compliance (EU Users)</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              For users in the European Economic Area (EEA), we comply with the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Legal Basis:</strong> We process data based on consent, contract performance, and legitimate interests</li>
              <li><strong>Data Retention:</strong> We retain data only as long as necessary</li>
              <li><strong>International Transfers:</strong> We use appropriate safeguards for cross-border transfers</li>
              <li><strong>Data Protection Officer:</strong> Contact dpo@zonerush.com for GDPR inquiries</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              ZoneRush is not intended for children under 13 years of age. We do not knowingly collect personal 
              information from children under 13. If we become aware that we have collected data from a child 
              under 13, we will take steps to delete that information immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending you an email notification for significant changes</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-800 p-6 rounded-lg">
              <p className="text-gray-300 mb-2"><strong>Email:</strong> privacy@zonerush.com</p>
              <p className="text-gray-300 mb-2"><strong>Support:</strong> support@zonerush.com</p>
              <p className="text-gray-300 mb-2"><strong>Data Protection Officer:</strong> dpo@zonerush.com</p>
              <p className="text-gray-300"><strong>Address:</strong> [Your Company Address]</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Consent</h2>
            <p className="text-gray-300 leading-relaxed">
              By using ZoneRush, you consent to our Privacy Policy and agree to its terms. If you do not agree, 
              please discontinue use of the Service and contact us to delete your account and data.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
