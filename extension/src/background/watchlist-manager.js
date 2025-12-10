// Watchlist Monitoring Module
// Uses chrome.alarms API for scheduled checks

const MIN_CHECK_INTERVAL = 15; // minutes
const ALARM_NAME_PREFIX = 'watchlist_check_';

// Initialize alarms for all active watchlist items
export async function initWatchlistAlarms() {
  console.log('Initializing watchlist alarms...');
  
  // Clear any stale alarms on startup
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith(ALARM_NAME_PREFIX)) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  // Set up alarms for active watchlist items
  const { watchlistItems } = await chrome.storage.local.get(['watchlistItems']);
  
  if (watchlistItems && Array.isArray(watchlistItems)) {
    let count = 0;
    for (const item of watchlistItems.filter(w => w.isActive)) {
      scheduleWatchlistCheck(item);
      count++;
    }
    console.log(`Scheduled ${count} watchlist alarms`);
  } else {
    console.log('No watchlist items found to schedule');
  }
}

// Schedule a single watchlist item
export function scheduleWatchlistCheck(watchlistItem) {
  const interval = Math.max(watchlistItem.checkIntervalMinutes || 30, MIN_CHECK_INTERVAL);
  
  chrome.alarms.create(`${ALARM_NAME_PREFIX}${watchlistItem.id}`, {
    periodInMinutes: interval,
    delayInMinutes: 1 // First check after 1 minute
  });
}

// Handle alarm event
export async function handleWatchlistAlarm(alarmName) {
  const watchlistId = alarmName.replace(ALARM_NAME_PREFIX, '');
  
  const { watchlistItems } = await chrome.storage.local.get(['watchlistItems']);
  const watchlist = watchlistItems?.find(w => w.id === watchlistId);
  
  if (!watchlist || !watchlist.isActive) {
    await chrome.alarms.clear(alarmName);
    return;
  }

  console.log(`Checking watchlist: ${watchlist.keywords}`);
  
  // This is where the "Dashboard Tab" strategy comes in
  // We cannot easily fetch FB/CL search results from background due to auth/CORS/complexity
  // Instead, we'll try to find an active tab or notify the user
  
  await checkWatchlistViaDashboardTab(watchlist);
}

async function checkWatchlistViaDashboardTab(watchlist) {
  // Strategy: Look for an existing marketplace tab
  const tabs = await chrome.tabs.query({
    url: watchlist.platforms.includes('facebook') 
      ? '*://*.facebook.com/marketplace/*' 
      : '*://*.craigslist.org/*'
  });

  if (tabs.length > 0) {
    // Send message to content script to check for new items
    // The content script will perform the search/scrape
    console.log(`Delegating check for "${watchlist.keywords}" to tab ${tabs[0].id}`);
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'WATCHLIST_CHECK',
      watchlist
    });
  } else {
    // No active tab - we could:
    // A) Skip this check (safest)
    // B) Open a tab briefly (more aggressive)
    // C) Store for next time user opens marketplace
    
    // For MVP, we go with option A and just log it
    console.log('No marketplace tab open for watchlist check. Skipping.');
  }
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(ALARM_NAME_PREFIX)) {
    handleWatchlistAlarm(alarm.name);
  }
});