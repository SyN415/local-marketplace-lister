import React from 'react';
import { motion } from 'framer-motion';
import { Archive, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import jp1 from '../../assets/jp1.jpg';

const features = [
  {
    title: 'Cross-Listing Engine',
    description: 'Post your items to Facebook Marketplace, Craigslist, and OfferUp in seconds. Multiply your reach instantly.',
    icon: <img src={jp1} alt="Jigglepost Mascot" className="h-8 w-8 rounded-full" />,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    title: 'Inventory Sync',
    description: 'Sell once, delist everywhere. Keep your inventory organized and avoid double-selling with our centralized dashboard.',
    icon: <Archive className="h-8 w-8" />,
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  },
  {
    title: 'AI-Powered Listings',
    description: 'Stop writing descriptions. Our AI generates SEO-optimized titles and descriptions that sell faster.',
    icon: <Sparkles className="h-8 w-8" />,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track your profit, visualize growth, and identify your best-selling categories with detailed analytics.',
    icon: <TrendingUp className="h-8 w-8" />,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  return (
    <div className="w-full md:w-1/2 lg:w-1/4 px-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="h-full"
      >
        <Card className="h-full bg-glass-bg border-glass-border backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-glass hover:border-primary/20">
          <CardContent className="p-8 flex flex-col gap-4 h-full">
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-2 border",
                feature.color
              )}
            >
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold font-display tracking-tight">
              {feature.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Features: React.FC = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 font-display bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent tracking-tighter">
              Everything You Need to Scale
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed for the modern local marketplace seller.
            </p>
          </motion.div>
        </div>

        <div className="flex flex-wrap -mx-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;