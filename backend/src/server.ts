import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { listingRoutes } from './routes/listing.routes';
import { healthRoutes } from './routes/health.routes';
import { aiRoutes } from './routes/ai.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import { jobQueueService } from './services/job-queue.service';
import { connectionRoutes } from './routes/connection.routes';
import { emailRoutes } from './routes/email.routes';
import { postingRoutes } from './routes/posting.routes';
import adminRoutes from './routes/admin.routes';
import scoutRoutes from './routes/scout.routes';
import { startPeriodicTasks } from './jobs/periodic-tasks';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:", "https://*.supabase.co", "https://nvnbdktptizhfxrbuecl.supabase.co"],
      connectSrc: ["'self'", config.FRONTEND_URL, "https://openrouter.ai", "https://api.stripe.com", "https://api.supabase.co", "wss://*.supabase.co", "https://*.supabase.co", "https://nvnbdktptizhfxrbuecl.supabase.co", "https://nominatim.openstreetmap.org"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.NODE_ENV === 'production'
    ? [config.FRONTEND_URL, /\.onrender\.com$/, 'chrome-extension://*']
    : ['http://localhost:5173', 'http://localhost:3000', 'chrome-extension://*'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Relaxed limit to prevent 429s during dev/testing
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Webhook routes (must be before body parsing)
app.use('/api/payments', webhookRoutes);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check route
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/email-stats', emailRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/postings', postingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scout', scoutRoutes);

// Serve static files from the frontend build directory
const frontendPath = path.join(__dirname, '../../frontend/dist');
import fs from 'fs';
console.log('Static files path:', frontendPath);
try {
  if (fs.existsSync(frontendPath)) {
    console.log('Frontend dist exists. Contents:', fs.readdirSync(frontendPath));
    const mascotsPath = path.join(frontendPath, 'mascots');
    if (fs.existsSync(mascotsPath)) {
       console.log('Mascots dir exists.');
    } else {
       console.log('Mascots dir MISSING at', mascotsPath);
    }
  } else {
    console.error('Frontend dist directory DOES NOT EXIST at:', frontendPath);
    // Try to find where we are
    console.log('Current directory:', __dirname);
    console.log('Repo root contents:', fs.readdirSync(path.join(__dirname, '../../')));
  }
} catch (error) {
  console.error('Error checking static files:', error);
}

app.use(express.static(frontendPath));

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle client-side routing by serving index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = config.PORT || 3000;

if (config.NODE_ENV !== 'test') {
  // Start job queue processor (every 10 seconds)
  setInterval(() => {
    jobQueueService.processJobs().catch(err => console.error('Job Queue Error:', err));
  }, 10000);

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
    console.log(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
    
    // Start periodic tasks
    startPeriodicTasks();
  });
}

export default app;