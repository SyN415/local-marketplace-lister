# Architecture Plan: Craigslist & Facebook Integrations

## 1. Overview
This document outlines the architectural design for extending the Marketplace Lister to support Craigslist and Facebook Marketplace. The solution addresses the unique challenges of each platform: Craigslist's lack of a public API and reliance on email communication, and Facebook's complex hybrid requirement of OAuth for permissions but browser automation for Marketplace posting.

## 2. Database Schema Design

We will leverage the existing `marketplace_connections` and `posting_jobs` tables with strategic enhancements.

### 2.1. `marketplace_connections` Table
This table stores authentication data. We need to support OAuth tokens (FB) and Email Aliases (CL).

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key to `auth.users` |
| `platform` | TEXT | 'craigslist', 'facebook', 'offerup' |
| `credentials` | JSONB | **Existing.** Stores sensitive data. Structure varies by platform. |
| `metadata` | JSONB | **New.** Stores non-sensitive config (e.g., allocated email alias, FB Page ID). |
| `status` | TEXT | 'active', 'disconnected', 'expired' |
| `expires_at` | TIMESTAMPTZ | For OAuth tokens |

**JSONB Structures:**

**Facebook:**
```json
// credentials
{
  "access_token": "...",
  "refresh_token": "...",
  "cookies": [...] // If we cache Puppeteer session cookies
}
// metadata
{
  "fb_user_id": "12345",
  "fb_page_name": "John Doe",
  "permissions": ["pages_manage_posts", "ads_management"]
}
```

**Craigslist:**
```json
// credentials
{
  // Empty for now, as we don't store user passwords.
  // We rely on the email alias routing.
}
// metadata
{
  "email_alias": "post-job123+u555@mail.marketplacelister.com",
  "forwarding_verified": true
}
```

### 2.2. `posting_jobs` Table
Tracks the status of a listing submission.

| Column | Type | Description |
| :--- | :--- | :--- |
| `external_id` | TEXT | **New.** ID assigned by the platform (e.g., CL post ID). |
| `result_data` | JSONB | Stores platform-specific success details (URLs, expiration dates). |
| `log_level` | TEXT | 'info', 'error' |

## 3. Backend Architecture

### 3.1. Craigslist: The Email Routing System ("Mailman")

Since Craigslist anonymizes emails and requires verification links sent to email, we cannot easily automate the full loop without controlling the email flow.

**Strategy:**
1.  **Central Email Server:** We configure a domain (e.g., `mail.marketplacelister.com`) with a catch-all or dynamic alias support.
2.  **Alias Generation:** When a user connects Craigslist, we generate a unique alias: `cl-{userId}-{random}@mail.marketplacelister.com`.
3.  **Forwarding:** The user sets this alias as their "Reply-To" or uses it in their Craigslist account. *Correction:* For posting, we simply use Puppeteer to fill the form with *our* generated alias.
4.  **Incoming Mail Processing (IMAP Polling):**
    *   A background service (`EmailProcessor`) polls the central Gmail/Email account via IMAP.
    *   It parses the `To` address to extract the `userId` or `jobId`.
    *   **Verification Emails:** If the email is a "Publish your listing" link from CL, the system parses the link and triggers Puppeteer to visit it and click "Publish".
    *   **Buyer Replies:** If the email is a reply from a buyer, the system looks up the `userId` from the alias and forwards the email content to the user's real email address (stored in `auth.users`).

**Components:**
*   `EmailService`: Handles sending/receiving/parsing.
*   `CraigslistAdapter`: Updates to generate the alias and instruct Puppeteer to use it during the "Create Post" flow.

### 3.2. Facebook: OAuth + Puppeteer Hybrid

We use OAuth to legitimize the connection and get basic user info, but Puppeteer to do the heavy lifting of posting to Marketplace (which has no public API for write operations).

**Flow:**
1.  **Connect:** User clicks "Connect Facebook" -> Redirects to FB OAuth -> Callback stores `access_token`.
2.  **Session Priming:** Before running a posting job, we use the `access_token` to potentially "prime" the Puppeteer session (though standard OAuth doesn't give login cookies).
    *   *Alternative (More Robust):* We use a Chrome Extension or a "Login via Puppeteer" flow where the user logs in once inside our controlled browser window, and we capture the cookies.
    *   *Selected Approach:* **"Login via Puppeteer"**. The OAuth flow is good for "Sign in with FB" but insufficient for Marketplace automation. We will present a "Connect Marketplace" button that opens a remote browser view (or extension) where the user logs in, and we save the cookies/session state.

### 3.3. Job Queue Service

The `JobQueueService` will manage the execution of Puppeteer scripts.

*   **Concurrency:** Limited to X jobs in parallel to manage CPU/RAM.
*   **Headless vs. Headful:** Running headless on the server (Render/Supabase Edge usually can't run Puppeteer, so this needs a dedicated Node.js worker service).
*   **Architecture Node:** We need a **Worker Server** (Node.js + Puppeteer) separate from the main API if load gets high. For MVP, it runs in the same backend instance.

## 4. API Endpoints

### 4.1. Connection Routes (`/api/connections`)
*   `POST /craigslist/setup`: Generates and returns a dedicated email alias.
*   `GET /facebook/auth-url`: Returns the OAuth authorization URL.
*   `POST /facebook/callback`: Handles the OAuth code exchange.
*   `POST /facebook/session`: (If using cookie extraction) Endpoint to receive cookies from the extension/browser.

### 4.2. Webhooks (`/api/webhooks`)
*   `POST /email/incoming`: (Optional) If using SendGrid/Mailgun Inbound Parse instead of IMAP polling. *Recommended for scale.*

## 5. Frontend Design

### 5.1. Connect Craigslist Modal
*   **Header:** "Connect Craigslist"
*   **Step 1:** Explain the process. "We create a unique email for you to keep your personal email private and automate message routing."
*   **Step 2:** Display the generated Alias: `cl-user-123@...`
*   **Step 3:** "Send Test Email" button to verify forwarding works.

### 5.2. Connect Facebook Modal
*   **Option A (OAuth):** Standard "Log in with Facebook" button.
*   **Option B (Marketplace Automation):**
    *   "To post to Marketplace, we need to sync your session."
    *   Button: "Open Secure Browser" (Triggers Puppeteer session or Extension popup).
    *   User logs in manually in that window.
    *   System detects login and closes window: "Connected!"

## 6. Implementation Roadmap

### Phase 1: Foundation (Current)
*   [x] Basic DB Schema
*   [x] Job Queue Structure

### Phase 2: Craigslist Email Logic
*   [ ] Set up Email Provider (e.g., Gmail + IMAP or Mailgun).
*   [ ] Implement `EmailService` to parse incoming verification emails.
*   [ ] Update `CraigslistAdapter` to use the alias.

### Phase 3: Facebook Hybrid Auth
*   [ ] Implement "Login with Puppeteer" flow (or Cookie extraction).
*   [ ] Securely store cookies in `marketplace_connections`.

### Phase 4: End-to-End Testing
*   [ ] Test full loop: Post -> Email Verify -> Live -> Buyer Reply -> Forward to User.