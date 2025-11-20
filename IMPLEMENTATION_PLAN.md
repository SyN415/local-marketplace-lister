# Local Marketplace Lister - Implementation Plan (Credit-Based)

This document outlines the technical implementation plan for the Local Marketplace Lister, updated to reflect the **Credit-Based (Pay-As-You-Go)** monetization model and **Gemini AI** integration.

## Phase 1: Landing & Marketing Page Overhaul

**Goal:** Create a high-converting landing page that explains the value proposition and credit-based model.

### 1.1 Component Structure (`frontend/src/pages/Landing.tsx`)
Create a new `Landing` page component that replaces `Home` for unauthenticated users.

1.  **Hero Section**
    *   **Headline:** "Dominate Local Marketplaces. One Click."
    *   **Subheadline:** "Cross-post to Facebook, Craigslist, and OfferUp instantly. Pay as you go, no subscriptions."
    *   **CTA:** "Get 5 Free Credits" (Links to `/signup`).
    *   **Visual:** 3D-style or high-quality screenshot of the dashboard.

2.  **Features Grid**
    *   **Items:**
        *   "Cross-Listing Engine": Post everywhere in seconds.
        *   "Gemini-Powered AI": Auto-generate titles & descriptions for pennies.
        *   "Inventory Sync": Manage everything from one dashboard.
        *   "Pay-As-You-Go": No monthly fees. Only pay when you post.

3.  **Pricing Preview**
    *   **Section:** "Simple Credit Packs".
    *   **Card:** "1 Credit = $1.00".
    *   **Note:** "New users get 5 FREE credits."

### 1.2 Implementation Steps
1.  **Update `frontend/src/App.tsx`:** Render `Landing` if `!isAuthenticated`.
2.  **Styling:** "Marketplace Hustle" theme (Dark mode default, Neon accents).

---

## Phase 2: Monetization (Credit System)

**Goal:** Implement a credit-based system where 1 Post = 1 Credit.

### 2.1 Database Schema Updates
Migration to replace subscription fields with a credit balance.

```sql
-- Remove subscription fields if they exist (or drop previous migration)
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS subscription_plan,
DROP COLUMN IF EXISTS subscription_end_date;

-- Add credits field
ALTER TABLE public.profiles 
ADD COLUMN credits INTEGER DEFAULT 5 NOT NULL; -- Starts with 5 free credits

-- Ensure Stripe Customer ID exists for one-time payments
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

### 2.2 Backend Implementation
1.  **Dependencies:** `npm install stripe`
2.  **Services (`backend/src/services/`):**
    *   **User Service:** Ensure `createUser` initializes `credits = 5`.
    *   **Payment Service (`stripe.service.ts`):**
        *   `createPaymentSession(userId, packId)`: Mode `payment` (not `subscription`).
        *   `handleWebhook`: On `checkout.session.completed`, increment user's `credits` by the pack amount.
    *   **Listing Service:**
        *   Add `deductCredit(userId)` method. Checks balance > 0, then decrements. Transactional.

3.  **Routes (`backend/src/routes/payment.routes.ts`):**
    *   `POST /create-payment-session`: Accepts `packId` (e.g., '10_credits', '50_credits').
    *   `POST /webhook`: Handle Stripe events.

### 2.3 Frontend Implementation
1.  **Pricing Page (`frontend/src/pages/Pricing.tsx`):**
    *   Display Credit Packs (e.g., 10 Credits for $10, 25 Credits for $25).
    *   "Buy Now" button triggers one-time Stripe Checkout.
2.  **Navbar:**
    *   Display "Credits: X" (fetch from `useAuth` or specific profile hook).
    *   "Add Credits" button links to Pricing.
3.  **Post Action:**
    *   Before submitting a cross-post, check client-side credit balance.
    *   Backend validates credit balance again.

---

## Phase 3: AI Integration (Gemini)

**Goal:** Use Google's efficient Gemini model for image transcription and listing generation.

### 3.1 Backend Updates (`backend/src/services/ai.service.ts`)
1.  **Model Switch:** Change from `openai/gpt-4o` to `google/gemini-flash-1.5` (or `google/gemini-2.5-flash-lite-preview` if available on provider).
2.  **Prompt Engineering:** Optimize system prompt for the new model to ensure consistent JSON output for:
    *   Title
    *   Description
    *   Suggested Category
    *   Condition
    *   Estimated Price

---

## Phase 4: Cross-Listing Engine (Chrome Extension)

**Goal:** Build a Chrome Extension to automate form filling, gated by credits.

### 4.1 Architecture
*   **Popup:** Displays listing details and "Post" button.
*   **Credit Check:** "Post" button disabled if credits < 1.
*   **Flow:**
    1.  User clicks "Post to Craigslist".
    2.  Extension calls API `POST /api/listings/:id/initiate-crosspost`?
        *   *Alternative:* Check credits locally in UI, but deduct on successful "Posted" confirmation?
        *   *Better:* Deduct credit when the data is *successfully fetched/prepared* for the extension, OR (more fair) reserve credit and commit deduction when extension reports success.
        *   *MVP Approach:* Deduct 1 credit when user clicks "Post" in the main dashboard to open the extension/automation. Refund if error reported (complex).
        *   *Revised MVP Approach:* 
            1.  User clicks "Cross-Post" in Dashboard.
            2.  Backend checks credits. If > 0, returns data and decrements credit (or marks "posting_started").
            3.  Extension opens and fills form.

### 4.2 Extension Structure
Standard Manifest V3 structure (Popup, Background, Content Scripts).

---

## Phase 5: Analytics & Refinement

1.  **Dashboard:** Show "Credits Used" history.
2.  **Refinement:** Tune Gemini prompts based on user feedback.