'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Logo, Button, ThemeToggle, ParticleBackground } from '@/components/ui';
import { Twitter, Github, Linkedin } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  return (
    <div className="min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session ? (
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Link 
                href="/auth/signin" 
                className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/auth/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-20 bg-surface-layer border-t border-outline-light/20 py-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Slogan */}
          <div className="text-center mb-12">
            <p className="text-2xl md:text-3xl text-text-secondary font-medium leading-relaxed">
              Solving problems at the speed of thought.
            </p>
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/create" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Create</Link></li>
                <li><Link href="/dashboard" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Dashboard</Link></li>
                <li><Link href="/pricing" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Pricing</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/docs" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Documentation</Link></li>
                <li><Link href="/blog" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Blog</Link></li>
                <li><Link href="/changelog" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Changelog</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">About</Link></li>
                <li><Link href="/careers" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Careers</Link></li>
                <li><Link href="/contact" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/terms" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-text-tertiary hover:text-text-primary transition-colors text-sm">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-outline-light/20">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <Logo size="sm" />
              <span className="text-text-tertiary text-sm">
                © 2026 Sentimento Technologies Limited. All rights reserved.
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com/cumulonimbusapp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-surface-elevated hover:bg-surface-base flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://github.com/sentimento-tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-surface-elevated hover:bg-surface-base flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/sentimento-tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-surface-elevated hover:bg-surface-base flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
