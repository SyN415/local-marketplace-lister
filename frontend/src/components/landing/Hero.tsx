import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Button } from '../ui/button';
import jp1 from '../../assets/jp1.jpg';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-bg pt-12 md:pt-0 border-b border-border">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-4 text-fg uppercase tracking-tighter">
                Dominate <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-4">
                  Local Markets.
                  <img src={jp1} alt="Jigglepost" className="h-16 w-16 md:h-24 md:w-24 rounded-full border-4 border-bg shadow-xl animate-bounce" />
                </span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="font-ui text-xl text-muted-fg mb-6 max-w-[600px] font-medium leading-relaxed">
                Cross-post to Facebook, Craigslist, and OfferUp instantly. Manage inventory, track sales, and scale your hustle with AI-powered tools.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity text-white rounded-none border-2 border-transparent uppercase font-bold px-8 py-6 h-auto text-lg"
                >
                  Start for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-none border-2 border-fg text-fg hover:bg-fg hover:text-bg uppercase font-bold px-8 py-6 h-auto text-lg"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  View Demo
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Visual/Dashboard Mockup */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "circOut" }}
            >
              <div className="relative">
                <div className="relative w-full aspect-[16/10] bg-card rounded-none border-2 border-fg shadow-[12px_12px_0px_currentColor] text-fg overflow-hidden flex flex-col">
                  {/* Mockup Header */}
                  <div className="p-3 border-b-2 border-inherit flex gap-2 bg-muted/50">
                    <div className="w-3 h-3 rounded-none border border-inherit bg-bg" />
                    <div className="w-3 h-3 rounded-none border border-inherit bg-bg" />
                    <div className="w-3 h-3 rounded-none border border-inherit bg-bg" />
                  </div>
                  
                  {/* Mockup Content */}
                  <div className="p-6 flex-1 flex gap-4 bg-bg">
                    {/* Sidebar */}
                    <div className="w-1/4 border-r-2 border-border pr-4">
                      <div className="h-5 w-4/5 bg-fg mb-4" />
                      <div className="h-2.5 w-full bg-muted mb-2" />
                      <div className="h-2.5 w-full bg-muted mb-2" />
                      <div className="h-2.5 w-full bg-muted mb-2" />
                    </div>
                    
                    {/* Main Area */}
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="h-[20%] bg-muted border border-border" />
                      <div className="flex gap-4 h-[40%]">
                        <div className="flex-1 bg-primary border border-border opacity-20" />
                        <div className="flex-1 bg-bg border border-border" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-5 -left-5 bg-white p-4 border-2 border-black shadow-[8px_8px_0px_#000] z-20 flex items-center gap-3"
                >
                  <img src={jp1} alt="Growth" className="h-10 w-10 rounded-full" />
                  <h6 className="text-black font-black uppercase text-lg">
                    +127% Growth
                  </h6>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;