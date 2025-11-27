document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const connectionStatus = document.getElementById('connectionStatus');
  const queueContainer = document.getElementById('queueContainer');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
  const statusText = document.getElementById('statusText');
  
  const postBtn = document.getElementById('postBtn');
  const stopBtn = document.getElementById('stopBtn');
  const fbCheckbox = document.getElementById('fbCheckbox');
  const clCheckbox = document.getElementById('clCheckbox');
  const openDashboard = document.getElementById('openDashboard');

  let currentListing = null;

  // Initialize UI state
  function init() {
    refreshState();
    
    // Listen for storage changes to update UI in real-time
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        refreshState();
      }
    });

    // Event Listeners
    postBtn.addEventListener('click', startPosting);
    stopBtn.addEventListener('click', stopPosting);
    openDashboard.addEventListener('click', () => {
        // Use production URL if not running locally, or make configurable
        // For now, default to the production URL as requested for the fix
        chrome.tabs.create({ url: 'https://local-marketplace-backend-wr5e.onrender.com/dashboard' });
    });
  }

  // Refresh UI from storage
  function refreshState() {
    chrome.storage.local.get(null, (state) => {
      updateConnectionStatus(state);
      updateQueue(state);
      updateProgress(state);
      updateControls(state);
    });
  }

  function updateConnectionStatus(state) {
    // Determine connection based on whether we have data or last activity
    // For now, if we have listing data, we consider it "connected" to the flow
    const isConnected = !!state.currentListingData;
    connectionStatus.textContent = isConnected ? 'Ready' : 'Idle';
    connectionStatus.className = `connection-status ${isConnected ? 'connected' : ''}`;
  }

  function updateQueue(state) {
    queueContainer.innerHTML = '';
    
    if (state.currentListingData) {
      currentListing = state.currentListingData;
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.innerHTML = `
        <div class="queue-info">
          <span class="queue-title">${escapeHtml(currentListing.title)}</span>
          <span class="queue-price">$${escapeHtml(currentListing.price)}</span>
        </div>
      `;
      queueContainer.appendChild(item);
    } else {
      queueContainer.innerHTML = '<div class="empty-state">No listing loaded</div>';
    }
  }

  function updateProgress(state) {
    if (state.postingStatus === 'posting') {
      progressSection.classList.add('active');
      const percentage = (state.progress.current / state.progress.total) * 100;
      progressBar.style.width = `${percentage}%`;
      statusText.textContent = `Posting to ${state.currentPlatform}...`;
    } else if (state.postingStatus === 'error') {
      progressSection.classList.add('active');
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#ef4444';
      statusText.textContent = `Error: ${state.lastError}`;
    } else {
      progressSection.classList.remove('active');
    }
  }

  function updateControls(state) {
    if (state.postingStatus === 'posting') {
      postBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      fbCheckbox.disabled = true;
      clCheckbox.disabled = true;
    } else {
      postBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      fbCheckbox.disabled = false;
      clCheckbox.disabled = false;
      
      // Enable post button only if we have data
      postBtn.disabled = !state.currentListingData;
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

    if (!currentListing) return;

    // For now, we only support handling one platform trigger at a time in this simple version
    // A more complex queue manager would be needed for sequential multi-platform posting
    const platform = platforms[0]; 

    chrome.runtime.sendMessage({
      action: 'start_posting',
      platform: platform,
      data: currentListing
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        }
    });
  }

  function stopPosting() {
    chrome.runtime.sendMessage({ action: 'stop_posting' });
  }

  // Utility
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  init();
});