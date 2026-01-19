'use client';

import Link from 'next/link';
import { FileText, ArrowRight, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui';

const LAST_UPDATED = 'January 15, 2026';

export default function TermsPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <FileText className="w-4 h-4" />
            <span>Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Terms of Service
          </h1>
          <div className="flex items-center justify-center gap-2 text-text-secondary animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Calendar className="w-4 h-4" />
            <span>Last updated: {LAST_UPDATED}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="prose prose-invert max-w-none">
          <div className="p-6 rounded-xl bg-surface-elevated/50 border border-outline-light mb-8">
            <p className="text-text-secondary leading-relaxed m-0">
              <strong className="text-text-primary">Plain English Summary:</strong> We want you to use Cumulonimbus to build amazing things. 
              These terms are here to protect both you and us. We've tried to keep them fair and readable. 
              If something doesn't make sense, just ask us.
            </p>
          </div>

          <div className="space-y-8 text-text-secondary">
            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">1. Agreement to Terms</h2>
              <p className="leading-relaxed mb-4">
                By accessing or using Cumulonimbus (the "Service"), operated by Sentimento Technologies Limited 
                ("Company", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). 
                If you disagree with any part of these terms, you may not access the Service.
              </p>
              <p className="leading-relaxed">
                Our Service is available to users who are at least 13 years old. If you are under 18, you 
                represent that you have your parent or guardian's permission to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">2. Description of Service</h2>
              <p className="leading-relaxed mb-4">
                Cumulonimbus is an AI-powered platform that enables users to create software applications through 
                natural language conversations. The Service includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-assisted application generation</li>
                <li>Application hosting and deployment</li>
                <li>Database and data storage</li>
                <li>User account management</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">3. User Accounts</h2>
              <p className="leading-relaxed mb-4">
                When you create an account with us, you must provide accurate and complete information. 
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the security of your account and password</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
              <p className="leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in 
                abusive behavior.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">4. Acceptable Use</h2>
              <p className="leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create applications that are illegal, harmful, or violate any laws</li>
                <li>Distribute malware, viruses, or other harmful code</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Generate spam or engage in deceptive practices</li>
                <li>Overload or interfere with the Service's infrastructure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">5. Intellectual Property</h2>
              <h3 className="text-lg font-medium text-text-primary mb-2">Your Content</h3>
              <p className="leading-relaxed mb-4">
                You retain ownership of any content, applications, and data you create using the Service 
                ("User Content"). By using the Service, you grant us a limited license to host, store, 
                and display your User Content as necessary to provide the Service.
              </p>
              <h3 className="text-lg font-medium text-text-primary mb-2">Our Content</h3>
              <p className="leading-relaxed">
                The Service and its original content (excluding User Content), features, and functionality 
                are and will remain the exclusive property of Sentimento Technologies Limited. Our trademarks 
                and trade dress may not be used without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">6. Subscription and Payment</h2>
              <p className="leading-relaxed mb-4">
                Some features of the Service require a paid subscription. By subscribing:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You agree to pay the fees associated with your selected plan</li>
                <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
                <li>Prices may change with 30 days' notice</li>
                <li>Refunds are available within 30 days of purchase if you're not satisfied</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">7. Disclaimers</h2>
              <p className="leading-relaxed mb-4">
                The Service is provided "as is" and "as available" without warranties of any kind, either 
                express or implied. We do not warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>Results obtained from the Service will be accurate or reliable</li>
                <li>Any errors in the Service will be corrected</li>
              </ul>
              <p className="leading-relaxed mt-4">
                AI-generated content may contain errors or inaccuracies. You are responsible for reviewing 
                and testing any applications created using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">8. Limitation of Liability</h2>
              <p className="leading-relaxed">
                To the maximum extent permitted by law, Sentimento Technologies Limited shall not be liable 
                for any indirect, incidental, special, consequential, or punitive damages, or any loss of 
                profits or revenues, whether incurred directly or indirectly, or any loss of data, use, 
                goodwill, or other intangible losses resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">9. Changes to Terms</h2>
              <p className="leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of significant 
                changes by posting the new Terms on this page and updating the "Last updated" date. Your 
                continued use of the Service after changes become effective constitutes acceptance of the 
                modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">10. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the Hong Kong 
                Special Administrative Region of the People's Republic of China, without regard to its 
                conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">11. Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="p-4 rounded-lg bg-surface-elevated border border-outline-light">
                <p className="font-medium text-text-primary mb-2">Sentimento Technologies Limited</p>
                <p>Unit B, 11/F, 23 Thomson Road</p>
                <p>Wan Chai, Hong Kong SAR China</p>
                <p className="mt-2">Email: sentimento.tech@gmail.com</p>
                <p>Phone: +852 6779 0523</p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="bg-surface-layer py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Related Documents
              </h3>
              <p className="text-text-secondary">
                Make sure to also review our Privacy Policy.
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" asChild>
                <Link href="/privacy">Privacy Policy</Link>
              </Button>
              <Button asChild>
                <Link href="/contact">
                  Contact Us
                  <Mail className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
