# Cross-Listing MVP: Implementation Quick Reference
## Commands, Configuration, & Code Snippets

---

## Quick Start Setup (Copy & Paste)

### 1. Project Initialization

```bash
# Create monorepo structure
mkdir cross-listing-hub
cd cross-listing-hub
git init
git config user.email "your@email.com"
git config user.name "Your Name"

# Frontend
npx create-react-app frontend --template typescript
cd frontend
npm install @mui/material @emotion/react @emotion/styled zustand react-query axios react-router-dom react-hook-form zod @hookform/resolvers react-icons lodash @supabase/supabase-js

# Dev dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @types/jest prettier eslint

cd ..

# Backend
mkdir backend
cd backend
npm init -y

npm install express cors dotenv @supabase/supabase-js helmet express-rate-limit cookie-parser morgan uuid multer

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

npx tsc --init

cd ..

# Root level
cat > package.json << 'EOF'
{
  "name": "cross-listing-hub",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm start",
    "dev:backend": "cd backend && npm run dev",
    "test": "concurrently \"npm run test:frontend\" \"npm run test:backend\"",
    "test:frontend": "cd frontend && npm test",
    "test:backend": "cd backend && npm test"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
EOF

npm install concurrently
```

### 2. Environment Setup

```bash
# .env.local (root level)
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost:5000

# Backend
PORT=5000
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=your_local_key
SUPABASE_ANON_KEY=your_anon_key

# Security
JWT_SECRET=dev_jwt_secret_change_in_production
COOKIE_SECRET=dev_cookie_secret

# Supabase CLI
SUPABASE_ACCESS_TOKEN=your_token (optional, for production deployments)
```

### 3. Supabase Database Setup

```bash
# Initialize Supabase locally
npm install -g supabase
supabase init

# Start Supabase
supabase start

# Admin panel opens at: http://localhost:54323
# Save these from output:
# - API URL: http://localhost:54321
# - anon key: [copy this]
# - service_role key: [copy this]
```

**SQL: Create all tables at once**

Go to http://localhost:54323 → SQL Editor → Run this:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  category TEXT,
  condition TEXT DEFAULT 'used',
  images JSONB DEFAULT '[]'::jsonb,
  location_lat FLOAT,
  location_lng FLOAT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = user_id);

-- Marketplace connections table
CREATE TABLE public.marketplace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, marketplace)
);

ALTER TABLE public.marketplace_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON public.marketplace_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connections"
  ON public.marketplace_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Posted listings table
CREATE TABLE public.posted_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  marketplace_listing_id TEXT,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  last_renewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.posted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posted listings"
  ON public.posted_listings FOR SELECT
  USING (auth.uid() = user_id);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  posted_listing_id UUID NOT NULL REFERENCES public.posted_listings(id),
  buyer_name TEXT,
  buyer_contact TEXT,
  marketplace TEXT,
  message_text TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Terminal Commands Reference

### Frontend Development

```bash
# Start dev server
cd frontend && npm start

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build

# Format code
npm run prettier

# Lint
npm run lint
```

### Backend Development

```bash
# Start dev server (with auto-reload)
cd backend && npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Build TypeScript
npm run build

# Format code
npm run prettier

# Start production server
npm start
```

### Supabase Commands

```bash
# Check status
supabase status

# Start local Supabase
supabase start

# Stop Supabase
supabase stop

# Reset database (DELETE ALL DATA)
supabase db reset

# Pull changes from remote
supabase db pull

# Create new migration
supabase migration new migration_name

# Push migrations to remote
supabase db push

# View logs
supabase logs
```

### Git Commands

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Feature description"

# Push to GitHub
git push origin main

# Create new branch
git checkout -b feature/my-feature

# Merge branch
git merge feature/my-feature
```

### ngrok Tunneling

```bash
# Start ngrok tunnel on port 5000
ngrok http 5000

# View traffic in browser
# http://127.0.0.1:4040

# Start with specific region (faster)
ngrok http 5000 --region us
```

---

## Backend npm Scripts Setup

Add to `backend/package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "prettier": "prettier --write \"src/**/*.ts\"",
    "lint": "eslint src --ext .ts"
  }
}
```

---

## Frontend npm Scripts Setup

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "prettier": "prettier --write \"src/**/*.{ts,tsx}\"",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

---

## Backend TypeScript Config

`backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Backend Jest Configuration

`backend/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/config.ts'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testTimeout: 30000
};
```

---

## Environment Variables Checklist

### Development (.env.local)

```
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Security
JWT_SECRET=dev_secret_min_32_chars_long
COOKIE_SECRET=dev_cookie_secret
CORS_ORIGIN=http://localhost:3000

# ngrok (after starting tunnel)
PUBLIC_API_URL=https://abc123.ngrok.io
```

### Production (.env.production)

```
NODE_ENV=production
PORT=5000

# Supabase Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=production_anon_key
SUPABASE_SERVICE_KEY=production_service_key

# Security (use strong values!)
JWT_SECRET=your_strong_secret_32_chars_min
COOKIE_SECRET=your_strong_cookie_secret
CORS_ORIGIN=https://your-domain.com

# OAuth (update these)
FACEBOOK_APP_ID=prod_app_id
FACEBOOK_APP_SECRET=prod_app_secret
```

