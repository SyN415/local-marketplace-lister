import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../../lib/utils';

const testimonials = [
  {
    name: 'Sarah J.',
    role: 'Power Seller',
    content: "I used to spend hours posting to different sites. Now it takes me 5 minutes. My sales have doubled since I started using this tool.",
    avatar: 'S',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  },
  {
    name: 'Mike T.',
    role: 'Furniture Flipper',
    content: "The inventory management is a game changer. I never accidentally double-sell items anymore. Highly recommended!",
    avatar: 'M',
    color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  },
  {
    name: 'Jessica R.',
    role: 'Vintage Clothing',
    content: "The AI descriptions are surprisingly good. They actually sound like a human wrote them, but better optimized for search.",
    avatar: 'J',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
];

const Trust: React.FC = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 font-display tracking-tighter">
              Trusted by Top Sellers
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of sellers scaling their local marketplace business.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="h-full"
            >
              <Card className="h-full bg-glass-bg border-glass-border backdrop-blur-md transition-all duration-300 hover:shadow-glass hover:-translate-y-2">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="flex gap-1 mb-6 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  
                  <blockquote className="text-lg leading-relaxed mb-8 flex-1 italic text-muted-foreground/90">
                    "{testimonial.content}"
                  </blockquote>

                  <div className="flex items-center gap-4 mt-auto">
                    <Avatar className={cn("h-12 w-12 border-2", testimonial.color)}>
                      <AvatarFallback className="bg-transparent font-bold">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold font-display">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Trust;