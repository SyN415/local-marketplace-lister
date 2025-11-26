# Implementation Plan: Client-Side Extension for Cross-Listing

This plan details the steps to implement the Chrome Extension-based cross-listing solution.

## Phase 1: Extension Core Refactoring

**Goal:** Transform the PoC extension into a robust automation driver.

### 1. Structure Reorganization
*   **Create Directory Structure:**
    ```
    extension/
    ├── manifest.json       (Update to V3, add host permissions)
    ├── background/
    │   ├── service-worker.js (Main event loop)
    │   └── storage.js        (Helper for local state)
    ├── content/
    │   ├── dashboard-bridge.js (Listens to Dashboard events)
    │   ├── drivers/
    │   │   ├── base.driver.js  (Shared utilities: waitForElement, typeText)
    │   │   ├── facebook.driver.js
    │   │   └── craigslist.driver.js
    │   └── injector.js         (Router to inject correct driver)
    ├── lib/
    │   └── shared-types.js
    └── assets/
        └── icons/
    ```

### 2. Manifest V3 Configuration (`extension/manifest.json`)
*   **Add Permissions:**
    *   `"scripting"`: To inject drivers dynamically.
    *   `"tabs"`: To create/manage tabs.
    *   `"activeTab"`: For user-initiated actions.
    *   `"host_permissions"`:
        *   `"*://*.facebook.com/*"`
        *   `"*://*.craigslist.org/*"`
        *   `"*://localhost/*"` (For local dev dashboard)
        *   `"https://*.supabase.co/*"` (If fetching images directly)
*   **Externally Connectable:**
    *   Allow the dashboard domain (localhost/production) to send messages if using `runtime.sendMessage` (optional, can use window messaging).

### 3. Background Service Worker (`extension/background/service-worker.js`)
*   **Message Listener:** Handle `POST_LISTING` messages.
*   **Job Manager:**
    *   Receive job payload.
    *   Open new tab to target URL (`facebook.com/marketplace/create`).
    *   Store `tabId` -> `jobData` mapping.
    *   Use `chrome.scripting.executeScript` to inject the specific driver when the tab loads.

## Phase 2: Driver Implementation

**Goal:** robust DOM manipulation scripts.

### 1. Base Driver (`extension/content/drivers/base.driver.js`)
*   `waitForSelector(selector, timeout)`: Promise-based waiter.
*   `simulateType(element, text)`: Simulates human typing (input events).
*   `simulateClick(element)`: Simulates mouse events.
*   `uploadFile(inputElement, fileBlob)`: Handles the tricky `DataTransfer` logic for file inputs.

### 2. Facebook Driver (`extension/content/drivers/facebook.driver.js`)
*   **Selectors:** Move away from specific classes. Use ARIA labels and text content (XPath).
*   **Flow:**
    1.  Check for "Login" page. Abort if found.
    2.  Wait for "Item for Sale" form.
    3.  `fillTitle`, `fillPrice`, `fillDescription`.
    4.  `selectCategory` (Complex: needs to search dropdown).
    5.  `handleImageUpload` (Download blob from URL -> Create File -> Dispatch Drop Event).
    6.  `clickPublish`.

### 3. Craigslist Driver (`extension/content/drivers/craigslist.driver.js`)
*   **Flow:**
    1.  Navigate to `post.craigslist.org`.
    2.  Handle "Location Picker" if not pre-selected.
    3.  Select "For Sale By Owner".
    4.  Select Category.
    5.  Fill Form.
    6.  Upload Images.
    7.  Click "Publish".

## Phase 3: Frontend Integration

**Goal:** Connect the React Dashboard to the Extension.

### 1. Extension Detection Hook (`frontend/src/hooks/useExtension.ts`)
*   Check if extension is installed (e.g., extension adds a hidden div to DOM or responds to a ping).
*   Expose `postListing(data)` method.

### 2. UI Updates (`frontend/src/pages/ListingDetails.tsx`)
*   Add "Cross-Post" button.
*   If extension missing -> Show "Install Extension" modal.
*   If present -> Open "Platform Select" modal -> Trigger `postListing`.

### 3. Image Handling
*   Ensure Supabase Storage bucket allows public read (or generate signed URLs) so the extension can fetch the images.

## Phase 4: Backend Cleanup

### 1. Remove Legacy Adapters
*   Deprecate `backend/src/services/adapters/facebook.adapter.ts`.
*   Deprecate `backend/src/services/adapters/craigslist.adapter.ts`.
*   (Optional) Keep `posting_jobs` table for logging history, but update status via API call from the Extension (or have the extension report success to the frontend, which updates the DB).

## Implementation Steps Checklist

1.  [ ] **Scaffold Extension:** Create the new folder structure and `manifest.json`.
2.  [ ] **Implement Background Worker:** Handle message passing and tab creation.
3.  [ ] **Implement Facebook Driver:** Start with simple text fields (Title/Price).
4.  [ ] **Implement Image Upload:** Solve the Blob -> FileInput challenge.
5.  [ ] **Connect Frontend:** Add the message passing logic in React.
6.  [ ] **Test Flow:** Run full end-to-end test (Click Post -> Browser Opens -> Fills Form).
7.  [ ] **Implement Craigslist Driver:** Repeat for CL.