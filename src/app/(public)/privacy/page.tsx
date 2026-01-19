'use client';

import Link from 'next/link';
import { Shield, ArrowRight, Mail, Calendar, Lock, Eye, Database, Globe } from 'lucide-react';
import { Button } from '@/components/ui';

const LAST_UPDATED = 'January 15, 2026';

export default function PrivacyPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-sm font-medium mb-6 animate-slide-down">
            <Shield className="w-4 h-4" />
            <span>Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-text-primary mb-6 tracking-tight animate-slide-up">
            Privacy Policy
          </h1>
          <div className="flex items-center justify-center gap-2 text-text-secondary animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Calendar className="w-4 h-4" />
            <span>Last updated: {LAST_UPDATED}</span>
          </div>
        </div>
      </section>

      {/* Key Points Summary */}
      <section className="max-w-4xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-surface-elevated/50 border border-outline-light">
            <Lock className="w-6 h-6 text-accent-yellow mb-3" />
            <h3 className="font-medium text-text-primary mb-1">Your Data is Yours</h3>
            <p className="text-sm text-text-secondary">
              We never sell your personal information to third parties.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated/50 border border-outline-light">
            <Eye className="w-6 h-6 text-accent-yellow mb-3" />
            <h3 className="font-medium text-text-primary mb-1">Transparency First</h3>
            <p className="text-sm text-text-secondary">
              We&apos;re clear about what we collect and why.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-elevated/50 border border-outline-light">
            <Database className="w-6 h-6 text-accent-yellow mb-3" />
            <h3 className="font-medium text-text-primary mb-1">Minimal Collection</h3>
            <p className="text-sm text-text-secondary">
              We only collect what&apos;s necessary to provide the service.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="prose prose-invert max-w-none">
          <div className="p-6 rounded-xl bg-surface-elevated/50 border border-outline-light mb-8">
            <p className="text-text-secondary leading-relaxed m-0">
              <strong className="text-text-primary">Plain English Summary:</strong> We respect your privacy and take it seriously. 
              This policy explains what information we collect, why we collect it, and how we use it. 
              We believe you should always be in control of your data.
            </p>
          </div>

          <div className="space-y-8 text-text-secondary">
            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">1. Who We Are</h2>
              <p className="leading-relaxed">
                Cumulonimbus is operated by Sentimento Technologies Limited, a company registered in Hong Kong 
                (Company Registration: 79623564). Our registered address is Unit B, 11/F, 23 Thomson Road, 
                Wan Chai, Hong Kong SAR China.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-text-primary mb-2">Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong className="text-text-primary">Account Information:</strong> Name, email address, and password when you create an account</li>
                <li><strong className="text-text-primary">Payment Information:</strong> Billing details when you subscribe to a paid plan (processed securely by our payment providers)</li>
                <li><strong className="text-text-primary">User Content:</strong> The applications you create, prompts you submit, and data you input into the Service</li>
                <li><strong className="text-text-primary">Communications:</strong> Information you provide when you contact us for support</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2">Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-text-primary">Usage Data:</strong> How you interact with the Service, features you use, and actions you take</li>
                <li><strong className="text-text-primary">Device Information:</strong> Browser type, operating system, and device identifiers</li>
                <li><strong className="text-text-primary">Log Data:</strong> IP address, access times, and pages viewed</li>
                <li><strong className="text-text-primary">Cookies:</strong> Small data files stored on your device to improve your experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">3. How We Use Your Information</h2>
              <p className="leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
                <li>Personalize and improve your experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">4. AI and Your Data</h2>
              <p className="leading-relaxed mb-4">
                Our AI models process your prompts to generate applications. Here&apos;s what you should know:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-text-primary">No Training Without Consent:</strong> We do not use your private data to train our AI models without your explicit permission</li>
                <li><strong className="text-text-primary">Prompt Processing:</strong> Your prompts are processed to generate responses and may be temporarily stored for service improvement</li>
                <li><strong className="text-text-primary">Generated Content:</strong> Applications you create belong to you, subject to our Terms of Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">5. Information Sharing</h2>
              <p className="leading-relaxed mb-4">
                We do not sell your personal information. We may share information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-text-primary">Service Providers:</strong> With trusted third parties who assist us in operating the Service (hosting, payment processing, analytics)</li>
                <li><strong className="text-text-primary">Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong className="text-text-primary">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong className="text-text-primary">With Your Consent:</strong> When you explicitly agree to share information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">6. Data Security</h2>
              <p className="leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit (TLS) and at rest</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure data centers with physical security measures</li>
              </ul>
              <p className="leading-relaxed mt-4">
                While we strive to protect your information, no method of transmission over the Internet is 
                100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">7. Data Retention</h2>
              <p className="leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide the Service. 
                If you delete your account, we will delete or anonymize your information within 30 days, except where 
                retention is required by law or for legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">8. Your Rights</h2>
              <p className="leading-relaxed mb-4">
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-text-primary">Access:</strong> Request a copy of the information we hold about you</li>
                <li><strong className="text-text-primary">Correction:</strong> Request correction of inaccurate information</li>
                <li><strong className="text-text-primary">Deletion:</strong> Request deletion of your information</li>
                <li><strong className="text-text-primary">Portability:</strong> Request a portable copy of your data</li>
                <li><strong className="text-text-primary">Objection:</strong> Object to certain processing of your information</li>
              </ul>
              <p className="leading-relaxed mt-4">
                To exercise these rights, please contact us at sentimento.tech@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">9. International Transfers</h2>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. 
                These countries may have different data protection laws. We ensure appropriate safeguards are in place 
                to protect your information in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">10. Children&apos;s Privacy</h2>
              <p className="leading-relaxed">
                The Service is not intended for children under 13 years of age. We do not knowingly collect personal 
                information from children under 13. If we learn we have collected information from a child under 13, 
                we will delete that information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">11. Cookies</h2>
              <p className="leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keep you signed in</li>
                <li>Remember your preferences</li>
                <li>Understand how you use the Service</li>
                <li>Improve performance and security</li>
              </ul>
              <p className="leading-relaxed mt-4">
                You can control cookies through your browser settings, but disabling certain cookies may limit 
                your ability to use some features of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">12. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by 
                posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review 
                this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-text-primary mb-4">13. Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
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
                Make sure to also review our Terms of Service.
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" asChild>
                <Link href="/terms">Terms of Service</Link>
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
