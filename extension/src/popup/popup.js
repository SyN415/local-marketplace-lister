// Dashboard and App URLs
const APP_URL = 'https://local-marketplace-backend-wr5e.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.dataset.tab;
      document.getElementById(`${tabId}Tab`).classList.add('active');
    });
  });

  // UI Elements
  const connectionStatus = document.getElementById('connectionStatus');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const statusText = document.getElementById('statusText');
  
  // Listings elements
  const listingsSelect = document.getElementById('listingsSelect');
  const listingsLoading = document.getElementById('listingsLoading');
  const listingsError = document.getElementById('listingsError');
  const selectedListingPreview = document.getElementById('selectedListingPreview');
  const selectedListingInfo = document.getElementById('selectedListingInfo');
  const noAuthMessage = document.getElementById('noAuthMessage');
  const refreshListingsBtn = document.getElementById('refreshListingsBtn');
  const loginLink = document.getElementById('loginLink');
  
  // Action elements
  const postBtn = document.getElementById('postBtn');
  const stopBtn = document.getElementById('stopBtn');
  const fbCheckbox = document.getElementById('fbCheckbox');
  const clCheckbox = document.getElementById('clCheckbox');
  const openDashboard = document.getElementById('openDashboard');
  const viewLogs = document.getElementById('viewLogs');
  const openWatchlistBtn = document.getElementById('openWatchlistBtn');
  
  // Modal elements
  const logsModal = document.getElementById('logsModal');
  const logsContainer = document.getElementById('logsContainer');
  const closeLogsBtn = document.getElementById('closeLogsBtn');

  // Scout Stats
  const watchlistStats = document.getElementById('watchlistStats');

  let currentListing = null;
  let userListings = [];

  // Initialize UI state
  function init() {
    refreshState();
    loadListings();
    loadScoutStats();
    
    // Listen for storage changes to update UI in real-time
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        refreshState();
        
        // If listings were updated, refresh the dropdown
        if (changes.userListings) {
          populateListingsDropdown(changes.userListings.newValue || []);
        }

        if (changes.watchlistItems) {
            loadScoutStats();
        }
      }
    });

    // Event Listeners
    postBtn.addEventListener('click', startPosting);
    stopBtn.addEventListener('click', stopPosting);
    refreshListingsBtn.addEventListener('click', loadListings);
    listingsSelect.addEventListener('change', handleListingSelection);
    
    openDashboard.addEventListener('click', () => {
      chrome.tabs.create({ url: `${APP_URL}/dashboard` });
    });
    
    loginLink.addEventListener('click', () => {
      chrome.tabs.create({ url: `${APP_URL}/login` });
    });

    if (openWatchlistBtn) {
        openWatchlistBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: `${APP_URL}/watchlist` });
        });
    }
    
    viewLogs.addEventListener('click', showLogsModal);
    closeLogsBtn.addEventListener('click', () => {
      logsModal.style.display = 'none';
    });
  }

  // Scout Stats Logic
  function loadScoutStats() {
    chrome.storage.local.get(['watchlistItems'], (result) => {
        const items = result.watchlistItems || [];
        const activeCount = items.filter(i => i.isActive).length;
        const matches = items.reduce((sum, item) => sum + (item.totalMatches || 0), 0);

        if (watchlistStats) {
            watchlistStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${activeCount}</span>
                    <span class="stat-label">Active Watchlists</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${matches}</span>
                    <span class="stat-label">Total Matches</span>
                </div>
            `;
        }
    });
  }

  // Load listings from storage or fetch from backend
  function loadListings() {
    listingsLoading.style.display = 'flex';
    listingsError.style.display = 'none';
    noAuthMessage.style.display = 'none';
    listingsSelect.disabled = true;

    // First try to load cached listings from storage
    chrome.storage.local.get(['userListings', 'authToken'], (cached) => {
      // Show cached listings immediately if available
      if (cached.userListings && cached.userListings.length > 0) {
        userListings = cached.userListings;
        populateListingsDropdown(userListings);
      }
      
      // If no auth token, show login message
      if (!cached.authToken) {
        listingsLoading.style.display = 'none';
        noAuthMessage.style.display = 'block';
        listingsSelect.style.display = 'none';
        return;
      }
      
      // Try to fetch fresh listings
      try {
        chrome.runtime.sendMessage({ action: 'fetch_listings' }, (response) => {
          listingsLoading.style.display = 'none';
          
          if (chrome.runtime.lastError) {
            console.error('Error fetching listings:', chrome.runtime.lastError);
            // If we have cached listings, just show a warning
            if (userListings.length > 0) {
              console.log('Using cached listings due to fetch error');
            } else {
              showListingsError('Unable to fetch listings. Try refreshing.');
            }
            return;
          }
          
          if (response && response.success) {
            userListings = response.listings || [];
            populateListingsDropdown(userListings);
            noAuthMessage.style.display = 'none';
          } else {
            const error = response?.error || 'Failed to fetch listings';
            if (error.includes('Not authenticated') || error.includes('Session expired')) {
              noAuthMessage.style.display = 'block';
              listingsSelect.style.display = 'none';
            } else if (userListings.length === 0) {
              // Only show error if we have no cached listings
              showListingsError(error);
            }
          }
        });
      } catch (e) {
        listingsLoading.style.display = 'none';
        console.error('Exception sending message:', e);
        if (userListings.length === 0) {
          showListingsError('Extension communication error');
        }
      }
    });
  }

  // Populate the listings dropdown
  function populateListingsDropdown(listings) {
    listingsSelect.innerHTML = '<option value="">-- Select a listing --</option>';
    listingsSelect.style.display = 'block';
    
    if (listings.length === 0) {
      listingsSelect.innerHTML = '<option value="">No listings found</option>';
      listingsSelect.disabled = true;
      return;
    }
    
    listings.forEach((listing, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${escapeHtml(listing.title)} - $${listing.price}`;
      listingsSelect.appendChild(option);
    });
    
    listingsSelect.disabled = false;
  }

  // Handle listing selection from dropdown
  function handleListingSelection(e) {
    const index = e.target.value;
    
    if (index === '') {
      currentListing = null;
      selectedListingPreview.style.display = 'none';
      postBtn.disabled = true;
      return;
    }
    
    const listing = userListings[parseInt(index)];
    if (listing) {
      // Extract zip code from location if present
      const locationStr = listing.location_address || listing.location || '';
      const zipMatch = locationStr.match(/\b\d{5}\b/);
      const zipCode = zipMatch ? zipMatch[0] : listing.zip_code || listing.zipCode || '';
      
      // Extract city from location
      const cityMatch = locationStr.match(/^([^,]+)/);
      const city = cityMatch ? cityMatch[1].trim() : listing.city || '';
      
      // Transform to the format expected by content scripts
      currentListing = {
        title: listing.title,
        price: String(listing.price),
        description: listing.description || '',
        condition: listing.condition || 'good',
        category: listing.category || 'general',
        images: listing.images || [],
        location: locationStr || 'Local',
        // Additional fields for Craigslist
        zipCode: zipCode,
        zip: zipCode,
        city: city,
        neighborhood: listing.neighborhood || '',
        // Optional fields
        make: listing.make || listing.brand || '',
        model: listing.model || '',
        size: listing.size || listing.dimensions || '',
        deliveryAvailable: listing.delivery_available || listing.deliveryAvailable || false
      };
      
      // Save selection to storage
      chrome.runtime.sendMessage({ 
        action: 'select_listing', 
        listing: currentListing 
      });
      
      // Show preview
      selectedListingInfo.innerHTML = `
        <div class="preview-title">${escapeHtml(listing.title)}</div>
        <div class="preview-meta">
          <span>$${escapeHtml(String(listing.price))}</span>
          <span class="separator">•</span>
          <span>${escapeHtml(listing.condition || 'N/A')}</span>
        </div>
        <div class="preview-images">
          ${listing.images && listing.images.length > 0 ?
            `📷 ${listing.images.length} image${listing.images.length > 1 ? 's' : ''}` :
            '📷 No images'
          }
        </div>
      `;
      selectedListingPreview.style.display = 'block';
      postBtn.disabled = false;
    }
  }

  // Show error message for listings
  function showListingsError(message) {
    listingsError.textContent = message;
    listingsError.style.display = 'block';
    listingsSelect.disabled = true;
  }

  // Refresh UI from storage
  function refreshState() {
    chrome.storage.local.get(null, (state) => {
      updateConnectionStatus(state);
      updateProgress(state);
      updateControls(state);
      
      // Restore current listing if exists
      if (state.currentListingData && !currentListing) {
        currentListing = state.currentListingData;
        postBtn.disabled = false;
      }
    });
  }

  function updateConnectionStatus(state) {
    const statusMap = {
      'idle': { text: 'Ready', class: '' },
      'posting': { text: 'Posting', class: 'active' },
      'awaiting_login': { text: 'Login Required', class: 'warning' },
      'completed': { text: 'Complete', class: 'connected' },
      'error': { text: 'Error', class: 'error' }
    };
    
    const status = statusMap[state.postingStatus] || { text: 'Ready', class: '' };
    connectionStatus.textContent = status.text;
    connectionStatus.className = `status-badge ${status.class}`;
  }

  function updateProgress(state) {
    if (state.postingStatus === 'posting' || state.postingStatus === 'awaiting_login') {
      progressSection.classList.add('active');
      const percentage = state.progress?.total > 0
        ? (state.progress.current / state.progress.total) * 100
        : 1;
      progressBar.style.width = `${percentage}%`;
      progressBar.className = 'progress-fill';
      progressPercent.textContent = `${Math.round(percentage)}%`;
      
      if (state.postingStatus === 'awaiting_login') {
        statusText.textContent = `Please login to ${formatPlatformName(state.currentPlatform)}...`;
      } else {
        statusText.textContent = `Posting to ${formatPlatformName(state.currentPlatform)}...`;
      }
    } else if (state.postingStatus === 'error') {
      progressSection.classList.add('active');
      progressBar.style.width = '100%';
      progressBar.className = 'progress-fill error';
      progressPercent.textContent = '!';
      statusText.textContent = state.lastError || 'An error occurred';
    } else if (state.postingStatus === 'completed') {
      progressSection.classList.add('active');
      progressBar.style.width = '100%';
      progressBar.className = 'progress-fill success';
      progressPercent.textContent = '100%';
      statusText.textContent = 'Successfully posted! 🎉';
    } else {
      progressSection.classList.remove('active');
      progressPercent.textContent = '0%';
    }
  }

  function formatPlatformName(platform) {
    const names = {
      'facebook': 'Facebook Marketplace',
      'craigslist': 'Craigslist'
    };
    return names[platform] || platform;
  }

  function updateControls(state) {
    if (state.postingStatus === 'posting' || state.postingStatus === 'awaiting_login') {
      postBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      fbCheckbox.disabled = true;
      clCheckbox.disabled = true;
      listingsSelect.disabled = true;
    } else {
      postBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      fbCheckbox.disabled = false;
      clCheckbox.disabled = false;
      listingsSelect.disabled = userListings.length === 0;
      
      // Enable post button only if we have a listing selected
      postBtn.disabled = !currentListing;
    }
  }

  // Actions
  function startPosting() {
    const platforms = [];
    if (fbCheckbox.checked) platforms.push('facebook');
    if (clCheckbox.checked) platforms.push('craigslist');

    if (platforms.length === 0) {
      statusText.textContent = "Please select at least one platform";
      progressSection.classList.add('active');
      return;
    }

    if (!currentListing) {
      statusText.textContent = "Please select a listing first";
      progressSection.classList.add('active');
      return;
    }

    // For now, we only support handling one platform trigger at a time
    const platform = platforms[0]; 

    chrome.runtime.sendMessage({
      action: 'start_posting',
      platform: platform,
      data: currentListing
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        statusText.textContent = `Error: ${chrome.runtime.lastError.message}`;
      }
    });
  }

  function stopPosting() {
    chrome.runtime.sendMessage({ action: 'stop_posting' });
  }

  // Show logs modal
  function showLogsModal() {
    logsModal.style.display = 'flex';
    logsContainer.innerHTML = '<div class="loading-state">Loading logs...</div>';
    
    chrome.runtime.sendMessage({ action: 'get_logs' }, (response) => {
      if (response && response.logs) {
        if (response.logs.length === 0) {
          logsContainer.innerHTML = '<div class="empty-state">No logs yet</div>';
          return;
        }
        
        logsContainer.innerHTML = response.logs.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          const levelClass = log.level === 'error' ? 'log-error' : 
                            log.level === 'warn' ? 'log-warn' : 'log-info';
          return `<div class="log-entry ${levelClass}">
            <span class="log-time">${time}</span>
            <span class="log-message">${escapeHtml(log.message)}</span>
          </div>`;
        }).reverse().join('');
      } else {
        logsContainer.innerHTML = '<div class="error-state">Failed to load logs</div>';
      }
    });
  }

  // Utility
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  init();
});