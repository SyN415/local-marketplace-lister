document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const connectionStatus = document.getElementById('connectionStatus');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
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
  
  // Modal elements
  const logsModal = document.getElementById('logsModal');
  const logsContainer = document.getElementById('logsContainer');
  const closeLogsBtn = document.getElementById('closeLogsBtn');

  let currentListing = null;
  let userListings = [];

  // Initialize UI state
  function init() {
    refreshState();
    loadListings();
    
    // Listen for storage changes to update UI in real-time
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        refreshState();
        
        // If listings were updated, refresh the dropdown
        if (changes.userListings) {
          populateListingsDropdown(changes.userListings.newValue || []);
        }
      }
    });

    // Event Listeners
    postBtn.addEventListener('click', startPosting);
    stopBtn.addEventListener('click', stopPosting);
    refreshListingsBtn.addEventListener('click', loadListings);
    listingsSelect.addEventListener('change', handleListingSelection);
    
    openDashboard.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://local-marketplace-backend-wr5e.onrender.com/dashboard' });
    });
    
    loginLink.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://local-marketplace-backend-wr5e.onrender.com/login' });
    });
    
    viewLogs.addEventListener('click', showLogsModal);
    closeLogsBtn.addEventListener('click', () => {
      logsModal.style.display = 'none';
    });
  }

  // Load listings from storage or fetch from backend
  function loadListings() {
    listingsLoading.style.display = 'flex';
    listingsError.style.display = 'none';
    noAuthMessage.style.display = 'none';
    listingsSelect.disabled = true;

    chrome.runtime.sendMessage({ action: 'fetch_listings' }, (response) => {
      listingsLoading.style.display = 'none';
      
      if (chrome.runtime.lastError) {
        console.error('Error fetching listings:', chrome.runtime.lastError);
        showListingsError('Failed to communicate with extension');
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
        } else {
          showListingsError(error);
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
      // Transform to the format expected by content scripts
      currentListing = {
        title: listing.title,
        price: String(listing.price),
        description: listing.description || '',
        condition: listing.condition || 'good',
        category: listing.category || 'general',
        images: listing.images || [],
        location: listing.location_address || listing.location || 'Local'
      };
      
      // Save selection to storage
      chrome.runtime.sendMessage({ 
        action: 'select_listing', 
        listing: currentListing 
      });
      
      // Show preview
      selectedListingInfo.innerHTML = `
        <div class="preview-title">${escapeHtml(listing.title)}</div>
        <div class="preview-meta">$${escapeHtml(String(listing.price))} · ${escapeHtml(listing.condition || 'N/A')}</div>
        ${listing.images && listing.images.length > 0 ? 
          `<div class="preview-images">${listing.images.length} image(s)</div>` : 
          '<div class="preview-images">No images</div>'
        }
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
      'posting': { text: 'Posting...', class: 'active' },
      'awaiting_login': { text: 'Awaiting Login', class: 'warning' },
      'completed': { text: 'Completed', class: 'connected' },
      'error': { text: 'Error', class: 'error' }
    };
    
    const status = statusMap[state.postingStatus] || { text: 'Idle', class: '' };
    connectionStatus.textContent = status.text;
    connectionStatus.className = `connection-status ${status.class}`;
  }

  function updateProgress(state) {
    if (state.postingStatus === 'posting' || state.postingStatus === 'awaiting_login') {
      progressSection.classList.add('active');
      const percentage = state.progress?.total > 0 
        ? (state.progress.current / state.progress.total) * 100 
        : 1;
      progressBar.style.width = `${percentage}%`;
      progressBar.style.backgroundColor = '#3b82f6';
      
      if (state.postingStatus === 'awaiting_login') {
        statusText.textContent = `Please login to ${state.currentPlatform}...`;
      } else {
        statusText.textContent = `Posting to ${state.currentPlatform}... ${Math.round(percentage)}%`;
      }
    } else if (state.postingStatus === 'error') {
      progressSection.classList.add('active');
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#ef4444';
      statusText.textContent = `Error: ${state.lastError || 'Unknown error'}`;
    } else if (state.postingStatus === 'completed') {
      progressSection.classList.add('active');
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#22c55e';
      statusText.textContent = 'Posting completed!';
    } else {
      progressSection.classList.remove('active');
    }
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