# 🕶️ Smart Scout Cyberpunk HUD Specification

## 1. Visual Design Philosophy
*   **Theme:** "High-Tech Scout / Netrunner"
*   **Color Palette:**
    *   **Background:** Deep transparent black (`rgba(10, 10, 20, 0.85)`) with a blur backdrop (`backdrop-filter: blur(12px)`).
    *   **Primary Accent:** Neon Cyan (`#00f3ff`) for active elements and borders.
    *   **Secondary Accent:** Neon Purple (`#bc13fe`) for alerts/matches.
    *   **Success:** Neon Green (`#0aff0a`).
    *   **Text:** White/Silver (`#e0e0e0`) with monospaced font family (`'Courier New', monospace`).
*   **Effects:**
    *   **Glow:** CSS `box-shadow` for glowing borders.
    *   **Scanlines:** Subtle CSS background pattern overlay.
    *   **Pulse:** Breathing animations for the "active" indicator.

## 2. Components

### 2.1 The Dock (Collapsed State)
*   A small, pill-shaped floating element.
*   **Position:** Bottom-Left (fixed).
*   **Content:**
    *   Animated "Eye" icon (pulsing green/cyan).
    *   Text: "SCOUT ONLINE".
    *   Mini-badge: Notification count (if > 0).
*   **Interaction:** Click to expand. Drag to move.

### 2.2 The Main HUD (Expanded State)
*   A rectangular panel expanding from the dock.
*   **Header:**
    *   Title: `[ SYSTEM ACTIVE ]`
    *   Minimize button `[-]`.
*   **Radar Section:**
    *   A circular visual element with a rotating "sweep" animation.
    *   Dots appear on the radar when items are found.
*   **Stats Grid:**
    *   `WATCHLISTS`: [Count] (Green)
    *   `MATCHES`: [Count] (Purple)
*   **Feed (Mini):**
    *   Scrolling list of last 3 matches (Title + Price).
    *   Clicking a match opens the listing.

## 3. Technical Implementation

### 3.1 Content Script (`hud.js`)
*   Injects a Shadow DOM root `#smart-scout-hud-root` to isolate styles.
*   Loads `hud.css`.
*   **State Management:**
    *   Listens to `chrome.storage.onChanged` to update stats in real-time.
    *   Listens to `SCAN_COMPLETE` messages from `facebook-scout.js` to trigger "Radar Ping" effect.

### 3.2 Styles (`hud.css`)
*   Uses CSS Variables for easy theming.
*   Keyframes for `radar-sweep` and `pulse-glow`.

## 4. User Experience
*   **Persistence:** The HUD stays on screen as you navigate.
*   **Feedback:** When a new item is found by the scanner:
    1.  HUD glows Purple.
    2.  Sound effect (optional/configurable).
    3.  "Radar" shows a blip.