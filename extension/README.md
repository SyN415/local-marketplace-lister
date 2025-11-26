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

## Usage Guide

### 1. Connect to Dashboard
The extension automatically detects when you are using the Local Marketplace Lister dashboard (running on `localhost:3000` or production). It bridges the communication between the web app and the external platforms.

### 2. Cross-Posting
1.  Go to the **My Listings** page in the dashboard.
2.  Click **"Post"** on a listing.
3.  Select the desired platforms (e.g., Craigslist, Facebook).
4.  The extension will open new tabs for each platform and automate the form-filling process.

### 3. Extension Popup
Click the extension icon to view:
*   **Status:** Shows if the extension is Idle, Posting, or has an Error.
*   **Queue:** Shows pending posting tasks.
*   **Actions:**
    *   **Start Posting:** Resume or force-start the queue.
    *   **Stop:** Halt current operations.
    *   **Fill Form (Debug):** Manually trigger form filling on the active tab (requires you to be on the correct page).

## Troubleshooting

### "Extension disconnected"
*   **Solution:** Refresh the dashboard page. The extension content script needs to re-inject.

### Changes not appearing
*   **Solution:** If you modify the extension code, you must go to `chrome://extensions/` and click the **Reload** (circular arrow) icon on the extension card, then refresh any open dashboard or platform tabs.

### Image Upload Issues
*   **Note:** The extension uses drag-and-drop simulation. Ensure the browser window is active and not minimized during the posting process for best results.