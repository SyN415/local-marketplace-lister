import React from 'react';
import { Twitter, Instagram, Linkedin } from 'lucide-react';
import { Button } from '../ui/button';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <div className="col-span-1 md:col-span-5">
            <h5 className="text-xl font-bold mb-4 font-display">
              Local Marketplace Lister
            </h5>
            <p className="text-muted-foreground mb-6 max-w-sm">
              The ultimate tool for local sellers. Cross-post, manage inventory, and scale your business with ease.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h6 className="font-bold mb-4 font-display text-sm uppercase tracking-wider">Product</h6>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Chrome Extension</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-2">
            <h6 className="font-bold mb-4 font-display text-sm uppercase tracking-wider">Resources</h6>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-3">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-1">
              <div>
                <h6 className="font-bold mb-4 font-display text-sm uppercase tracking-wider">Company</h6>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Legal</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                </ul>
              </div>
              <div className="md:hidden">
                <h6 className="font-bold mb-4 font-display text-sm uppercase tracking-wider">Legal</h6>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Local Marketplace Lister. All rights reserved.
          </p>
          <div className="hidden md:flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;