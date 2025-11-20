# Project Documentation: Local Marketplace Lister

This document provides an overview of the project architecture, database schema, environment setup, deployment process, and core user workflow.

---

## 1. Project Architecture

The application is built using the **PERN** stack, augmented with **Supabase** for managed backend services.

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React (with Vite) | User Interface and client-side logic. |
| **Backend** | Node.js with Express.js | RESTful API layer for business logic, external service integration (AI, Payments), and data validation. |
| **Database** | PostgreSQL (Managed by Supabase) | Primary persistent data store. |
| **Authentication/DB Access** | Supabase Auth & Realtime | Handles user authentication (JWT), real-time updates, and provides robust Row Level Security (RLS) on the PostgreSQL database. |

The structure follows a monorepo pattern managed by the root `package.json`, separating concerns into distinct `frontend/`, `backend/`, and `shared/` workspaces.

---

## 2. Database Schema (Supabase/PostgreSQL)

The schema is defined in `supabase/migrations/20251114000001_initial_schema.sql`.

### `profiles`
Extends Supabase's `auth.users` table. Stores user-specific non-authentication data.

| Column | Type | Constraints/Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Foreign Key to `auth.users(id)` |
| `email` | `TEXT` | Unique, Not Null |
| `full_name` | `TEXT` | |
| `avatar_url` | `TEXT` | |
| `phone` | `TEXT` | |
| `location` | `TEXT` | |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Default: `NOW()` |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Default: `NOW()` |

### `listings`
Core table for items being sold.

| Column | Type | Constraints/Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Default: `uuid_generate_v4()` |
| `user_id` | `UUID` | Foreign Key to `profiles(id)`, Not Null |
| `title` | `TEXT` | Not Null |
| `description` | `TEXT` | |
| `price` | `DECIMAL(10, 2)` | Not Null |
| `category` | `TEXT` | Not Null |
| `condition` | `TEXT` | CHECK: ('new', 'like_new', 'good', 'fair', 'poor'). Default: 'good' |
| `status` | `TEXT` | CHECK: ('draft', 'active', 'sold', 'inactive'). Default: 'draft' |
| `location` | `TEXT` | |
| `images` | `JSONB` | Default: `[]` |
| `tags` | `TEXT[]` | Array of tags |

### `marketplace_connections`
Stores tokens and metadata for external marketplace integrations.

| Column | Type | Constraints/Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `user_id` | `UUID` | Foreign Key to `profiles(id)`, Not Null |
| `platform` | `TEXT` | CHECK: ('facebook', 'offerup', 'craigslist') |
| `access_token` | `TEXT` | |
| `refresh_token` | `TEXT` | |
| `is_active` | `BOOLEAN` | Default: `true` |
| `metadata` | `JSONB` | |

### `posted_listings`
Tracks the status of a listing when cross-posted to external platforms.

| Column | Type | Constraints/Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `listing_id` | `UUID` | Foreign Key to `listings(id)`, Not Null |
| `platform` | `TEXT` | CHECK: ('facebook', 'offerup', 'craigslist') |
| `platform_listing_id` | `TEXT` | ID assigned by the external platform |
| `status` | `TEXT` | CHECK: ('pending', 'posted', 'failed', 'deleted'). Default: 'pending' |

### `messages`
Stores communications related to a specific listing, typically synced from external platforms.

| Column | Type | Constraints/Notes |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key |
| `listing_id` | `UUID` | Foreign Key to `listings(id)`, Not Null |
| `platform` | `TEXT` | Source platform of the message |
| `sender_name` | `TEXT` | |
| `message` | `TEXT` | Not Null |
| `is_read` | `BOOLEAN` | Default: `false` |

---

## 3. Environment Variables

Required environment variables are separated for the Backend and Frontend.

### Backend (`backend/.env.example`)
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API server port | `3000` |
| `FRONTEND_URL` | URL of the running frontend application | `http://localhost:5173` |
| `DATABASE_URL` | Connection string for local PostgreSQL instance | `postgresql://username:password@localhost:5432/local_marketplace_lister` |
| `SUPABASE_URL` | Supabase project URL | `http://localhost:54321` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | `your-anon-key` |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key | `your-service-key` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `your-jwt-secret-key-change-in-production` |
| `COOKIE_SECRET` | Secret key for cookie signing | `your-cookie-secret-key-change-in-production` |
| `RATE_LIMIT_WINDOW_MS` | Time window for rate limiting in milliseconds | `900000` |
| `RATE_LIMIT_MAX` | Maximum requests allowed within the window | `100` |
| `MAX_FILE_SIZE` | Maximum file upload size in bytes | `10485760` |
| `UPLOAD_PATH` | Local directory for file uploads | `./uploads` |
| `FACEBOOK_APP_ID` | Facebook App ID for integration | `your-facebook-app-id` |
| `FACEBOOK_APP_SECRET` | Facebook App Secret for integration | `your-facebook-app-secret` |
| `OPENROUTER_API_KEY` | API Key for the AI service provider | `your-openrouter-api-key` |

### Frontend (`frontend/.env.example`)
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project URL for client-side SDK | `your_supabase_url` |
| `VITE_SUPABASE_ANON_KEY`| Supabase Anon Key for client-side SDK | `your_supabase_anon_key` |
| `VITE_API_URL` | URL of the backend API service | `http://localhost:3000` |
| `VITE_APP_NAME` | Name displayed in the application | `Local Marketplace Lister` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |

---

## 4. Render Deployment Commands

The deployment process relies on the build and start scripts defined in the respective `package.json` files.

### Frontend (Static Site)

The frontend is built as static assets and served by Render's static hosting feature.

| Render Setting | Command | Based on |
| :--- | :--- | :--- |
| **Build Command** | `npm run build --workspace=frontend` | `package.json` script |
| **Build Output Dir** | `dist` | Inferred from `frontend/vite.config.ts` build output structure (standard Vite) |
| **Start Command** | (None required for pure Static Site deployment) | Render automatically serves content from the build directory. |

### Backend (Web Service)

The backend compiles TypeScript to JavaScript in the `dist` folder before starting the server.

| Render Setting | Command | Based on |
| :--- | :--- | :--- |
| **Build Command** | `npm run build --workspace=backend` | `package.json` script |
| **Start Command** | `npm run start --workspace=backend` | `package.json` script |

---

## 5. User Workflow

The primary user journey involves signing up, passing a mandatory credit check, creating a listing, leveraging AI for enhancement, and finally publishing.

```mermaid
graph TD
    A[User Signs Up] --> B{Credit Check};
    B -- Pass --> C[Create Listing];
    B -- Fail --> Z[Action Required / Rejected];
    C --> D[AI Analysis/Optimization];
    D --> E[Publish Listing];
    E --> F(Listing Active on Platforms);
```
This flow ensures user vetting before listing creation and utilizes AI tooling to enhance the listing content before cross-posting to external marketplaces.