# Backend Analysis & Frontend Design Plan

## 1. Backend Analysis

### Existing Infrastructure
*   **Tables:**
    *   `marketplace_connections`: Stores user credentials/tokens for platforms (created in `20251114000001_initial_schema.sql`, updated in `20251121000004_cross_posting_tables.sql`).
    *   `posting_jobs`: Tracks the status of background posting tasks.
*   **Routes:**
    *   `POST /api/postings/publish`: Enqueues jobs for a specific listing and set of platforms.
    *   `GET /api/postings/status/:listingId`: Retrieves the status of posting jobs for a specific listing.
*   **Services:**
    *   `JobQueueService`: Handles the processing of `posting_jobs`, using adapters (`CraigslistAdapter`, etc.) to execute the actual posting.

### Missing Endpoints
The analysis of `backend/src/server.ts` and the `routes` directory reveals that **Marketplace Connection Management endpoints are missing**. While the database table exists, there is no API exposed to the frontend to create, list, or delete these connections.

**Required New Endpoints (`/api/connections`):**
1.  `GET /api/connections`: List all marketplace connections for the current user.
2.  `POST /api/connections/:platform`: Create or update credentials for a specific platform (e.g., Craigslist, Facebook).
3.  `DELETE /api/connections/:platform`: Remove a connection.
4.  `GET /api/connections/:platform/status`: (Optional) Verify connection status.

## 2. Frontend Architecture Design

### Component Structure

#### A. Connection Manager (`/dashboard/connections`)
A settings-like page where users manage their accounts.

*   `ConnectionsLayout`: Main wrapper.
*   `ConnectionCard`: Displays status (Connected/Not Connected), Platform Icon, and "Connect"/"Manage" buttons.
*   `ConnectionModal`:
    *   **Craigslist:** Form for `username`, `password`.
    *   **Facebook:** OAuth flow trigger or cookie/session input (depending on adapter implementation).
    *   **OfferUp:** Login form.
*   `ConnectionStatusBadge`: Visual indicator (Green check / Red X).

#### B. Job Status Board (`/dashboard/jobs`)
A view to track active and past cross-posting jobs.

*   `JobsDashboard`: Main container.
*   `RecentJobsTable`: A table showing the latest posting attempts.
    *   Columns: Listing Title, Platform, Status (Pending/Processing/Success/Failed), Timestamp, Actions (Retry, View Logs).
*   `JobStatusPill`: Color-coded status component.
*   `LogViewerModal`: Simple modal to display `error_log` or `result_data` JSON for debugging.

#### C. Integration Points
*   **Listing Details Page:** Add a "Post to Marketplaces" button that triggers the `POST /api/postings/publish` endpoint.
*   **Listing Card:** Show small icons indicating which platforms a listing is posted to.

### Data Fetching Strategy (React Query)

**Query Keys (`src/lib/query-keys.ts`):**
```typescript
export const queryKeys = {
  // ... existing keys
  connections: {
    all: ['connections'] as const,
    detail: (platform: string) => ['connections', platform] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    byListing: (listingId: string) => ['jobs', 'listing', listingId] as const,
  },
};
```

**Realtime Strategy:**
Since `posting_jobs` are processed in the background, the frontend needs live updates.
*   **Primary:** React Query `useQuery` with `refetchInterval: 5000` (polling) for simplicity and reliability during MVP.
*   **Secondary (Optimization):** Supabase Realtime subscription on the `posting_jobs` table filtering by `user_id`.
    ```typescript
    // supabase.channel('jobs').on('postgres_changes', ...)
    ```

### Types (`frontend/src/types/connections.ts`)

```typescript
export type Platform = 'craigslist' | 'facebook' | 'offerup';

export interface Connection {
  id: string;
  platform: Platform;
  is_active: boolean;
  connected_at: string;
  metadata?: Record<string, any>;
}

export interface PostingJob {
  id: string;
  listing_id: string;
  platform: Platform;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_data?: any;
  error_log?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}
```

## 3. Implementation Plan

1.  **Backend Implementation:**
    *   Create `backend/src/routes/connection.routes.ts`.
    *   Implement `GET`, `POST`, `DELETE` endpoints.
    *   Register routes in `server.ts`.

2.  **Frontend Setup:**
    *   Add types in `frontend/src/types`.
    *   Update `frontend/src/services/api.ts` with new connection and job endpoints.
    *   Add query keys.

3.  **Frontend Components:**
    *   Build `ConnectionCard` and `ConnectionModal`.
    *   Build `JobsList` and `JobStatus` components.
    *   Integrate "Publish" action into `ListingDetails`.

4.  **Verification:**
    *   Test adding a Craigslist "connection" (store creds).
    *   Trigger a job from the UI.
    *   Watch the status update from "Pending" to "Completed/Failed".