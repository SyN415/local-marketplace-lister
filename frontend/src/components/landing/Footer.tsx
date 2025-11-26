/**
 * Footer Component
 *
 * Design System implementation
 * Features:
 * - Patterned background from logo colors
 * - Sleepy mascot variation
 * - Links with hover underlines
 * - Newsletter signup
 * - Social links
 * - Responsive layout
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Mail,
  ArrowRight,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Mascot } from '../ui/Mascot';
import { cn } from '../../lib/utils';
import { useDefaultPalette } from '../../hooks/useLogoColors';
import logo from '../../assets/jp1.jpg';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Chrome Extension', href: '#', external: true },
      { label: 'Changelog', href: '#' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '#' },
      { label: 'Documentation', href: '#' },
      { label: 'Seller Tips', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'API', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Partners', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'GDPR', href: '#' },
    ],
  },
];

const socialLinks = [
  { icon: <Twitter className="w-5 h-5" />, href: '#', label: 'Twitter' },
  { icon: <Instagram className="w-5 h-5" />, href: '#', label: 'Instagram' },
  { icon: <Linkedin className="w-5 h-5" />, href: '#', label: 'LinkedIn' },
  { icon: <Github className="w-5 h-5" />, href: '#', label: 'GitHub' },
];

const Footer: React.FC = () => {
  const palette = useDefaultPalette();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // TODO: Implement newsletter subscription
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  return (
    <footer 
      className="relative overflow-hidden"
      style={{
        background: `
          linear-gradient(
            180deg,
            transparent 0%,
            ${palette.muted.rgba(0.05)} 20%,
            ${palette.vibrant.rgba(0.08)} 100%
          )
        `,
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0L80 40L40 80L0 40z' fill='none' stroke='%239F88C8' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Newsletter Section */}
      <div className="border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4 text-center md:text-left">
              <Mascot variation="sleepy" size="md" animated animation="float" />
              <div>
                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-1">
                  Stay in the Loop
                </h3>
                <p className="text-foreground-muted">
                  Get tips, updates, and marketplace insights delivered weekly.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1 md:w-72">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={cn(
                    'w-full pl-12 pr-4 py-3 rounded-xl',
                    'bg-background border border-border',
                    'text-foreground placeholder:text-foreground-muted',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                    'transition-all duration-200',
                  )}
                  aria-label="Email address"
                />
              </div>
              <Button
                type="submit"
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-display font-semibold px-6 rounded-xl"
              >
                {isSubscribed ? (
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Subscribed!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Subscribe
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <img
                src={logo}
                alt="Jiggly"
                className="h-12 w-12 rounded-xl object-cover border-2 border-primary/20"
              />
              <span className="font-display text-xl font-bold text-foreground">Jiggly</span>
            </Link>
            
            <p className="font-body text-foreground-muted mb-6 max-w-xs leading-relaxed">
              The ultimate cross-posting tool for local marketplace sellers.
              Sell smarter, reach further.
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    'bg-muted/50 text-foreground-muted',
                    'hover:bg-primary/10 hover:text-primary',
                    'transition-colors duration-200',
                  )}
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-bold text-foreground mb-4 text-sm uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'group inline-flex items-center gap-1 text-sm text-foreground-muted',
                          'hover:text-primary transition-colors duration-200',
                        )}
                      >
                        <span className="relative">
                          {link.label}
                          <span className="absolute left-0 -bottom-0.5 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-200" />
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className={cn(
                          'group inline-flex items-center text-sm text-foreground-muted',
                          'hover:text-primary transition-colors duration-200',
                        )}
                      >
                        <span className="relative">
                          {link.label}
                          <span className="absolute left-0 -bottom-0.5 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-200" />
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foreground-muted">
            <div className="flex items-center gap-1">
              <span>© {new Date().getFullYear()} Jiggly. Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span>for sellers</span>
            </div>

            <div className="flex items-center gap-6">
              <Link to="#" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="#" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="#" className="hover:text-primary transition-colors">Cookies</Link>
            </div>

            <div className="flex items-center gap-2">
              <span>Status:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-600 dark:text-green-400">All systems operational</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;