---

## GitHub Actions Secrets

In GitHub repo: **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

```
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_ID
SUPABASE_STAGING_PROJECT_ID
RENDER_API_KEY
RENDER_SERVICE_ID_PROD
```

---

## Testing: Common Patterns

### Frontend Jest Test Template

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Component Name', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle click', async () => {
    render(<YourComponent />);
    const button = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(button);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('should fetch data', async () => {
    render(<YourComponent />);
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

### Backend Jest Test Template

```typescript
import request from 'supertest';
import app from '../src/server';

describe('API Endpoint', () => {
  it('should return 200 on GET', async () => {
    const res = await request(app).get('/api/endpoint');
    expect(res.statusCode).toBe(200);
  });

  it('should create resource', async () => {
    const res = await request(app)
      .post('/api/endpoint')
      .send({ name: 'Test' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('should handle errors', async () => {
    const res = await request(app)
      .post('/api/endpoint')
      .send({ /* invalid data */ });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
```

---

## Rate Limiting: Common Configurations

### Easy Endpoints (General browsing)
```
15 minutes → 100 requests
```

### Medium Endpoints (API calls)
```
5 minutes → 50 requests
```

### Hard Endpoints (Auth, heavy operations)
```
10 minutes → 5 requests
```

---

## Docker (Optional, for Supabase local)

```bash
# Install Docker Desktop: https://www.docker.com/products/docker-desktop/

# Check if running
docker --version

# Start Supabase with Docker
supabase start

# Docker will automatically download and run:
# - PostgreSQL
# - Auth service
# - Storage service
# - REST API
# - Realtime service

# Stop everything
supabase stop

# View Docker containers
docker ps

# View logs
docker logs container_name
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing: `npm test`
- [ ] Code formatted: `npm run prettier`
- [ ] No linting errors: `npm run lint`
- [ ] Environment variables set in Render
- [ ] Supabase production database created
- [ ] Database migrations applied
- [ ] HTTPS enabled on Render
- [ ] Helmet security headers configured
- [ ] Rate limiting set appropriately
- [ ] Error logging configured
- [ ] Database backups enabled
- [ ] Monitoring alerts set up

---

## Debugging Tips

### Frontend Issues

```typescript
// Check API connection
console.log('API URL:', process.env.REACT_APP_API_URL);

// Debug HTTP calls
axios.interceptors.response.use(
  res => {
    console.log('API Response:', res);
    return res;
  },
  err => {
    console.error('API Error:', err.response?.data || err);
    return Promise.reject(err);
  }
);

// Check component rendering
useEffect(() => {
  console.log('Component mounted', { listings });
}, [listings]);
```

### Backend Issues

```typescript
// Enable request logging
import morgan from 'morgan';
app.use(morgan('combined'));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers,
  });
  next();
});

// Debug database queries
supabaseService.getListings = async (userId) => {
  console.log('Fetching listings for user:', userId);
  const result = await client.from('listings').select('*').eq('user_id', userId);
  console.log('Result:', result);
  return result.data;
};
```

### Supabase Issues

```sql
-- Check users
SELECT id, email, created_at FROM auth.users;

-- Check listings
SELECT * FROM public.listings ORDER BY created_at DESC;

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname='public';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname='public';
```

---

## Performance Monitoring

### Frontend
```bash
# Lighthouse audit
npm run build
# Then open build/index.html with Chrome DevTools → Lighthouse

# Component performance
npm install react-profiler
# Use React DevTools to profile
```

### Backend
```typescript
// Track response times
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Cannot connect to Supabase" | Check `supabase start` is running, verify URL in `.env.local` |
| "CORS error" | Add frontend URL to `CORS_ORIGIN` env var, restart backend |
| "Module not found" | Run `npm install`, clear `node_modules`, reinstall |
| "Tests failing" | Check test setup, mock external dependencies |
| "ngrok tunnel expired" | Restart `ngrok http 5000`, update callback URLs |
| "Rate limit exceeded" | Increase limit or wait for window to reset |
| "Port already in use" | Kill process: `lsof -i :5000` then `kill -9 PID` |

---

## Useful Resources

**Documentation:**
- React: https://react.dev/
- Express: https://expressjs.com/
- Supabase: https://supabase.com/docs
- Jest: https://jestjs.io/
- Material-UI: https://mui.com/

**Testing:**
- React Testing Library: https://testing-library.com/
- Supertest: https://github.com/visionmedia/supertest

**Deployment:**
- Render: https://render.com/docs
- GitHub Actions: https://docs.github.com/en/actions

**Security:**
- Helmet: https://helmetjs.github.io/
- Rate Limiting: https://github.com/nfriedly/express-rate-limit

---

## Next Steps

1. **Run setup commands** above
2. **Start Supabase locally**
3. **Build React components**
4. **Run frontend locally**
5. **Create Express backend**
6. **Add security middleware**
7. **Write Jest tests**
8. **Test with ngrok**
9. **Set up GitHub Actions**
10. **Deploy to Render**

**You're ready to build!** 🚀
