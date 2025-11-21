# Debug Resolution Report - 2025-11-21

## 1. Frontend Bug: "Create Listing" Skip Step
**Issue:** Users reported skipping "Step 4 (Images/Finalize)" and going straight to confirmation after "Step 3 (Location)".
**Root Cause:** Race Condition / Double-Click.
The "Next" button on Step 3 and the "Create Listing" button on Step 4 occupied the exact same pixel coordinates. A rapid double-click on "Next" would register the first click to advance the step, and the second click would immediately register on the newly rendered "Create Listing" button, submitting the form prematurely.
**Fix Applied:**
- Added `isNavigating` state lock to `ListingForm.tsx`.
- Implemented a 500ms debounce on the `handleNext` function.
- Disabled buttons while navigation is in progress.

## 2. Database Error: Missing Table
**Issue:** `PGRST205: Could not find the table 'public.posting_jobs'`
**Root Cause:** Migration `20251121000004_cross_posting_tables.sql` exists in the codebase but has not been applied to the production database.

**Action Required:**
Run the following command in your terminal to apply the pending migration:

```bash
# If using Supabase CLI
npx supabase db push

# OR manually run the contents of supabase/migrations/20251121000004_cross_posting_tables.sql
# in the Supabase Dashboard > SQL Editor.
```

## 3. Architecture Advice: Job Service vs. Worker Service
**Current State:** In-app polling (`setInterval` in `server.ts`).

### Comparison
| Feature | In-App Polling (Current) | Dedicated Worker Service |
| :--- | :--- | :--- |
| **Complexity** | Low. Runs inside existing Express server. | Medium. Requires separate deployment/process. |
| **Resource Usage** | Shares CPU/Memory with API. Heavy jobs can slow down API responses. | Independent. can scale separately (e.g., high CPU for image processing). |
| **Scalability** | Limited. If you scale API instances, you risk duplicate job processing without DB locking. | High. Can auto-scale based on queue depth. |
| **Reliability** | Risk of job loss if API crashes/restarts. | Persistent queues (Redis/RabbitMQ) ensure durability. |

### Recommendation
**Stick with the current In-App Polling for the MVP**, but apply these safeguards:
1.  **Database Locking:** Ensure your SQL query uses `FOR UPDATE SKIP LOCKED` (Postgres) so if you spin up a second API instance, they don't process the same job twice.
2.  **Graceful Shutdown:** Ensure the polling loop finishes the current job before the server shuts down.

**Switch to a Worker Service when:**
*   You have > 10 concurrent jobs per minute.
*   Job processing takes > 5 seconds (starts blocking Node.js event loop).
*   You need retry exponential backoff logic (hard to do with simple `setInterval`).