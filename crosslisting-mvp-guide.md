# Cross-Listing Hub: MVP Development Guide
## Frontend-First Approach with Security & Testing

---

## Executive Overview

This guide walks you through building a **cross-listing hub application** similar to Crosslist.com, enabling individual sellers to post listings across multiple local marketplaces (Facebook Marketplace, OfferUp, Craigslist, etc.) from a single dashboard.

**Key Differentiator:** You're building for **local marketplaces**, not national resale platforms.

**Development Philosophy:**
1. **Frontend-First**: Build UI/UX components matching Crosslist.com features
2. **Backend-Second**: API created after frontend is established
3. **Security-Built-In**: Helmet, rate-limiting, cookie management from the start
4. **Test-Driven**: Jest tests written alongside features
5. **Production-Ready**: CI/CD pipeline, ngrok for local testing, Render deployment

---

## Part 1: Frontend Design & UI Components (Phase 1)

### 1.1 Core UI Features to Build (Inspired by Crosslist.com)

Your MVP needs these key screens:

**Dashboard (Main View)**
- Quick stats card: Total listings, Posted, Drafts, Sold
- "Create Listing" button (prominent, floating action button)
- Filter/sort listings by status, marketplace, category
- Bulk action toolbar (Relist, Delist, Mark as Sold)
- Search listings by title

**Listing Management**
- List view showing:
  - Thumbnail image
  - Title
  - Price
  - Status badge (Draft/Posted/Sold)
  - Marketplaces posted to (icons: Facebook, OfferUp, Craigslist)
  - Quick actions (Edit, Delete, Post)

**Create/Edit Listing Form**
- Multi-step form (optional, but professional):
  - Step 1: Basic info (title, price, condition, category)
  - Step 2: Description & images
  - Step 3: Select marketplaces to post to
  - Step 4: Review & confirm

**Image Upload**
- Drag-and-drop upload zone
- Multiple images (5-15)
- Image preview grid with reordering
- Auto-resize indicator

**Marketplace Connections**
- "Connected Marketplaces" section
- OAuth buttons (Connect Facebook, Connect OfferUp, etc.)
- Disconnect button for each marketplace

**Analytics/Insights** (Post-MVP but design now)
- Chart: Listings by marketplace
- Chart: Status breakdown (pie chart)
- Performance metrics: Views per marketplace (if available)

### 1.2 Frontend Tech Stack Setup

```bash
# Create React project
npx create-react-app cross-listing-hub --template typescript

cd cross-listing-hub

# Install UI framework
npm install @mui/material @emotion/react @emotion/styled

# Install state management & data fetching
npm install zustand react-query

# Install routing
npm install react-router-dom

# Install form handling
npm install react-hook-form zod

# Install icons & utilities
npm install react-icons lodash

# Install HTTP client
npm install axios

# Supabase (for later integration)
npm install @supabase/supabase-js

# Dev dependencies (testing, linting)
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  @types/jest \
  prettier \
  eslint
```

### 1.3 Folder Structure for Frontend

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── StatsCard.tsx
│   │   ├── ListingsList.tsx
│   │   └── BulkActionBar.tsx
│   ├── Listings/
│   │   ├── ListingForm.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── ListingCard.tsx
│   │   └── ListingDetail.tsx
│   ├── Marketplaces/
│   │   ├── MarketplaceConnect.tsx
│   │   ├── ConnectedMarketplaces.tsx
│   │   └── OAuthButton.tsx
│   ├── Analytics/
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── MarketplaceChart.tsx
│   │   └── StatusChart.tsx
│   ├── Auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── ProtectedRoute.tsx
│   └── Layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── Layout.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── CreateListingPage.tsx
│   ├── EditListingPage.tsx
│   ├── ListingsPage.tsx
│   ├── MarketplacesPage.tsx
│   ├── AnalyticsPage.tsx
│   └── SettingsPage.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useListings.ts
│   ├── useMarketplaces.ts
│   ├── useImages.ts
│   └── useAnalytics.ts
├── services/
│   ├── api.ts (HTTP client configuration)
│   ├── listingService.ts
│   ├── marketplaceService.ts
│   └── authService.ts
├── store/
│   ├── authStore.ts (Zustand)
│   ├── listingsStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   └── constants.ts
├── App.tsx
└── index.tsx
```

### 1.4 Build Key UI Components

**Component 1: StatsCard** (TypeScript with Material-UI)

```typescript
// src/components/Dashboard/StatsCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useListings } from '../../hooks/useListings';

