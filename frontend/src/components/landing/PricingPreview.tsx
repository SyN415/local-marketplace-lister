import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

const PricingPreview: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 font-display tracking-tighter">
              Flexible Credit System
            </h2>
            <p className="text-xl text-muted-foreground">
              No monthly subscriptions. Pay only when you sell.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {/* Starter Pack */}
          <div className="w-full md:w-[48%] max-w-md">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="h-full"
            >
              <Card className="h-full bg-glass-bg border-glass-border backdrop-blur-md rounded-3xl overflow-hidden hover:border-primary/20 transition-all duration-300">
                <CardContent className="p-8 flex flex-col h-full">
                  <h3 className="text-2xl font-bold mb-2 font-display">Starter Pack</h3>
                  <div className="flex items-baseline mb-2">
                    <span className="text-5xl font-black font-display tracking-tight">$10</span>
                    <span className="text-lg text-muted-foreground ml-2">/10 credits</span>
                  </div>
                  <p className="text-muted-foreground mb-8">
                    Perfect for testing the waters.
                  </p>

                  <ul className="space-y-4 mb-8 flex-1">
                    {['$1.00 per post', 'Credits never expire', 'Access to all features', 'Community Support'].map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-foreground/90">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full text-lg h-12 border-2 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => navigate('/signup')}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Hustler Pack */}
          <div className="w-full md:w-[48%] max-w-md">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-full"
            >
              <Card className="h-full bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30 backdrop-blur-md rounded-3xl overflow-visible relative shadow-glass hover:shadow-lg transition-all duration-300">
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 rounded-full text-sm font-bold shadow-md uppercase tracking-wide">
                  Best Value
                </div>
                <CardContent className="p-8 flex flex-col h-full">
                  <h3 className="text-2xl font-bold mb-2 font-display">Hustler Pack</h3>
                  <div className="flex items-baseline mb-2">
                    <span className="text-5xl font-black font-display tracking-tight">$20</span>
                    <span className="text-lg text-muted-foreground ml-2">/25 credits</span>
                  </div>
                  <p className="text-muted-foreground mb-8">
                    Best value for regular sellers.
                  </p>

                  <ul className="space-y-4 mb-8 flex-1">
                    {['$0.80 per post (20% off)', 'Credits never expire', 'Priority Listing', 'AI Description Generator', 'Premium Support'].map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                        <span className="text-foreground/90">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full rounded-full text-lg h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-lg"
                    onClick={() => navigate('/signup')}
                  >
                    Buy Credits <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingPreview;