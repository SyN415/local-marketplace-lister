# Local Marketplace Lister - Chrome Extension

This extension enables cross-posting from the Local Marketplace Lister dashboard to platforms like Craigslist and Facebook Marketplace.

## Installation (Developer Mode)

1.  **Open Chrome Extensions:**
    *   Navigate to `chrome://extensions/` in your Chrome browser.
2.  **Enable Developer Mode:**
    *   Toggle the switch in the top right corner to ON.
3.  **Load Unpacked:**
    *   Click the "Load unpacked" button in the top left.
    *   Select the `extension/` directory from this project repo.
4.  **Pin Extension:**
    *   Find the puzzle piece icon in your Chrome toolbar and pin "Local Marketplace Lister".

## How to Use

### 1. Connect to Dashboard
The extension automatically detects when you are using the Local Marketplace Lister dashboard (running on `localhost:3000` or production at `*.onrender.com`). It bridges the communication between the web app and the external platforms.

When you login on the dashboard, the extension automatically syncs your authentication token, enabling it to fetch your listings directly.

### 2. Using the Extension Popup

Click the extension icon to access the popup interface:

*   **Your Listings:** A dropdown showing all your listings from the dashboard. Select a listing to prepare it for cross-posting.
*   **Refresh Button:** Click ↻ to reload your listings from the server.
*   **Target Platforms:** Select which platforms to post to (Facebook Marketplace, Craigslist).
*   **Status:** Shows current state - Idle, Ready, Posting, Awaiting Login, Completed, or Error.
*   **Start Posting:** Begin the cross-posting process for the selected listing.
*   **Stop:** Halt current posting operation.
*   **View Logs:** See activity logs for debugging.

### 3. Cross-Posting Flow

**Option A: From the Dashboard**
1.  Go to the **My Listings** page in the dashboard.
2.  Click **"Post"** on a listing.
3.  Select the desired platforms (e.g., Craigslist, Facebook).
4.  The extension will open new tabs for each platform and automate the form-filling process.

**Option B: From the Extension Popup**
1.  Click the extension icon.
2.  Select a listing from the dropdown.
3.  Check the target platforms.
4.  Click "Start Posting".
5.  The extension opens the platform in a new tab.
6.  If login is required, log in and the extension will continue automatically.
7.  Review the filled form and click "Publish" to complete.

### 4. Facebook Marketplace Posting

The extension handles Facebook's login flow:

1.  If you're not logged into Facebook, you'll be redirected to login.
2.  After logging in, the extension detects the redirect and continues.
3.  The form is automatically filled with your listing data.
4.  Review the information and manually select a category if needed.
5.  Click "Publish" to complete the posting.

**Note:** Category selection still requires user interaction due to Facebook's dynamic UI.

## Features

- **Listings Selector:** Browse and select from all your listings in the popup.
- **Auto Token Sync:** Authentication is automatically synced from the dashboard.
- **Login Detection:** Handles Facebook login redirects gracefully.
- **Progress Tracking:** Real-time progress updates during posting.
- **Activity Logs:** Built-in logging for troubleshooting.
- **Multiple Platforms:** Support for Facebook Marketplace and Craigslist.

## Troubleshooting

### "Not authenticated" or "Session expired"
*   **Solution:** Open the dashboard and log in. The extension will automatically sync your auth token.

### "No listings found"
*   **Solution:** Make sure you have created listings on the dashboard. Click the refresh button to reload.

### Facebook form not filling after login
*   **Solution:** The extension monitors for page changes. If it doesn't auto-fill, try:
    1.  Open the extension popup.
    2.  Ensure your listing is selected.
    3.  The extension should detect the marketplace create page and fill automatically.

### "Extension disconnected"
*   **Solution:** Refresh the dashboard page. The extension content script needs to re-inject.

### Content script not loading
*   **Solution:** Go to `chrome://extensions/`, find the extension, and click "Reload". Then refresh the target page.

## Architecture

```
extension/
├── manifest.json           # Extension manifest (MV3)
├── src/
│   ├── background/
│   │   └── service-worker.js   # Background service worker
│   ├── content/
│   │   ├── bridge.js          # Dashboard <-> Extension bridge
│   │   ├── facebook.js        # Facebook Marketplace automation
│   │   └── craigslist.js      # Craigslist automation
│   └── popup/
│       ├── popup.html         # Popup UI
│       ├── popup.js           # Popup logic
│       └── popup.css          # Popup styles
```

## Permissions

- `scripting`: Required for injecting content scripts
- `activeTab`: Access to the currently active tab
- `storage`: Store extension state and cached listings
- `unlimitedStorage`: Store larger amounts of listing data
- `tabs`: Monitor tab navigation for login flow handling
- Host permissions for Facebook, Craigslist, OfferUp, Supabase, and Render

## Version History

### v1.2
- Added listings selector in popup
- Listings fetched from backend API
- Auth token sync from dashboard
- Improved Facebook login flow detection
- Added activity logs viewer
- Better progress tracking
- Enhanced error handling

### v1.1
- Initial Manifest V3 migration
- Basic cross-posting functionality
- Bridge communication with dashboard