export const StatsCard: React.FC = () => {
  const { listings } = useListings();

  const stats = {
    total: listings.length,
    posted: listings.filter(l => l.status === 'posted').length,
    drafts: listings.filter(l => l.status === 'draft').length,
    sold: listings.filter(l => l.status === 'sold').length,
  };

  return (
    <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2} mb={3}>
      {Object.entries(stats).map(([key, value]) => (
        <Card key={key}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Typography>
            <Typography variant="h5">{value}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
```

**Component 2: ListingForm with React Hook Form**

```typescript
// src/components/Listings/ListingForm.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, Button, Select, MenuItem, Stepper, Step, StepLabel } from '@mui/material';
import { listingSchema, ListingFormData } from '../../types';
import { ImageUpload } from './ImageUpload';

export const ListingForm: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { control, handleSubmit, formState: { errors } } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
  });

  const onSubmit = (data: ListingFormData) => {
    console.log('Form data:', data);
    // API call will go here
  };

  const steps = ['Basic Info', 'Images', 'Select Marketplaces', 'Review'];

  return (
    <Box>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit(onSubmit)}>
        {activeStep === 0 && (
          <Box>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Listing Title"
                  fullWidth
                  margin="normal"
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              )}
            />
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Price"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.price}
                  helperText={errors.price?.message}
                />
              )}
            />
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select {...field} fullWidth margin="dense" label="Category">
                  <MenuItem value="electronics">Electronics</MenuItem>
                  <MenuItem value="furniture">Furniture</MenuItem>
                  <MenuItem value="clothing">Clothing</MenuItem>
                  <MenuItem value="vehicles">Vehicles</MenuItem>
                </Select>
              )}
            />
          </Box>
        )}

        {activeStep === 1 && <ImageUpload />}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6">Select marketplaces to post to:</Typography>
            <FormGroup>
              {['Facebook', 'OfferUp', 'Craigslist'].map(mp => (
                <FormControlLabel
                  key={mp}
                  control={<Checkbox />}
                  label={mp}
                />
              ))}
            </FormGroup>
          </Box>
        )}

        <Box mt={3} display="flex" gap={2}>
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(activeStep - 1)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (activeStep === steps.length - 1) {
                handleSubmit(onSubmit)();
              } else {
                setActiveStep(activeStep + 1);
              }
            }}
          >
            {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};
```

**Component 3: ImageUpload with Drag-and-Drop**

```typescript
// src/components/Listings/ImageUpload.tsx
import React, { useCallback, useState } from 'react';
import { Box, Paper, Typography, Grid, IconButton } from '@mui/material';
import { MdDeleteOutline } from 'react-icons/md';

