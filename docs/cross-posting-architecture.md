# Cross-Posting Integration Architecture

This document outlines the technical architecture for integrating the Local Marketplace Lister with external platforms: Craigslist, Facebook Marketplace, and OfferUp.

## 1. Core Concepts

### 1.1 The Adapter Pattern
To manage the differences between platforms (API-based vs. Automation-based), we will use the **Adapter Pattern**.

```typescript
interface MarketplaceAdapter {
  /**
   * Authenticate with the platform.
   * Can be OAuth flow or Session Cookie validation.
   */
  connect(credentials: any): Promise<ConnectionResult>;

  /**
   * Publish a listing to the platform.
   * Returns a job ID or immediate result.
   */
  publish(listing: Listing, connection: MarketplaceConnection): Promise<PublishResult>;
  
  /**
   * Check the status of a specific listing on the platform.
   */
  checkStatus(externalId: string, connection: MarketplaceConnection): Promise<ListingStatus>;
}
```

### 1.2 Asynchronous Job Queue
Posting to platforms like Craigslist (email verification loops) or using Browser Automation (slow) cannot be done in the main HTTP request-response cycle. We will implement a database-backed **Job Queue**.

## 2. Data Model Updates

### 2.1 Marketplace Connections (`marketplace_connections`)
We will utilize the existing `metadata` JSONB column to store platform-specific credentials securely.

| Platform | Storage Strategy (`metadata` column) |
| :--- | :--- |
| **Craigslist** | `{ "account_id": "...", "default_area_id": "..." }` (Mostly stateless, relies on email loops or account login if we automate that) |
| **Facebook** | `{ "cookies": "...", "session_id": "..." }` (For automation) OR `{ "page_access_token": "..." }` (Graph API) |
| **OfferUp** | `{ "cookies": "...", "device_id": "..." }` (Automation credentials) |

*Security Note:* Sensitive fields in `metadata` (like cookies) must be encrypted at rest using a server-side key before insertion.

### 2.2 Posting Jobs (`posting_jobs`)
A new table to manage the asynchronous posting queue.

```sql
CREATE TABLE posting_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  platform TEXT NOT NULL, -- 'facebook', 'craigslist', 'offerup'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  result_metadata JSONB, -- Stores external_id, external_url upon success
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Platform-Specific Architectures

### 3.1 Tier 1: Craigslist (RSS/XML + Email Loop)
Craigslist offers a "Bulk Posting API" via RSS/XML for high-volume accounts, but for individual users, we simulate the flow or use the standard "browser" flow via automation.

**Strategy: Browser Automation (Puppeteer)**
Since official APIs are restricted, we will use Puppeteer to walk through the posting wizard.

**Flow:**
1.  **Trigger:** User clicks "Post to Craigslist".
2.  **Job:** Created in `posting_jobs`.
3.  **Worker:** 
    *   Launches Puppeteer.
    *   Navigates to `post.craigslist.org`.
    *   Selects location/category based on Listing data.
    *   Uploads images.
    *   Fills title, body, price.
    *   Submits form.
4.  **Verification:** If CL sends an email, the user must click it manually (MVP), or we parse the user's email (V2).
5.  **Result:** Update `posted_listings` table with the draft URL.

### 3.2 Tier 2: Facebook Marketplace
**Strategy: Hybrid (Automation Primary)**
The Graph API for Marketplace is notoriously difficult to get approved for (Commerce API). We will assume **Browser Automation** as the primary method for this MVP.

**Flow:**
1.  **Auth:** User uses a browser extension or manual input to extract their Facebook Session Cookies (`c_user`, `xs`) and saves them to `marketplace_connections`.
2.  **Job:** Worker launches Puppeteer with preserved cookies.
3.  **Action:** 
    *   Navigates to `facebook.com/marketplace/create`.
    *   Fills the "Item for Sale" form.
    *   Uploads photos (handling Facebook's specific uploader).
    *   Clicks Publish.
4.  **Result:** Scrape the resulting Listing ID/URL and update DB.

### 3.3 Tier 3: OfferUp
**Strategy: Mobile Emulation Automation**
OfferUp is mobile-first. Automation must emulate a mobile viewport or user-agent.

**Flow:**
1.  **Auth:** Similar to FB, import session cookies.
2.  **Worker:** Puppeteer launches in Mobile Emulation mode (`iPhone X` viewport).
3.  **Action:** Automate the web posting flow.

## 4. Implementation Plan

### 4.1 Phase 1: Foundation (Backend)
1.  **Migration:** Create `posting_jobs` table.
2.  **Encryption:** Add utility for encrypting/decrypting `metadata` fields.
3.  **Queue Processor:** Create a simple `Cron` or `Interval` loop in `server.ts` that:
    *   Selects `pending` jobs where `next_attempt_at <= NOW()`.
    *   Locks them (`status = 'processing'`).
    *   Dispatches to the correct Adapter.

### 4.2 Phase 2: Adapter Logic (Services)
1.  **Base Class:** `BaseAdapter` with abstract methods.
2.  **Puppeteer Service:** A shared `BrowserService` that manages launching/closing Chrome instances to save resources.
3.  **Facebook Implementation:** Implement the form-filling logic for FB.

### 4.3 Phase 3: API & Frontend
1.  **API:**
    *   `POST /api/listings/:id/publish`: Creates jobs.
    *   `GET /api/listings/:id/jobs`: Checks job status.
2.  **Frontend:**
    *   "Publish" modal selecting platforms.
    *   Progress indicator for async jobs.

## 5. API Design

### 5.1 Publish Listing
**POST** `/api/listings/:id/publish`

**Body:**
```json
{
  "platforms": ["facebook", "craigslist"]
}
```

**Response:**
```json
{
  "success": true,
  "jobs": [
    { "platform": "facebook", "jobId": "..." },
    { "platform": "craigslist", "jobId": "..." }
  ]
}
```

### 5.2 Check Job Status
**GET** `/api/jobs/:id`

**Response:**
```json
{
  "id": "...",
  "status": "completed",
  "result": {
    "external_url": "https://facebook.com/marketplace/item/..."
  }
}