export const ImageUpload: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  }, []);

  const addImages = (files: File[]) => {
    const validImages = files.filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...validImages]);

    // Create previews
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviews(prev => [...prev, e.target.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Paper
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        sx={{
          p: 3,
          textAlign: 'center',
          border: '2px dashed #ccc',
          borderRadius: 2,
          mb: 2,
          cursor: 'pointer',
          '&:hover': { borderColor: '#000' },
        }}
      >
        <Typography variant="body1">Drag and drop images or click to select</Typography>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => addImages(Array.from(e.target.files || []))}
          style={{ display: 'none' }}
          id="image-input"
        />
      </Paper>

      <Grid container spacing={2}>
        {previews.map((preview, index) => (
          <Grid item xs={4} sm={3} key={index}>
            <Box position="relative">
              <img src={preview} alt={`preview-${index}`} style={{ width: '100%', borderRadius: 8 }} />
              <IconButton
                size="small"
                onClick={() => removeImage(index)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                }}
              >
                <MdDeleteOutline />
              </IconButton>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
```

### 1.5 Frontend Type Definitions

```typescript
// src/types/index.ts
import { z } from 'zod';

export const listingSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.enum(['electronics', 'furniture', 'clothing', 'vehicles', 'other']),
  condition: z.enum(['new', 'like_new', 'used', 'damaged']),
  images: z.array(z.string()).min(1, 'At least one image required'),
  marketplaces: z.array(z.enum(['facebook', 'offerup', 'craigslist'])),
  status: z.enum(['draft', 'posted', 'sold']).default('draft'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ListingFormData = z.infer<typeof listingSchema>;
export type Listing = ListingFormData & { id: string };

export interface MarketplaceConnection {
  id: string;
  marketplace: 'facebook' | 'offerup' | 'craigslist';
  accountId: string;
  connectedAt: Date;
  accessToken: string;
}

export interface PostedListing {
  id: string;
  listingId: string;
  marketplace: 'facebook' | 'offerup' | 'craigslist';
  marketplaceListingId: string;
  status: 'active' | 'sold' | 'delisted';
  postedAt: Date;
  expiresAt?: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;
}
```

### 1.6 Custom Hooks for Frontend

```typescript
// src/hooks/useListings.ts
import { useState, useEffect } from 'react';
import { Listing } from '../types';
import { listingService } from '../services/listingService';

export const useListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const data = await listingService.getListings();
      setListings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createListing = async (listing: Omit<Listing, 'id'>) => {
    try {
      const newListing = await listingService.createListing(listing);
      setListings([...listings, newListing]);
      return newListing;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
      throw err;
    }
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    try {
      const updated = await listingService.updateListing(id, updates);
      setListings(listings.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update listing');
      throw err;
    }
  };

  const deleteListing = async (id: string) => {
    try {
      await listingService.deleteListing(id);
      setListings(listings.filter(l => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete listing');
      throw err;
    }
  };

  return { listings, loading, error, createListing, updateListing, deleteListing, refetch: fetchListings };
};
```

### 1.7 Frontend Jest Tests

```typescript
// src/components/Dashboard/StatsCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatsCard } from './StatsCard';

// Mock the hook
jest.mock('../../hooks/useListings', () => ({
  useListings: () => ({
    listings: [
      { id: '1', status: 'posted' },
      { id: '2', status: 'draft' },
      { id: '3', status: 'sold' },
      { id: '4', status: 'draft' },
    ],
  }),
}));

describe('StatsCard Component', () => {
  it('renders stats correctly', () => {
    render(<StatsCard />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Posted')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Sold')).toBeInTheDocument();
  });

  it('displays correct counts', () => {
    render(<StatsCard />);

    const values = screen.getAllByRole('heading', { level: 5 });
    expect(values[0]).toHaveTextContent('4'); // total
    expect(values[1]).toHaveTextContent('1'); // posted
    expect(values[2]).toHaveTextContent('2'); // drafts
    expect(values[3]).toHaveTextContent('1'); // sold
  });
});
```

---

## Part 2: Backend Setup with Security & Testing

### 2.1 Backend Project Setup

```bash
# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install express cors dotenv

# Install Supabase
npm install @supabase/supabase-js

# Install security middleware
npm install helmet express-rate-limit cookie-parser

# Install utility packages
npm install morgan uuid multer

# Install dev dependencies
npm install --save-dev \
  typescript \
  @types/node \
  @types/express \
  ts-node \
  nodemon \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @types/supertest \
  prettier

# Initialize TypeScript
npx tsc --init
```

### 2.2 Backend Folder Structure

```
backend/
├── src/
│   ├── middleware/
│   │   ├── security.ts (Helmet, CORS, rate-limiting)
│   │   ├── auth.ts (JWT verification)
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── listings.ts
│   │   ├── marketplaces.ts
│   │   ├── auth.ts
│   │   └── health.ts
│   ├── services/
│   │   ├── listingService.ts
│   │   ├── marketplaceService.ts
│   │   └── supabaseService.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── validators.ts
│   ├── config.ts
│   └── server.ts
├── tests/
│   ├── listings.test.ts
│   ├── marketplaces.test.ts
│   └── setup.ts
├── .env.example
├── .env (local)
├── jest.config.js
├── tsconfig.json
└── package.json
```

### 2.3 Security Middleware Setup

```typescript
// src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { Express } from 'express';
import cors from 'cors';

export const setupSecurityMiddleware = (app: Express) => {
  // Helmet: Set security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Cookie parser
  app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-secret'));

  // General rate limiter (10 requests per 15 minutes)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development',
  });

  // Auth rate limiter (5 requests per 15 minutes)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many authentication attempts' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  // API limiter (50 requests per 5 minutes)
  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: { error: 'API rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(generalLimiter);
  
  // Export for route-specific use
  return { authLimiter, apiLimiter };
};
```

### 2.4 Express Server Setup with TypeScript

```typescript
// src/server.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { setupSecurityMiddleware } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import listingsRouter from './routes/listings';
import marketplacesRouter from './routes/marketplaces';
import authRouter from './routes/auth';
import healthRouter from './routes/health';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup security middleware
setupSecurityMiddleware(app);

// Health check endpoint
app.use('/api/health', healthRouter);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/marketplaces', marketplacesRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Export app for testing
export default app;

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✓ Server running at http://localhost:${PORT}`);
  });
}
```

### 2.5 Supabase Service Integration

```typescript
// src/services/supabaseService.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient() {
    return this.client;
  }

  async createListing(userId: string, listingData: any) {
    const { data, error } = await this.client
      .from('listings')
      .insert({
        user_id: userId,
        ...listingData,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getListings(userId: string) {
    const { data, error } = await this.client
      .from('listings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateListing(listingId: string, updates: any) {
    const { data, error } = await this.client
      .from('listings')
      .update(updates)
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteListing(listingId: string) {
    const { error } = await this.client
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;
    return { success: true };
  }

  async getMarketplaceConnections(userId: string) {
    const { data, error } = await this.client
      .from('marketplace_connections')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async saveMarketplaceConnection(userId: string, connectionData: any) {
    const { data, error } = await this.client
      .from('marketplace_connections')
      .upsert({
        user_id: userId,
        ...connectionData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();
```

### 2.6 Express Routes with Rate Limiting

```typescript
// src/routes/listings.ts
import { Router, Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { setupSecurityMiddleware } from '../middleware/security';
import express from 'express';

const router = Router();
const { apiLimiter } = setupSecurityMiddleware(express());

// Middleware to verify user (JWT verification)
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  (req as any).userId = userId;
  next();
};

// GET all listings for authenticated user
router.get('/', apiLimiter, authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const listings = await supabaseService.getListings(userId);
    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
});

// POST create new listing
router.post('/', apiLimiter, authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { title, price, category, description, images, marketplaces } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    const listing = await supabaseService.createListing(userId, {
      title,
      price,
      category,
      description,
      images,
      marketplaces,
    });

    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

// PUT update listing
router.put('/:id', apiLimiter, authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const listing = await supabaseService.updateListing(id, updates);
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
});

// DELETE listing
router.delete('/:id', apiLimiter, authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await supabaseService.deleteListing(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
```

### 2.7 Jest Test Suite

```typescript
// tests/listings.test.ts
import request from 'supertest';
import app from '../src/server';

describe('Listings Endpoints', () => {
  const mockUserId = 'user-123';

  describe('POST /api/listings', () => {
    it('should create a new listing', async () => {
      const listingData = {
        title: 'iPhone 13',
        price: 599,
        category: 'electronics',
        description: 'Excellent condition',
        images: ['https://example.com/image.jpg'],
        marketplaces: ['facebook'],
      };

      const res = await request(app)
        .post('/api/listings')
        .set('x-user-id', mockUserId)
        .send(listingData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('iPhone 13');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('x-user-id', mockUserId)
        .send({ price: 599 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .post('/api/listings')
        .send({ title: 'Test', price: 100 });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/listings', () => {
    it('should retrieve user listings', async () => {
      const res = await request(app)
        .get('/api/listings')
        .set('x-user-id', mockUserId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PUT /api/listings/:id', () => {
    it('should update a listing', async () => {
      const res = await request(app)
        .put('/api/listings/123')
        .set('x-user-id', mockUserId)
        .send({ status: 'posted' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/listings/:id', () => {
    it('should delete a listing', async () => {
      const res = await request(app)
        .delete('/api/listings/123')
        .set('x-user-id', mockUserId);

      expect(res.status).toBe(200);
    });
  });
});
```

### 2.8 Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

---

## Part 3: Local Development with ngrok

### 3.1 Setting Up ngrok for Local Testing

**Why ngrok?**
- Test webhooks from Facebook, OfferUp locally
- Share your local API with frontend developers
- Test OAuth redirect URIs during development

```bash
# Download ngrok from https://ngrok.com/download

# Create account at https://ngrok.com

# Get your auth token and add to ngrok config
ngrok config add-authtoken YOUR_TOKEN

# Start ngrok tunnel on port 5000
ngrok http 5000
```

**Output example:**
```
ngrok                                       (Ctrl+C to quit)

Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:5000

Session Status                online
Account                       youruser@example.com
Version                        3.0.0
Region                         United States (us)
Latency                        77ms
Web Interface                  http://127.0.0.1:4040
```

### 3.2 Environment Configuration for Local Development

```bash
# .env.local (for backend)
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Supabase local
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=your_local_service_key

# ngrok tunnel URL (for OAuth redirect URIs)
PUBLIC_API_URL=https://abc123def456.ngrok.io

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=https://abc123def456.ngrok.io/api/auth/facebook/callback

# OfferUp OAuth (if available)
OFFERUP_CLIENT_ID=your_offerup_client_id
OFFERUP_CLIENT_SECRET=your_offerup_client_secret

# Security
COOKIE_SECRET=dev_cookie_secret
JWT_SECRET=dev_jwt_secret
```

### 3.3 Running Multiple Terminal Windows for Local Dev

```bash
# Terminal 1: Start Supabase (if using local Supabase)
cd supabase
supabase start

# Terminal 2: Start ngrok
ngrok http 5000

# Terminal 3: Start backend server
cd backend
npm run dev

# Terminal 4: Start frontend
cd frontend
npm start
```

---

## Part 4: CI/CD with GitHub Actions

### 4.1 Setting Up GitHub Actions for Supabase Migrations

```yaml
# .github/workflows/supabase-migrations.yml
name: Deploy Supabase Migrations

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'supabase/migrations/**'
      - '.github/workflows/supabase-migrations.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Pull latest migrations
        run: supabase db pull

      - name: Deploy migrations to production
        if: github.ref == 'refs/heads/main'
        run: |
          supabase db push \
            --project-id ${{ secrets.SUPABASE_PROJECT_ID }}

      - name: Deploy migrations to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          supabase db push \
            --project-id ${{ secrets.SUPABASE_STAGING_PROJECT_ID }}
```

### 4.2 GitHub Actions for Frontend & Backend Deployment

```yaml
# .github/workflows/deploy-render.yml
name: Deploy to Render

on:
  push:
    branches:
      - main
      - develop

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies (backend)
        run: |
          cd backend
          npm install

      - name: Run tests (backend)
        run: |
          cd backend
          npm run test

      - name: Build backend
        run: |
          cd backend
          npm run build

      - name: Install dependencies (frontend)
        run: |
          cd frontend
          npm install

      - name: Run tests (frontend)
        run: |
          cd frontend
          npm run test -- --passWithNoTests

      - name: Build frontend
        run: |
          cd frontend
          npm run build

      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            curl -X POST https://api.render.com/deploy/srv-${{ secrets.RENDER_SERVICE_ID_PROD }} \
              -H "accept: application/json" \
              -H "authorization: Bearer ${{ secrets.RENDER_API_KEY }}"
          else
            echo "Skipping deploy for non-main branch"
          fi
```

### 4.3 GitHub Secrets Setup

In your GitHub repository:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

```
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_ID
SUPABASE_STAGING_PROJECT_ID
RENDER_API_KEY
RENDER_SERVICE_ID_PROD
```

---

## Part 5: Deployment to Render.com

### 5.1 Create Render Services

**Step 1: Deploy Backend**

1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Connect GitHub repository
4. Name: `cross-listing-backend`
5. Environment: `Node`
6. Build Command: `cd backend && npm install && npm run build`
7. Start Command: `cd backend && npm start`
8. Add environment variables:
   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_key
   JWT_SECRET=your_secret
   COOKIE_SECRET=your_secret
   ```
9. Click **Deploy**

**Step 2: Deploy Frontend**

1. Click **New +** → **Web Service**
2. Connect GitHub repository
3. Name: `cross-listing-frontend`
4. Environment: `Node`
5. Build Command: `cd frontend && npm install && npm run build`
6. Start Command: `cd frontend && npm start`
7. Add environment variables:
   ```
   REACT_APP_API_URL=https://cross-listing-backend.onrender.com
   ```
8. Click **Deploy**

### 5.2 Render Production Environment

```yaml
# render.yaml (deploy this to repo root)
services:
  - type: web
    name: cross-listing-backend
    env: node
    plan: free
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        fromDatabase:
          name: supabase-db
          property: connectionString

  - type: web
    name: cross-listing-frontend
    env: node
    plan: free
    buildCommand: cd frontend && npm install && npm run build
    startCommand: cd frontend && npm start
    envVars:
      - key: REACT_APP_API_URL
        value: https://cross-listing-backend.onrender.com

databases:
  - name: supabase-db
    plan: free
```

---

## Part 6: Development Workflow

### 6.1 Daily Development Cycle

```bash
# Morning: Start everything
Terminal 1: supabase start
Terminal 2: ngrok http 5000
Terminal 3: cd backend && npm run dev
Terminal 4: cd frontend && npm start

# Development
- Edit React components
- Test locally at http://localhost:3000
- Edit backend routes
- Run tests: npm test
- Check browser DevTools console

# Push changes
git add .
git commit -m "Add feature XYZ"
git push origin feature-branch

# Create Pull Request
# GitHub Actions runs tests automatically
# Once merged to main, Render auto-deploys
```

### 6.2 Testing Strategy

```bash
# Frontend tests
cd frontend
npm test -- --watch

# Backend tests
cd backend
npm run test:watch

# Run all tests before pushing
npm test -- --coverage
```

### 6.3 Database Migrations with Supabase

```bash
# Make changes locally
supabase start

# Create migration
supabase migration new add_new_table

# Write SQL in migration file
# supabase/migrations/20240113_add_new_table.sql

# Test locally
supabase db reset

# Commit and push
git add supabase/migrations/
git commit -m "Add new table migration"
git push

# GitHub Actions deploys to production
```

---

## Part 7: MVP Feature Checklist

### Phase 1: Core Dashboard (Weeks 1-2)
- [ ] User authentication (sign up/login)
- [ ] Dashboard with stats
- [ ] List all listings view
- [ ] Create listing form (basic)
- [ ] Edit/delete listings

### Phase 2: Image Handling (Weeks 3-4)
- [ ] Image upload with drag-drop
- [ ] Image preview and reordering
- [ ] Auto-resize images
- [ ] Image storage in Supabase

### Phase 3: Marketplace Integration (Weeks 5-6)
- [ ] Facebook OAuth connection
- [ ] Post to Facebook Marketplace
- [ ] Track posted listings
- [ ] Manual posting for other platforms

### Phase 4: Polish & Testing (Weeks 7-8)
- [ ] Comprehensive Jest test coverage
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Security audit (Helmet, rate-limiting working)
- [ ] Deploy to Render production

---

## Summary

**You now have:**
1. ✓ Frontend architecture with React + TypeScript
2. ✓ Backend setup with Express + Supabase
3. ✓ Security middleware (Helmet, rate-limiting, cookies)
4. ✓ Jest testing framework
5. ✓ Local development with ngrok
6. ✓ CI/CD pipeline with GitHub Actions
7. ✓ Production deployment on Render

**Next Steps:**
1. Build frontend components first (React)
2. Create mock API client (axios)
3. Test frontend locally
4. Build backend API endpoints
5. Connect frontend to real backend
6. Add security middleware
7. Write comprehensive tests
8. Set up GitHub Actions
9. Deploy to Render
10. Iterate and scale

Start with frontend, then backend. This MVP-first approach gets you to market faster.
