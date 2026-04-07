(function(window) {
  'use strict';
  const isLocalEnvironment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.port === '5500' ||
                             window.location.protocol === 'file:';
  
  const REACT_APP_URL = isLocalEnvironment 
    ? 'http://localhost:5173' 
    : 'https://app-frontend-webperso-dev-taetd6ptyxspw.azurewebsites.net';
  
  const API_URL = isLocalEnvironment
    ? 'http://localhost:8000'
    : 'https://app-backend-webperso-dev-taetd6ptyxspw.azurewebsites.net';
  

  const MindContent = {
    version: '2.0.4',
    config: {
      reactAppUrl: REACT_APP_URL,
      apiUrl: API_URL,  // Add API_URL to config for tracking data fetching
      containerId: 'mindcontent',
      pageUrl: null,
      autoInit: true,
      trackingOnly: false  // Will be set to true if no div#mindcontent found
    },
    iframe: null,
    container: null,
    toggleButton: null,
    sidebarOpen: false,
    messageHandler: null,
    websocketClosed: false,
    pageNotConfigured: false,  // Flag to stop all operations when page is not configured
    pageIsConfigured: false,  // True if page exists in pageconfig database
    sessionStart: null,
    lastSentTimestamp: 0,
    sessionId: null,
    
    // 🗺️ Heatmap tracking
    mousePositionBuffer: [],
    lastHeatmapSend: Date.now(),
    mouseMoveTimeout: null,
    heatmapSendInterval: null,
    HEATMAP_BATCH_SIZE: 100,
    HEATMAP_SEND_INTERVAL: 15000,  // 15 seconds
    
    userBehavior: {
      totalClicks: 0,
      totalHovers: 0,
      recentInteractions: [],
      recentHovers: [],
      scrollPattern: [],
      textSelections: [],
      lastActivityTime: null,
      previousPage: null,
      userAgent: null,
      screenResolution: null,
      timezone: null,
      language: null,
      ip: null,
      country: null,
      city: null
    },

    // Check if content should be displayed based on div#mindcontent presence
    shouldDisplayContent: function() {
      const container = document.getElementById(this.config.containerId);
      const shouldDisplay = container !== null;
      return shouldDisplay;
    },

    // Check if we should show the intent modal
    shouldShowIntentModal: async function() {
      // First, check if localStorage already has the required data
      const hasStoredIntent = localStorage.getItem('mindcontent_simulated_intent');
      const hasStoredUser = localStorage.getItem('mindcontent_selected_user');
      const hasStoredConsent = localStorage.getItem('mindcontent_ai_consent');
      
      const hasLocalStorageData = hasStoredIntent && hasStoredUser && hasStoredConsent;
      
      // Check if page is configured in pageconfig database
      const pageUrl = this.config.pageUrl || (window.location.origin + window.location.pathname);
      
      try {
        const apiUrl = `${API_URL}/api/pages/check-config?page_url=${encodeURIComponent(pageUrl)}`;
        
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          const isPageConfigured = data.is_configured || false;
          
          // If page is configured, only show modal if localStorage is empty
          if (isPageConfigured) {
            const shouldShow = !hasLocalStorageData;
            return shouldShow;
          } else {
            // Page not configured - always show modal
            return true;
          }
        } else {
          // API error - default to showing modal
          return true;
        }
      } catch (error) {
        // On error, default to showing modal
        return true;
      }
    },

    init: async function(options) {
      this.config = { ...this.config, ...options };
      
      // First, check if page is configured
      await this.checkIfPageIsConfigured();
      
      // Only show intent modal if div#mindcontent exists
      if (this.shouldDisplayContent()) {
        this.config.trackingOnly = false;
        
        // Check if page is configured and localStorage status
        try {
          const shouldShowModal = await this.shouldShowIntentModal();
          if (shouldShowModal) {
            this.showIntentModal();
          }
        } catch (error) {
          this.showIntentModal();
        }
      } else {
        this.config.trackingOnly = true;
      }
      
      // Always continue initialization regardless of modal
      this.continueInit();
    },

    // Check if page is configured in database
    checkIfPageIsConfigured: async function() {
      const pageUrl = this.config.pageUrl || (window.location.origin + window.location.pathname);
      
      try {
        const apiUrl = `${API_URL}/api/pages/check-config?page_url=${encodeURIComponent(pageUrl)}`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          this.pageIsConfigured = data.is_configured || false;
        } else {
          this.pageIsConfigured = false;
        }
      } catch (error) {
        console.error('[MindContent SDK] Error checking page configuration:', error);
        this.pageIsConfigured = false;
      }
    },
    
    showIntentModal: function() {
      if (!document.body) {
        setTimeout(() => this.showIntentModal(), 100);
        return;
      }
      
      const possibleIntents = [
        'Learn about the product',
        'Compare pricing options',
        'Find technical documentation',
        'Get support help',
        'Explore features',
        'Read customer reviews',
        'Download resources',
        'Contact sales team',
        'Start free trial',
        'Watch product demo'
      ];
      
      const randomIntent = possibleIntents[Math.floor(Math.random() * possibleIntents.length)];
      this.config.simulatedIntent = randomIntent;
      
      // Start with anonymous user only - load real users in background
      let usersOptions = '<option value="anonymous">Anonymous User</option>';
      
      const modalHTML = `
        <div id="mindcontent-intent-modal">
          <div class="mc-modal-container">
            <div class="mc-modal-grid">
              <div class="mc-modal-column">
                <div class="mc-modal-title">AI-Powered Experience</div>
                <div class="mc-modal-subtitle">Proof of Concept</div>
                <div class="mc-modal-description">This is a <strong>proof of concept</strong> demonstrating real-time AI interactions. 
                You'll be assigned a suggested intent below. Please navigate through the page naturally 
                so we can observe how AI adapts to your behavior and provides contextual content.</div>
                <div class="mc-modal-intent-box">
                  <div class="mc-modal-intent-label">Your Suggested Intent</div>
                  <div class="mc-modal-intent-text">${randomIntent}</div>
                </div>
              </div>
              <div class="mc-modal-right-column">
                <div>
                  <label class="mc-modal-select-label">Select User Profile</label>
                  <select id="mindcontent-user-select">
                    ${usersOptions}
                  </select>
                  <div class="mc-modal-consent-box">
                    <label class="mc-modal-consent-label">
                      <input type="checkbox" id="mindcontent-ai-consent" class="mc-modal-consent-checkbox"/>
                      <span class="mc-modal-consent-text">
                        <strong>I consent to AI-powered interactions</strong><br>
                        <span class="mc-modal-consent-subtext">
                          I understand this is a demonstration and my interactions will be analyzed by AI 
                          to provide personalized content recommendations in real-time.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
                <button id="mindcontent-intent-start-btn" disabled>Start Experience</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      console.log('[MindContent SDK] ✅ Modal HTML injected into DOM');
      
      const startBtn = document.getElementById('mindcontent-intent-start-btn');
      const consentCheckbox = document.getElementById('mindcontent-ai-consent');
      const userSelect = document.getElementById('mindcontent-user-select');
      
      console.log('[MindContent SDK] Modal elements:', { startBtn, consentCheckbox, userSelect });
      
      const self = this;
      let loadedUsers = []; // Store loaded users
      
      userSelect.addEventListener('change', async (e) => {
        const selectedUserId = e.target.value;
        
        if (selectedUserId !== 'anonymous') {
          await self.fetchUserPurchases(selectedUserId);
        } else {
          self.config.currentUser = null;
          self.config.userPurchases = [];
          self.config.totalPurchases = 0;
        }
      });
      
      consentCheckbox.addEventListener('change', (e) => {
        startBtn.disabled = !e.target.checked;
      });
      
      // Load users in background (don't block modal display)
      (async () => {
        try {
          console.log('🔵 [MODAL] Fetching users from:', `${API_URL}/api/users`);
          const response = await fetch(`${API_URL}/api/users`);
          
          console.log('🔵 [MODAL] Response status:', response.status, response.statusText);
          console.log('🔵 [MODAL] Response ok:', response.ok);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [MODAL] Failed to fetch users:', response.status, errorText);
            return;
          }
          
          const data = await response.json();
          console.log('🔵 [MODAL] Response data:', data);
          console.log('🔵 [MODAL] Users array:', data.users);
          console.log('🔵 [MODAL] Users count:', data.users ? data.users.length : 0);
          
          if (data.error) {
            console.error('❌ [MODAL] API returned error:', data.error);
            return;
          }
          
          if (data.users && data.users.length > 0) {
            console.log('✅ [MODAL] Adding', data.users.length, 'users to dropdown');
            loadedUsers = data.users; // Store users for later
            // Update the select dropdown with real users
            const additionalOptions = data.users.map(user => {
              console.log('  - Adding user:', user.full_name, user.user_id);
              return `<option value="${user.user_id}">${user.full_name} (${user.city}, ${user.country})</option>`;
            }).join('');
            userSelect.innerHTML += additionalOptions;
            console.log('✅ [MODAL] Dropdown updated successfully');
          } else {
            console.warn('⚠️ [MODAL] No users found in response');
          }
        } catch (error) {
          console.error('❌ [MODAL] Error loading users:', error);
          console.error('❌ [MODAL] Error stack:', error.stack);
        }
      })();
      
      // Start button click handler
      startBtn.addEventListener('click', async () => {
        if (startBtn.disabled) return;
        
        const selectedUserId = userSelect.value;
        
        let loggedUserData = null;
        
        // Save logged user data if not anonymous
        if (selectedUserId !== 'anonymous') {
          const userData = loadedUsers.find(u => String(u.user_id) === String(selectedUserId));
          if (userData) {
            loggedUserData = {
              user_id: userData.user_id,
              full_name: userData.full_name,
              city: userData.city,
              country: userData.country
            };
            localStorage.setItem('mindcontent_logged_user', JSON.stringify(loggedUserData));
          }
        } else {
          // Clear user data when anonymous
          localStorage.removeItem('mindcontent_logged_user');
          localStorage.removeItem('mindcontent_user_purchases');
        }
        
        localStorage.setItem('mindcontent_simulated_intent', randomIntent);
        localStorage.setItem('mindcontent_selected_user', selectedUserId);
        localStorage.setItem('mindcontent_ai_consent', 'true');
        
        const modal = document.getElementById('mindcontent-intent-modal');
        if (modal) {
          modal.remove();
        }
        
        // Notify iframe of selectedUserId change and logged user data
        const realUserId = (selectedUserId && selectedUserId !== 'anonymous') ? selectedUserId : null;
        if (self.iframe && self.iframe.contentWindow) {
          self.iframe.contentWindow.postMessage({
            type: 'update_selected_user',
            selectedUserId: realUserId
          }, self.config.reactAppUrl);
          
          // Send logged user data to iframe (since localStorage is origin-isolated)
          if (loggedUserData) {
            self.iframe.contentWindow.postMessage({
              type: 'LOGGED_USER_DATA',
              data: loggedUserData
            }, self.config.reactAppUrl);
          } else {
            // Clear both user and purchases when anonymous
            self.iframe.contentWindow.postMessage({
              type: 'LOGGED_USER_DATA',
              data: null
            }, self.config.reactAppUrl);
            self.iframe.contentWindow.postMessage({
              type: 'USER_PURCHASES',
              data: null
            }, self.config.reactAppUrl);
          }
        }
        
        if (selectedUserId !== 'anonymous' && self.config.currentUser) {
          setTimeout(() => {
            self.sendUserPurchasesToReact();
          }, 500);
        }
      });
    },
    
    fetchUserPurchases: async function(userId) {
      const self = this;
      try {
        const loadStart = performance.now();
        const response = await fetch(`${API_URL}/api/users/${userId}/purchases`);
        
        if (response.ok) {
          const data = await response.json();
          const loadEnd = performance.now();
          const loadTime = Math.round(loadEnd - loadStart);
          
          if (data.user && data.user.full_name) {
            self.config.currentUser = data.user;
            self.config.userPurchases = data.purchases || [];
            self.config.totalPurchases = data.total_purchases || 0;
            self.config.purchasesLoadTime = loadTime;
            self.config.purchasesTiming = data.timing || null;
            return true;
          } else {
            self.config.currentUser = null;
            self.config.userPurchases = [];
            self.config.totalPurchases = 0;
            self.config.purchasesLoadTime = 0;
            self.config.purchasesTiming = null;
            return false;
          }
        } else {
          self.config.currentUser = null;
          self.config.userPurchases = [];
          self.config.totalPurchases = 0;
          self.config.purchasesLoadTime = 0;
          self.config.purchasesTiming = null;
          return false;
        }
      } catch (error) {
        return false;
      }
    },
    
    // DEPRECATED: This function is no longer used in tracking-only mode
    // Tracking data is now sent automatically via WebSocket in both normal and tracking-only modes
    // Kept for reference only
    // Fetch and send tracking-only data (user info + visits)
    // Used ONLY in tracking-only mode (pages without div#mindcontent, no WebSocket)
    // In normal mode, tracking data comes via WebSocket (tracking_data_loaded event)
    fetchAndSendTrackingData: async function() {
      // Always send tracking data if page is configured, regardless of trackingOnly mode
      if (!this.pageIsConfigured || !this.iframe || this.pageNotConfigured) {
        return;
      }
      
      const userId = this.config.userId;
      const API_URL = this.config.apiUrl;
      
      try {
        // Fetch user info and visits in parallel
        const [userInfoRes, visitsRes] = await Promise.all([
          fetch(`${API_URL}/api/users/info/${userId}`),
          fetch(`${API_URL}/api/visits/user/${userId}?limit=20`)
        ]);
        
        const userData = userInfoRes.ok ? await userInfoRes.json() : null;
        const visitsData = visitsRes.ok ? await visitsRes.json() : null;
        
        // Send tracking data to sidebar
        if (userData || visitsData) {
          this.sendMessage({
            type: 'TRACKING_DATA',
            data: {
              user: userData?.user || null,
              visits: visitsData?.visits || [],
              totalVisits: visitsData?.count || 0
            }
          });
          
          console.log('[MindContent SDK] 📊 Tracking data sent to sidebar:', {
            hasUser: !!userData?.user,
            visitCount: visitsData?.count || 0
          });
        }
      } catch (error) {
        console.error('[MindContent SDK] ❌ Error fetching tracking data:', error);
      }
    },
    
    sendUserPurchasesToReact: function() {
      if (!this.config.currentUser || !this.iframe) {
        return;
      }
      
      const purchasesData = {
        user: this.config.currentUser,
        purchases: this.config.userPurchases || [],
        totalPurchases: this.config.totalPurchases || 0,
        loadTime: this.config.purchasesLoadTime || 0,
        timing: this.config.purchasesTiming || null
      };
      
      // Save purchases to SDK's localStorage
      localStorage.setItem('mindcontent_user_purchases', JSON.stringify(purchasesData));
      
      const iframe = document.getElementById('mindcontent-iframe');
      
      if (iframe && iframe.contentWindow) {
        const payload = {
          type: 'USER_PURCHASES',
          data: purchasesData
        };
        
        iframe.contentWindow.postMessage(payload, this.config.reactAppUrl);
      }
    },
    
    // Session ID management
    getOrCreateSessionId: function() {
      if (this.sessionId) {
        return this.sessionId;
      }
      
      // Try to get from sessionStorage (persists within browser tab)
      let sessionId = sessionStorage.getItem('mindcontent_session_id');
      
      if (!sessionId) {
        // Create new session ID
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('mindcontent_session_id', sessionId);
      }
      
      this.sessionId = sessionId;
      return sessionId;
    },
    
    // Track page visit
    trackPageVisit: async function() {
      try {
        const sessionId = this.getOrCreateSessionId();
        const userId = localStorage.getItem('user_id');
        
        // Get previous page URL from multiple sources (in order of priority)
        let previousPageUrl = null;
        
        // 1. Try document.referrer (works for external links and some internal navigation)
        if (document.referrer && document.referrer !== window.location.href) {
          previousPageUrl = document.referrer;
        } 
        // 2. Fallback to last visited page stored in sessionStorage (for internal navigation)
        else {
          previousPageUrl = sessionStorage.getItem('mindcontent_last_page') || null;
        }
        
        const visitData = {
          user_id: userId,
          session_id: sessionId,
          page_url: window.location.href,
          previous_page_url: previousPageUrl,
          user_agent: navigator.userAgent
        };
                
        // Store current page as "last page" for next navigation BEFORE tracking
        // This ensures the next page load will have this value available
        sessionStorage.setItem('mindcontent_last_page', window.location.href);
        
        const response = await fetch(`${API_URL}/api/visits/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(visitData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('[MindContent SDK] ✅ Page visit tracked:', result);
        } else {
          console.warn('[MindContent SDK] ⚠️ Failed to track page visit:', response.status);
        }
      } catch (error) {
        console.error('[MindContent SDK] ❌ Error tracking page visit:', error);
      }
    },
    
    continueInit: function() {
      
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        if (window.crypto && window.crypto.randomUUID) {
          userId = crypto.randomUUID();
        } else {
          userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        localStorage.setItem('user_id', userId);
      }
      this.config.userId = userId;
    
      if (!this.config.pageUrl) {
        this.config.pageUrl = window.location.origin + window.location.pathname;
      }
      
      this.sessionStart = Date.now();
      this.userBehavior.previousPage = document.referrer || 'Direct';
      this.userBehavior.userAgent = navigator.userAgent;
      this.userBehavior.screenResolution = `${window.screen.width}x${window.screen.height}`;
      this.userBehavior.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.userBehavior.language = navigator.language || navigator.userLanguage;
      this.userBehavior.lastActivityTime = Date.now();
      
      // Always track page visits
      this.trackPageVisit();
      // this.updateBatteryInfo();
      this.updateGeolocationData();
      this.startBehaviorTracking();
      this.startMouseTracking();  // 🗺️ Start heatmap tracking
      
      // Only embed React app if div#mindcontent exists
      if (this.shouldDisplayContent() && this.config.autoInit) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.embedReactApp();
          });
        } else {
          this.embedReactApp();
        }
      } else {
        // Still create sidebar button for tracking-only mode
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.createToggleButton();
            this.createSidebarIframe();
          });
        } else {
          this.createToggleButton();
          this.createSidebarIframe();
        }
      }
    },

    // Create sidebar iframe without main content
    createSidebarIframe: function() {
      
      const iframe = document.createElement('iframe');
      iframe.id = 'mindcontent-iframe';
      const iframeUrl = `${this.config.reactAppUrl}/embed`;
      
      iframe.src = iframeUrl;
      iframe.setAttribute('allowtransparency', 'true');
      
      iframe.onload = () => {
        this.iframe = iframe;
        // Fade-in suave após carregamento para evitar piscar
        setTimeout(() => {
          iframe.classList.add('mc-loaded');
        }, 100);
        this.setupCommunication();
        this.startScrollTracking();
      };
      
      iframe.onerror = (e) => {
        console.error('[MindContent SDK] Error loading sidebar iframe:', e);
      };
      
      document.body.appendChild(iframe);
    },

    embedReactApp: function() {
      let container = document.getElementById(this.config.containerId);
      if (!container) {
        return;
      }
      
      this.container = container;
      
      const iframe = document.createElement('iframe');
      iframe.id = 'mindcontent-iframe';
      const iframeUrl = `${this.config.reactAppUrl}/embed`;
      
      iframe.src = iframeUrl;
      iframe.setAttribute('allowtransparency', 'true');
      
      iframe.onload = () => {
        this.iframe = iframe;
        // Fade-in suave após carregamento para evitar piscar
        setTimeout(() => {
          iframe.classList.add('mc-loaded');
        }, 100);
        this.setupCommunication();
        this.startScrollTracking();
      };
      
      iframe.onerror = (e) => {
        console.error('[MindContent SDK] Error loading iframe:', e);
      };
      
      document.body.appendChild(iframe);
      this.createToggleButton();
    },

    createToggleButton: function() {
      const button = document.createElement('button');
      button.id = 'mindcontent-toggle-btn';
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 3V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 8L16.5 10.5L14 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span id="mindcontent-status-indicator"></span>
      `;
      
      button.addEventListener('click', () => {
        this.toggleSidebar();
      });
      
      document.body.appendChild(button);
      this.toggleButton = button;
    },

    toggleSidebar: function() {
      this.sidebarOpen = !this.sidebarOpen;
      
      if (this.iframe) {
        if (this.sidebarOpen) {
          this.iframe.classList.add('mc-sidebar-open');
        } else {
          this.iframe.classList.remove('mc-sidebar-open');
        }
      }
      
      this.sendMessage({
        type: 'toggle_sidebar',
        isOpen: this.sidebarOpen
      });
    },

    updateButtonStatus: function(status) {
      if (!this.toggleButton) return;
      
      const indicator = this.toggleButton.querySelector('#mindcontent-status-indicator');
      if (!indicator) return;
      
      // Remove all status classes
      indicator.classList.remove('mc-status-connected', 'mc-status-completed');
      
      // Add appropriate status class
      if (status === 'Connected') {
        indicator.classList.add('mc-status-connected');
      } else if (status === 'Completed') {
        indicator.classList.add('mc-status-completed');
      }
      // Default (disconnected) has no extra class
    },

    setupCommunication: function() {
      if (!this.iframe) return;
      
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
      }
      
      this.messageHandler = (event) => {
        const message = event.data;
        
        const validTypes = ['mindcontent_ready', 'mindcontent_log', 'mindcontent_component', 'mindcontent_loading', 'mindcontent_remove_loading', 'initial_decision', 'mindcontent_websocket_closed', 'mindcontent_status_update', 'sidebar_opened', 'sidebar_closed', 'mindcontent_page_not_configured', 'reset_experience'];
        if (!message || !message.type || !validTypes.includes(message.type)) {
          return;
        }
        
        const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
        const isExpectedOrigin = event.origin.startsWith(this.config.reactAppUrl);
        
        if (!isLocalhost && !isExpectedOrigin) {
          return;
        }
        
        if (message.type === 'reset_experience') {
          // Clear all storage and reload the parent page
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
          return;
        } else if (message.type === 'mindcontent_page_not_configured') {
          // Page not configured - stop all tracking operations
          console.warn('[MindContent SDK] ⚠️ Page not configured:', message.page_url);
          this.pageNotConfigured = true;
          // Don't send any tracking data or scroll events
          return;
        } else if (message.type === 'mindcontent_websocket_closed') {
          this.websocketClosed = true;
          this.removeAllLoadingPlaceholders();
        } else if (message.type === 'mindcontent_status_update') {
          this.updateButtonStatus(message.status);
        } else if (message.type === 'sidebar_opened' || message.type === 'sidebar_closed') {
          this.sidebarOpen = message.type === 'sidebar_opened';
          
          if (this.iframe) {
            if (this.sidebarOpen) {
              this.iframe.classList.add('mc-sidebar-open');
            } else {
              this.iframe.classList.remove('mc-sidebar-open');
            }
          }
        } else if (message.type === 'mindcontent_remove_all_loading') {
          this.removeAllLoadingPlaceholders();
        } else if (message.type === 'mindcontent_remove_loading') {
          this.removeLoadingPlaceholder(message.loadingId);
        } else if (message.type === 'mindcontent_ready') {
          // Get selectedUserId from localStorage to pass to iframe
          const selectedUserId = localStorage.getItem('mindcontent_selected_user');
          const realUserId = (selectedUserId && selectedUserId !== 'anonymous') ? selectedUserId : null;
          
          this.sendMessage({
            type: 'config',
            data: {
              pageUrl: this.config.pageUrl,
              userId: this.config.userId,
              selectedUserId: realUserId,  // Pass selected user for session data
              trackingOnly: this.config.trackingOnly  // Tell React app to skip AI/WebSocket/Contentful
            }
          });
          
          // Send logged user data to iframe if it exists (cross-origin localStorage sync)
          const loggedUserJson = localStorage.getItem('mindcontent_logged_user');
          if (loggedUserJson) {
            try {
              const loggedUserData = JSON.parse(loggedUserJson);
              this.sendMessage({
                type: 'LOGGED_USER_DATA',
                data: loggedUserData
              });
            } catch (e) {
              console.error('❌ [SDK] Failed to parse logged user data:', e);
            }
          }
          
          // Send purchases data to iframe if it exists (cross-origin localStorage sync)
          const purchasesJson = localStorage.getItem('mindcontent_user_purchases');
          if (purchasesJson) {
            try {
              const purchasesData = JSON.parse(purchasesJson);
              this.sendMessage({
                type: 'USER_PURCHASES',
                data: purchasesData
              });
            } catch (e) {
              console.error('❌ [SDK] Failed to parse purchases data:', e);
            }
          }
          
          // Note: In trackingOnly mode, tracking data is now sent automatically via WebSocket
          // No need for REST API call anymore - WebSocket handles it in both modes
        } else if (message.type === 'mindcontent_log') {
        } else if (message.type === 'mindcontent_component') {
          
          this.injectComponent(message.component);
        } else if (message.type === 'mindcontent_loading') {
          this.injectLoadingPlaceholder(message.loadingId);
        } else if (message.type === 'initial_decision') {
          const initial = {
            content_id: message.content_id ?? message.decision ?? null,
            reasoning: message.reasoning ?? null,
            timestamp: message.timestamp,
            thread_id: message.thread_id
          };

          if (this.config.onInitialDecision && typeof this.config.onInitialDecision === 'function') {
            this.config.onInitialDecision(initial);
          }
        }
      };
      
      window.addEventListener('message', this.messageHandler);
      this.sendMessage({ type: 'sdk_ready' });
    },

    injectLoadingPlaceholder: function(loadingId) {
      const targetContainer = document.getElementById(this.config.containerId);
      
      if (!targetContainer) {
        return;
      }

      const loadingDiv = document.createElement('div');
      loadingDiv.setAttribute('data-loading-id', loadingId);
      loadingDiv.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#667eea" stroke-width="4" stroke-dasharray="31.4 31.4" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;

      targetContainer.appendChild(loadingDiv);
    },

    removeAllLoadingPlaceholders: function() {
      const targetContainer = document.getElementById(this.config.containerId);
      if (!targetContainer) return;
      
      const loadingDivs = targetContainer.querySelectorAll('[data-loading-id]');
      
      loadingDivs.forEach(div => {
        div.remove();
      });
    },

    removeLoadingPlaceholder: function(loadingId) {
      if (!loadingId) return;
      const loadingDiv = document.querySelector(`[data-loading-id="${loadingId}"]`);
      if (loadingDiv) {
        loadingDiv.remove();
      }
    },

    injectComponent: function(component) {
      
      // 🔧 CRITICAL: Always try to remove loading placeholder, even if loadingId is missing
      if (component.loadingId) {
        const loadingDiv = document.querySelector(`[data-loading-id="${component.loadingId}"]`);
        if (loadingDiv) {
          loadingDiv.remove();
          console.log(`✅ [SDK] Removed loading placeholder: ${component.loadingId}`);
        }
      } else {
        // Remove ANY loading placeholder if no specific loadingId
        const anyLoading = document.querySelector('[data-loading-id]');
        if (anyLoading) {
          anyLoading.remove();
          console.log(`✅ [SDK] Removed orphaned loading placeholder (no loadingId in component)`);
        }
      }
      
      const targetContainer = document.getElementById(this.config.containerId);
      
      if (!targetContainer) {
        console.error(`❌ [SDK] Target container #${this.config.containerId} not found! Cannot inject component.`);
        return;
      }

      const componentHtml = this.renderComponent(component);
      
      const wrapper = document.createElement('div');
      wrapper.className = 'mc-dynamic-component';
      wrapper.setAttribute('data-component-id', component.id);
      wrapper.style.position = 'relative';
      
      // 🗺️ Add attributes for heatmap component tracking
      if (component.componentType) {
        wrapper.setAttribute('data-component-type', component.componentType);
      }
      if (component.dbId) {
        wrapper.setAttribute('data-db-id', component.dbId);
      }
      // Calculate order based on existing components
      const existingComponents = targetContainer.querySelectorAll('[data-component-id]');
      wrapper.setAttribute('data-order', existingComponents.length.toString());
      
      // Always show component info and tags area
      const tagsContainer = document.createElement('div');
      tagsContainer.style.cssText = 'position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; flex-wrap: nowrap; justify-content: flex-end; z-index: 10;';
      
      // Component ID badge
      if (component.id) {
        const idBadge = document.createElement('span');
        idBadge.style.cssText = 'background-color: #17a2b8; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap;';
        idBadge.textContent = component.id;
        tagsContainer.appendChild(idBadge);
      }
      
      // Component type badge
      if (component.componentType) {
        const typeBadge = document.createElement('span');
        typeBadge.style.cssText = 'background-color: #28a745; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap;';
        typeBadge.textContent = component.componentType;
        tagsContainer.appendChild(typeBadge);
      }
      
      // Component slug badge (check multiple possible field names)
      const slugValue = component.slug || component.Slug || component.name || component.Name;
      if (slugValue) {
        const slugBadge = document.createElement('span');
        slugBadge.style.cssText = 'background-color: #6f42c1; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap;';
        slugBadge.textContent = slugValue;
        tagsContainer.appendChild(slugBadge);
      }
      
      // Tags badges
      if (component.tags && Array.isArray(component.tags) && component.tags.length > 0) {
        component.tags.forEach(tag => {
          const tagBadge = document.createElement('span');
          tagBadge.style.cssText = 'background-color: #0078d4; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap;';
          tagBadge.textContent = tag;
          tagsContainer.appendChild(tagBadge);
        });
      } else {
        const noTagBadge = document.createElement('span');
        noTagBadge.style.cssText = 'background-color: #6c757d; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; opacity: 0.7;';
        noTagBadge.textContent = 'Tag not defined';
        tagsContainer.appendChild(noTagBadge);
      }
      
      wrapper.appendChild(tagsContainer);
      
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = componentHtml;
      wrapper.appendChild(contentDiv);
      
      targetContainer.appendChild(wrapper);
      
      setTimeout(() => {
        wrapper.setAttribute('data-loaded', 'true');
      }, 10);
    },

    STYLE_TOKENS: {
      colors: {
        primary: '#0078D4',
        primaryHover: '#106EBE',
        secondary: '#667eea',
        secondaryHover: '#5568d3',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        gradientHero: 'linear-gradient(135deg, #0078D4 0%, #8661C5 50%, #C239B3 100%)',
        text: '#333',
        textLight: '#666',
        bgLight: '#f8f9fa',
        bgLighter: '#e9ecef',
        border: '#e0e0e0',
        white: '#ffffff',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3'
      },
      spacing: {
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
        xxl: '64px'
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      shadows: {
        sm: '0 2px 8px rgba(0,0,0,0.1)',
        md: '0 4px 16px rgba(0,0,0,0.1)',
        lg: '0 8px 24px rgba(0,0,0,0.15)'
      }
    },

    richTextToHtml: function(richText) {
      if (!richText || !richText.content) return '';
      
      const processNode = (node) => {
        if (!node) return '';
        
        switch(node.nodeType) {
          case 'document':
            return node.content.map(processNode).join('');
          
          case 'paragraph':
            const pContent = node.content.map(processNode).join('');
            return pContent ? `<p>${pContent}</p>` : '';
          
          case 'text':
            let text = node.value || '';
            if (node.marks && node.marks.length > 0) {
              node.marks.forEach(mark => {
                if (mark.type === 'bold') text = `<strong>${text}</strong>`;
                if (mark.type === 'italic') text = `<em>${text}</em>`;
                if (mark.type === 'underline') text = `<u>${text}</u>`;
                if (mark.type === 'code') text = `<code>${text}</code>`;
              });
            }
            return text;
          
          case 'hyperlink':
            const linkText = node.content.map(processNode).join('');
            const href = node.data?.uri || '#';
            return `<a href="${href}" target="_blank" rel="noopener">${linkText}</a>`;
          
          case 'unordered-list':
            const ulItems = node.content.map(processNode).join('');
            return `<ul>${ulItems}</ul>`;
          
          case 'ordered-list':
            const olItems = node.content.map(processNode).join('');
            return `<ol>${olItems}</ol>`;
          
          case 'list-item':
            const liContent = node.content.map(processNode).join('');
            return `<li>${liContent}</li>`;
          
          case 'heading-1':
            return `<h1>${node.content.map(processNode).join('')}</h1>`;
          
          case 'heading-2':
            return `<h2>${node.content.map(processNode).join('')}</h2>`;
          
          case 'heading-3':
            return `<h3>${node.content.map(processNode).join('')}</h3>`;
          
          case 'blockquote':
            return `<blockquote>${node.content.map(processNode).join('')}</blockquote>`;
          
          case 'hr':
            return `<hr>`;
          
          default:
            if (node.content && Array.isArray(node.content)) {
              return node.content.map(processNode).join('');
            }
            return '';
        }
      };
      
      return processNode(richText);
    },

    renderComponent: function(component) {
      const { componentType, data } = component;
      
      const normalizedType = (componentType || '').toLowerCase();
      
      
      switch(normalizedType) {
        case 'article':
        case 'blogpost':
        case 'post':
          let articleHtml = '<div class="mc-article">';
          
          if (data.breadcrumb) {
            const breadcrumbText = typeof data.breadcrumb === 'string' ? data.breadcrumb : data.breadcrumb;
            articleHtml += `<div class="mc-article-breadcrumb">${breadcrumbText}</div>`;
          }
          
          if (data.dateAndMinRead || data.date || data.publishDate) {
            const dateStr = data.dateAndMinRead || data.date || data.publishDate;
            let formattedDate = dateStr;
            
            try {
              if (typeof dateStr === 'string' && dateStr.includes('T')) {
                const dateObj = new Date(dateStr);
                formattedDate = dateObj.toLocaleDateString('pt-BR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              }
            } catch (e) {
              formattedDate = dateStr;
            }
            
            articleHtml += `<div class="mc-article-meta"><div class="mc-article-date">📅 ${formattedDate}</div></div>`;
          }
          
          if (data.description) {
            let descHtml = '';
            if (typeof data.description === 'string') {
              descHtml = data.description;
            } else if (data.description.nodeType === 'document') {
              descHtml = this.richTextToHtml(data.description);
            }
            if (descHtml) {
              articleHtml += `<div class="mc-article-description">${descHtml}</div>`;
            }
          }
          
          articleHtml += '<div class="mc-article-content">';
          
          let hasContent = false;
          Object.keys(data).forEach(key => {
            if (['breadcrumb', 'date', 'dateAndMinRead', 'publishDate', 'description', 'slug', 'footnotes'].includes(key)) {
              return;
            }
            
            if (data[key] && typeof data[key] === 'object' && data[key].nodeType === 'document') {
              const html = this.richTextToHtml(data[key]);
              if (html) {
                articleHtml += `<div class="mc-richtext">${html}</div>`;
                hasContent = true;
              }
            }
            else if (key.toLowerCase().includes('image') && typeof data[key] === 'string' && data[key].match(/^https?:\/\//)) {
              articleHtml += `<img src="${data[key]}" alt="Article image" class="mc-article-image" />`;
              hasContent = true;
            }
          });
          
          if (!hasContent) {
            articleHtml += '<p>No content available.</p>';
          }
          
          articleHtml += '</div>';
          
          if (data.footnotes) {
            let footnotesHtml = '';
            if (typeof data.footnotes === 'string') {
              footnotesHtml = data.footnotes;
            } else if (data.footnotes.nodeType === 'document') {
              footnotesHtml = this.richTextToHtml(data.footnotes);
            }
            if (footnotesHtml) {
              articleHtml += `<div class="mc-article-footnotes"><strong>Footnotes:</strong> ${footnotesHtml}</div>`;
            }
          }
          
          articleHtml += '</div>';
          
          return articleHtml;
        
        case 'cards':
          // Map Contentful types to CSS types
          const typeMapping = {
            'Small Cards': '4up',
            'Medium Cards': '3up',
            'Large Cards': '2up',
            '4up': '4up',
            '3up': '3up',
            '2up': '2up'
          };
          const cssType = typeMapping[data.type] || '3up'; // Default to 3 columns
          
          let cardsHtml = '<div class="mc-cards"';
          if (data.id) cardsHtml += ` id="${data.id}"`;
          if (data.classes) cardsHtml += ` class="mc-cards ${data.classes}"`;
          if (data.inlineStyles) cardsHtml += ` style="${data.inlineStyles}"`;
          cardsHtml += ` data-type="${cssType}"`;
          cardsHtml += '>';
          
          // Render each card
          if (data.cards && data.cards.length > 0) {
            cardsHtml += '<div class="mc-cards-grid">';
            data.cards.forEach(card => {
              const cardClickable = card.isClickable ? ' mc-card-clickable' : '';
              cardsHtml += `<div class="mc-card${cardClickable}"`;
              if (card.id) cardsHtml += ` id="${card.id}"`;
              if (card.classes) cardsHtml += ` class="mc-card${cardClickable} ${card.classes}"`;
              if (card.inlineStyles) cardsHtml += ` style="${card.inlineStyles}"`;
              cardsHtml += '>';
              
              // Render badge
              if (card.badge && card.badge.text) {
                const badgeClasses = card.badge.classes || '';
                const badgeStyles = card.badge.inlineStyles || '';
                cardsHtml += `<span class="mc-card-badge ${badgeClasses}" ${badgeStyles ? `style="${badgeStyles}"` : ''}>${card.badge.text}</span>`;
              }
              
              // Render asset (image or video)
              if (card.asset && card.asset.type) {
                if (card.asset.type === 'image' && card.asset.urls && card.asset.urls.length > 0) {
                  const imgClasses = card.asset.classes || '';
                  const altText = card.asset.altText || '';
                  cardsHtml += `<div class="mc-card-image ${imgClasses}">`;
                  cardsHtml += `<img src="${card.asset.urls[0]}" alt="${altText}" loading="lazy">`;
                  cardsHtml += '</div>';
                } else if (card.asset.type === 'video') {
                  const videoClasses = card.asset.classes || '';
                  cardsHtml += `<div class="mc-card-video ${videoClasses}">`;
                  cardsHtml += `<p>${card.asset.title || 'Video'}</p>`;
                  cardsHtml += '</div>';
                }
              }
              
              // Card content wrapper
              cardsHtml += '<div class="mc-card-content">';
              
              // Render heading
              if (card.heading && card.heading.text) {
                const headingTag = card.heading.tag || 'h3';
                const headingClasses = card.heading.classes || '';
                const headingStyles = card.heading.inlineStyles || '';
                cardsHtml += `<${headingTag} class="mc-card-title ${headingClasses}" ${headingStyles ? `style="${headingStyles}"` : ''}>${card.heading.text}</${headingTag}>`;
              }
              
              // Render description
              if (card.description) {
                cardsHtml += `<div class="mc-card-description">${card.description}</div>`;
              }
              
              // Render CTAs
              if (card.cta && card.cta.length > 0) {
                cardsHtml += '<div class="mc-card-ctas">';
                card.cta.forEach(cta => {
                  const ctaClasses = cta.classes || 'mc-cta-link';
                  const ctaStyles = cta.inlineStyles || '';
                  const target = cta.openInNewTab ? ' target="_blank" rel="noopener"' : '';
                  const ariaLabel = cta.ariaLabel ? ` aria-label="${cta.ariaLabel}"` : '';
                  cardsHtml += `<a href="${cta.link}" class="${ctaClasses}" ${ctaStyles ? `style="${ctaStyles}"` : ''}${target}${ariaLabel}>${cta.text}</a>`;
                });
                cardsHtml += '</div>';
              }
              
              cardsHtml += '</div>'; // Close mc-card-content
              cardsHtml += '</div>'; // Close mc-card
            });
            cardsHtml += '</div>'; // Close mc-cards-grid
          }
          
          cardsHtml += '</div>'; // Close mc-cards
          return cardsHtml;
        
        case 'heading':
        case 'areaheading':
          let areaHtml = '<div class="mc-area-heading"';
          if (data.id) areaHtml += ` id="${data.id}"`;
          if (data.classes) areaHtml += ` class="mc-area-heading ${data.classes}"`;
          if (data.inlineStyles) areaHtml += ` style="${data.inlineStyles}"`;
          areaHtml += '>';
          
          // Render heading
          if (data.heading && data.heading.text) {
            const headingTag = data.heading.tag || 'h2';
            const headingClasses = data.heading.classes || '';
            const headingStyles = data.heading.inlineStyles || '';
            areaHtml += `<${headingTag} class="mc-area-heading-title ${headingClasses}" ${headingStyles ? `style="${headingStyles}"` : ''}>${data.heading.text}</${headingTag}>`;
          }
          
          // Render description
          if (data.description) {
            areaHtml += `<div class="mc-area-heading-description">${data.description}</div>`;
          }
          
          // Render CTAs
          if (data.cta && data.cta.length > 0) {
            areaHtml += '<div class="mc-area-heading-ctas">';
            data.cta.forEach(cta => {
              const ctaClasses = cta.classes || 'mc-cta-button';
              const ctaStyles = cta.inlineStyles || '';
              const target = cta.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabel = cta.ariaLabel ? ` aria-label="${cta.ariaLabel}"` : '';
              areaHtml += `<a href="${cta.link}" class="${ctaClasses}" ${ctaStyles ? `style="${ctaStyles}"` : ''}${target}${ariaLabel}>${cta.text}</a>`;
            });
            areaHtml += '</div>';
          }
          
          areaHtml += '</div>';
          return areaHtml;
        
        case 'herobanner':
        case 'hero':
          // Extract heading - can be string or object {tag, text, classes}
          let heading = 'Welcome';
          if (data.heading) {
            if (typeof data.heading === 'string') {
              heading = data.heading;
            } else if (typeof data.heading === 'object' && data.heading.text) {
              heading = data.heading.text;
            }
          } else if (data.title) {
            heading = data.title;
          } else if (data.name) {
            heading = data.name;
          }
          
          let subheading = '';
          if (data.subheading) {
            if (typeof data.subheading === 'string') {
              subheading = data.subheading;
            } else if (data.subheading.nodeType === 'document') {
              subheading = this.richTextToHtml(data.subheading);
            }
          } else if (data.description) {
            if (typeof data.description === 'string') {
              subheading = data.description;
            } else if (data.description.nodeType === 'document') {
              subheading = this.richTextToHtml(data.description);
            }
          }
          
          let ctaButton = '';
          if (data.ctaText || data.buttonText || data.cta) {
            const buttonText = data.ctaText || data.buttonText || data.cta;
            const buttonUrl = data.ctaUrl || data.buttonUrl || data.ctaLink || '#';
            ctaButton = `<a href="${buttonUrl}" class="mc-hero-btn">${buttonText}</a>`;
          }
          
          return `
            <div class="mc-hero">
              <h1 class="mc-hero-title">${heading}</h1>
              ${subheading ? `<div class="mc-hero-subtitle">${subheading}</div>` : ''}
              ${ctaButton}
            </div>
          `;
        
        case 'alert':
          let alertContent = '';
          
          Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key] === 'object' && data[key].nodeType === 'document') {
              const html = this.richTextToHtml(data[key]);
              if (html) {
                alertContent += `<div class="mc-alert-field">${html}</div>`;
              }
            }
          });
          
          if (!alertContent) {
            alertContent = `<p>${data.message || data.text || 'Important Notice'}</p>`;
          }
          
          const alertType = data.type || 'info';
          const alertIcons = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅'
          };
          const alertIcon = alertIcons[alertType] || alertIcons.info;
          
          return `
            <div class="mc-alert mc-alert-${alertType}">
              <span class="mc-alert-icon">${alertIcon}</span>
              <div class="mc-alert-content">${alertContent}</div>
            </div>
          `;
        
        case 'featurecards':
        case 'featurecard':
        case 'feature':
          let features = data.features || data.items || [];
          
          let headerHtml = '';
          if (data.heading || data.paragraph || data.description) {
            let headingText = '';
            let paragraphHtml = '';
            
            if (data.heading) {
              headingText = typeof data.heading === 'string' ? data.heading : data.heading;
            }
            
            if (data.paragraph) {
              if (typeof data.paragraph === 'string') {
                paragraphHtml = data.paragraph;
              } else if (data.paragraph.nodeType === 'document') {
                paragraphHtml = this.richTextToHtml(data.paragraph);
              }
            } else if (data.description) {
              if (typeof data.description === 'string') {
                paragraphHtml = data.description;
              } else if (data.description.nodeType === 'document') {
                paragraphHtml = this.richTextToHtml(data.description);
              }
            }
            
            headerHtml = `
              ${headingText ? `<h2 class="mc-features-heading">${headingText}</h2>` : ''}
              ${paragraphHtml ? `<div class="mc-features-description mc-richtext">${paragraphHtml}</div>` : ''}
            `;
          }
          
          if (features.length === 0 && headerHtml) {
            return `<div class="mc-features-container"><div class="mc-features-header">${headerHtml}</div></div>`;
          }
          
          const featureCardsHtml = features.map(item => {
            let itemDescription = '';
            if (item.description) {
              if (typeof item.description === 'string') {
                itemDescription = item.description;
              } else if (item.description.nodeType === 'document') {
                itemDescription = this.richTextToHtml(item.description);
              }
            }
            
            return `
              <div class="mc-feature-card">
                ${item.icon ? `<div class="mc-feature-icon">✨</div>` : ''}
                <h3 class="mc-feature-title">${item.title || item.name || 'Feature'}</h3>
                <div class="mc-feature-description mc-richtext">${itemDescription}</div>
              </div>
            `;
          }).join('');
          
          return `
            <div class="mc-features-container">
              ${headerHtml ? `<div class="mc-features-header">${headerHtml}</div>` : ''}
              <div class="mc-features-grid">
                ${featureCardsHtml}
              </div>
            </div>
          `;
        
        case 'banner':
          return `
            <div class="mc-banner">
              <h2 class="mc-banner-title">${data.title || 'Welcome'}</h2>
              <p class="mc-banner-desc">${data.description || ''}</p>
            </div>
          `;
        
        case 'contentplacement':
        case 'contentPlacement':
          return `
            <div class="mc-content-grid">
              ${(data.items || []).map(item => `
                <div class="mc-content-card">
                  ${item.image ? `<img src="${item.image}" alt="${item.alt || ''}" />` : ''}
                  <div class="mc-content-card-body">
                    <h3>${item.title || ''}</h3>
                    <p>${item.description || ''}</p>
                    ${item.buttonText ? `<button class="mc-content-btn">${item.buttonText}</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        
        case 'testimonial':
        case 'testimonials':
          if (data.items && Array.isArray(data.items)) {
            return `
              <div class="mc-testimonials-grid">
                ${data.items.map(item => `
                  <div class="mc-testimonial">
                    <p class="mc-testimonial-quote">"💬 ${item.quote || ''}"</p>
                    <div class="mc-testimonial-author">
                      ${item.avatar ? `<img src="${item.avatar}" alt="" class="mc-testimonial-avatar">` : ''}
                      <div>
                        <div class="mc-testimonial-name">${item.name || item.author || ''}</div>
                        <div class="mc-testimonial-role">${item.role || ''}</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }
          return `
            <div class="mc-testimonial">
              <p class="mc-testimonial-quote">"💬 ${data.quote || ''}"</p>
              <div class="mc-testimonial-author">
                ${data.avatar ? `<img src="${data.avatar}" alt="" class="mc-testimonial-avatar">` : ''}
                <div>
                  <div class="mc-testimonial-name">${data.name || data.author || ''}</div>
                  <div class="mc-testimonial-role">${data.role || ''}</div>
                </div>
              </div>
            </div>
          `;
        
        case 'stat':
        case 'stats':
        case 'statistics':
          if (data.items && Array.isArray(data.items)) {
            return `
              <div class="mc-stats-grid">
                ${data.items.map(item => `
                  <div class="mc-stat-item">
                    <div class="mc-stat-value">${item.number || item.value || ''}</div>
                    <div class="mc-stat-label">${item.label || ''}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
          return `
            <div class="mc-stat-item">
              <div class="mc-stat-value">${data.value || ''}</div>
              <div class="mc-stat-label">${data.label || ''}</div>
            </div>
          `;
        
        case 'calltoaction':
        case 'callToAction':
        case 'cta':
          return `
            <div class="mc-cta">
              <h2 class="mc-cta-title">${data.title || ''}</h2>
              <p class="mc-cta-desc">${data.description || ''}</p>
              <button class="mc-cta-btn">${data.buttonText || 'Learn More'}</button>
            </div>
          `;
        
        case 'cards':
        case 'card':
          const cardText = data.text || data.description || data.content || '';
          const cardLink = data.link || data.buttonText || data.cta || 'Learn More';
          const cardUrl = data.url || data.href || data.linkUrl || '#';
          const cardTitle = data.title || data.heading || '';
          
          return `
            <div class="mc-card">
              ${cardTitle ? `<h3 class="mc-card-title">${cardTitle}</h3>` : ''}
              ${cardText ? `<p class="mc-card-text">${cardText}</p>` : ''}
              <a href="${cardUrl}" class="mc-card-btn">${cardLink}</a>
            </div>
          `;
        
        case 'image':
          const imgSrc = data.url || data.src || data.image || '';
          const imgAlt = data.alt || data.title || data.description || 'Image';
          const imgCaption = data.caption || data.description || '';
          
          return `
            <div class="mc-image-container">
              ${imgSrc ? `<img src="${imgSrc}" alt="${imgAlt}" class="mc-image" />` : ''}
              ${imgCaption ? `<p class="mc-image-caption">${imgCaption}</p>` : ''}
            </div>
          `;
        
        case 'footnotes':
          console.log('📌 [FOOTNOTES] Rendering with data:', data);
          
          // Handle nested data structure (when data comes wrapped)
          const footnotesData = data.data || data;
          console.log('📌 [FOOTNOTES] After unwrap:', footnotesData);
          
          let footnotesHtml = '<div class="mc-footnotes"';
          if (footnotesData.id) footnotesHtml += ` id="${footnotesData.id}"`;
          if (footnotesData.classes) footnotesHtml += ` class="mc-footnotes ${footnotesData.classes}"`;
          footnotesHtml += '>';
          
          // Check if we have items array (proper structure from backend)
          if (footnotesData.items && Array.isArray(footnotesData.items) && footnotesData.items.length > 0) {
            console.log(`📌 [FOOTNOTES] Found ${footnotesData.items.length} items`);
            footnotesHtml += '<ol class="mc-footnotes-list">';
            footnotesData.items.forEach((item, index) => {
              console.log(`📌 [FOOTNOTES] Item ${index}:`, item);
              
              // Handle wrapped item structure (item.data.text vs item.text)
              const itemData = item.data || item;
              console.log(`  - After unwrap:`, itemData);
              console.log(`  - id: "${itemData.id}"`);
              console.log(`  - text: "${itemData.text}"`);
              console.log(`  - ariaLabel: "${itemData.ariaLabel}"`);
              
              const itemId = itemData.id ? ` id="footnote-${itemData.id}"` : '';
              const ariaLabel = itemData.ariaLabel ? ` aria-label="${itemData.ariaLabel}"` : '';
              footnotesHtml += `<li class="mc-footnote-item"${itemId}${ariaLabel}>`;
              
              // Render text content
              if (itemData.text) {
                footnotesHtml += itemData.text;
                console.log(`  ✅ Added text to item ${index}`);
              } else if (itemData.content) {
                if (typeof itemData.content === 'string') {
                  footnotesHtml += itemData.content;
                } else if (itemData.content.nodeType === 'document') {
                  footnotesHtml += this.richTextToHtml(itemData.content);
                }
                console.log(`  ✅ Added content to item ${index}`);
              } else {
                console.warn(`  ⚠️ No text or content found for item ${index}`);
              }
              
              footnotesHtml += '</li>';
            });
            footnotesHtml += '</ol>';
          }
          // Fallback: Old structure with content/text fields
          else {
            footnotesHtml += '<div class="mc-footnotes-content">';
            if (typeof footnotesData.content === 'string') {
              footnotesHtml += footnotesData.content;
            } else if (footnotesData.content && footnotesData.content.nodeType === 'document') {
              footnotesHtml += this.richTextToHtml(footnotesData.content);
            } else if (footnotesData.text) {
              footnotesHtml += footnotesData.text;
            } else {
              footnotesHtml += '<p>No footnotes available.</p>';
            }
            footnotesHtml += '</div>';
          }
          
          footnotesHtml += '</div>';
          return footnotesHtml;
        
        case 'transformyourcreativewritingwithai':
        case 'transformYourCreativeWritingWithAi':
          return `
            <div class="mc-quiz">
              <div class="mc-quiz-icon">✨</div>
              <h3 class="mc-quiz-title">${data.title || 'Transform Your Creative Writing with AI'}</h3>
              <p class="mc-quiz-description">${data.description || 'Discover how AI can enhance your writing process'}</p>
              <button class="mc-quiz-btn">${data.buttonText || 'Start Quiz'}</button>
            </div>
          `;
        
        case 'articlepage':
        case 'articlePage':
          let articlePageContent = '';
          if (data.body && data.body.nodeType === 'document') {
            articlePageContent = this.richTextToHtml(data.body);
          } else if (data.content && data.content.nodeType === 'document') {
            articlePageContent = this.richTextToHtml(data.content);
          }
          
          return `
            <article class="mc-article-page">
              <header class="mc-article-header">
                ${data.title ? `<h1 class="mc-article-page-title">${data.title}</h1>` : ''}
                ${data.subtitle ? `<p class="mc-article-page-subtitle">${data.subtitle}</p>` : ''}
                ${data.author ? `<div class="mc-article-meta"><span class="mc-article-author">By ${data.author}</span></div>` : ''}
              </header>
              <div class="mc-article-page-body">${articlePageContent}</div>
            </article>
          `;
        
        case 'interactivehero':
        case 'interactiveHero':
          let interactiveSubheading = '';
          if (data.subheading) {
            if (typeof data.subheading === 'string') {
              interactiveSubheading = data.subheading;
            } else if (data.subheading.nodeType === 'document') {
              interactiveSubheading = this.richTextToHtml(data.subheading);
            }
          }
          
          return `
            <div class="mc-interactive-hero">
              <div class="mc-interactive-hero-content">
                <h1 class="mc-interactive-hero-title">${data.heading || data.title || 'Welcome'}</h1>
                ${interactiveSubheading ? `<div class="mc-interactive-hero-subtitle">${interactiveSubheading}</div>` : ''}
                ${data.ctaText ? `<button class="mc-interactive-hero-btn">${data.ctaText}</button>` : ''}
              </div>
              <div class="mc-interactive-hero-animation">
                <div class="mc-hero-particle"></div>
                <div class="mc-hero-particle"></div>
                <div class="mc-hero-particle"></div>
              </div>
            </div>
          `;
        
        case 'areaheading':
        case 'areaHeading':
          return `
            <div class="mc-area-heading">
              <h2 class="mc-area-heading-title">${data.heading || data.title || ''}</h2>
              ${data.subtitle ? `<p class="mc-area-heading-subtitle">${data.subtitle}</p>` : ''}
            </div>
          `;
        
        case 'featurebanner':
        case 'featureBanner':
          return `
            <div class="mc-feature-banner">
              <div class="mc-feature-banner-icon">🚀</div>
              <div class="mc-feature-banner-content">
                <h3 class="mc-feature-banner-title">${data.title || data.heading || ''}</h3>
                <p class="mc-feature-banner-text">${data.text || data.description || ''}</p>
              </div>
              ${data.buttonText ? `<button class="mc-feature-banner-btn">${data.buttonText}</button>` : ''}
            </div>
          `;
        
        case 'richtext':
        case 'richText':
          let richTextHtml = '';
          Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key] === 'object' && data[key].nodeType === 'document') {
              richTextHtml += this.richTextToHtml(data[key]);
            }
          });
          
          return `<div class="mc-richtext-block">${richTextHtml || '<p>No content</p>'}</div>`;
        
        case 'cascadeblock':
        case 'cascadeBlock':
          const cascadeItems = data.items || [];
          return `
            <div class="mc-cascade-block">
              ${cascadeItems.map((item, index) => `
                <div class="mc-cascade-item" style="animation-delay: ${index * 0.1}s">
                  <div class="mc-cascade-number">${index + 1}</div>
                  <h4 class="mc-cascade-title">${item.title || item.heading || ''}</h4>
                  <p class="mc-cascade-text">${item.text || item.description || ''}</p>
                </div>
              `).join('')}
            </div>
          `;
        
        case 'heroplp':
        case 'heroPlp':
          return `
            <div class="mc-hero-plp">
              <div class="mc-hero-plp-badge">Featured</div>
              <h1 class="mc-hero-plp-title">${data.title || data.heading || ''}</h1>
              <p class="mc-hero-plp-description">${data.description || ''}</p>
              <div class="mc-hero-plp-actions">
                ${data.primaryCta ? `<button class="mc-hero-plp-btn-primary">${data.primaryCta}</button>` : ''}
                ${data.secondaryCta ? `<button class="mc-hero-plp-btn-secondary">${data.secondaryCta}</button>` : ''}
              </div>
            </div>
          `;
        
        case 'highlights':
          const highlightItems = data.items || data.highlights || [];
          return `
            <div class="mc-highlights">
              ${data.heading ? `<h2 class="mc-highlights-heading">${data.heading}</h2>` : ''}
              <div class="mc-highlights-grid">
                ${highlightItems.map(item => `
                  <div class="mc-highlight-item">
                    <div class="mc-highlight-icon">⭐</div>
                    <h3 class="mc-highlight-title">${item.title || ''}</h3>
                    <p class="mc-highlight-text">${item.text || item.description || ''}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        
        case 'socialshare':
        case 'socialShare':
          let socialShareHtml = '<div class="mc-social-share"';
          if (data.id) socialShareHtml += ` id="${data.id}"`;
          if (data.classes) socialShareHtml += ` class="mc-social-share ${data.classes}"`;
          else socialShareHtml += ' class="mc-social-share"';
          if (data.inlineStyles) socialShareHtml += ` style="${data.inlineStyles}"`;
          if (data.variation) socialShareHtml += ` data-variation="${data.variation}"`;
          socialShareHtml += '>';
          
          // Render heading
          if (data.heading && data.heading.text) {
            const headingTag = data.heading.tag || 'h3';
            const headingClasses = data.heading.classes || '';
            const headingStyles = data.heading.inlineStyles || '';
            socialShareHtml += `<${headingTag} class="mc-social-share-heading ${headingClasses}" ${headingStyles ? `style="${headingStyles}"` : ''}>${data.heading.text}</${headingTag}>`;
          }
          
          // Render items
          if (data.items && data.items.length > 0) {
            socialShareHtml += '<div class="mc-social-share-items">';
            data.items.forEach(item => {
              const itemClasses = item.classes || '';
              const itemStyles = item.inlineStyles || '';
              const target = item.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabel = item.ariaLabel ? ` aria-label="${item.ariaLabel}"` : '';
              
              // Render icon if available
              let iconHtml = '';
              if (item.icon && item.icon.urls && item.icon.urls.length > 0) {
                const iconClasses = item.icon.classes || '';
                const iconAlt = item.icon.altText || item.text || 'Social icon';
                iconHtml = `<img src="${item.icon.urls[0]}" alt="${iconAlt}" class="mc-social-icon ${iconClasses}" loading="lazy">`;
              }
              
              socialShareHtml += `<a href="${item.link}" class="mc-social-link ${itemClasses}" ${itemStyles ? `style="${itemStyles}"` : ''}${target}${ariaLabel}>`;
              socialShareHtml += iconHtml;
              if (item.text) {
                socialShareHtml += `<span class="mc-social-text">${item.text}</span>`;
              }
              socialShareHtml += '</a>';
            });
            socialShareHtml += '</div>';
          }
          
          socialShareHtml += '</div>';
          return socialShareHtml;
        
        case 'accordion':
          const accordionId = data.id || `accordion-${Date.now()}`;
          let accordionHtml = '<div class="mc-accordion"';
          accordionHtml += ` id="${accordionId}"`;
          
          // Build classes
          let accordionClasses = 'mc-accordion';
          if (data.classes) accordionClasses += ` ${data.classes}`;
          accordionHtml += ` class="${accordionClasses}"`;
          
          // Default styling for modern accordion
          const accordionDefaultStyle = 'max-width: 900px; margin: 40px auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
          if (data.inlineStyles) {
            accordionHtml += ` style="${data.inlineStyles}"`;
          } else {
            accordionHtml += ` style="${accordionDefaultStyle}"`;
          }
          accordionHtml += '>';
          
          if (data.items && data.items.length > 0) {
            data.items.forEach((item, index) => {
              // 🔧 FIX: Always prefix with accordionId to ensure uniqueness across multiple accordions on same page
              const itemId = item.id ? `${accordionId}-${item.id}` : `accordion-item-${accordionId}-${index}`;
              const question = item.question || item.title || item.internalName || '';
              const answer = item.answer || item.description || item.content || '';
              
              accordionHtml += `<div class="mc-accordion-item" data-item-id="${itemId}" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; overflow: hidden; background: white; transition: all 0.3s;">`;
              
              // Header/Button
              accordionHtml += `<button class="mc-accordion-header" onclick="MindContent.toggleAccordion('${itemId}')" aria-expanded="false" aria-controls="${itemId}-content" style="width: 100%; padding: 20px 24px; background: white; border: none; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; color: #1f2937; transition: background 0.2s;">`;
              accordionHtml += `<span class="mc-accordion-question" style="flex: 1; padding-right: 16px;">${question}</span>`;
              accordionHtml += `<span class="mc-accordion-icon" style="font-size: 20px; color: #6b7280; transition: transform 0.3s; line-height: 1;">▼</span>`;
              accordionHtml += '</button>';
              
              // Content
              accordionHtml += `<div id="${itemId}-content" class="mc-accordion-content" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease-out, padding 0.3s ease-out; padding: 0 24px;">`;
              accordionHtml += `<div class="mc-accordion-answer" style="padding: 20px 0; color: #4b5563; line-height: 1.7; font-size: 15px; border-top: 1px solid #f3f4f6;">${answer}</div>`;
              accordionHtml += '</div>';
              
              accordionHtml += '</div>';
            });
          }
          
          accordionHtml += '</div>';
          
          return accordionHtml;
        
        case 'navigation':
          let navHtml = '<nav class="mc-navigation"';
          if (data.id) navHtml += ` id="${data.id}"`;
          if (data.classes) navHtml += ` class="mc-navigation ${data.classes}"`;
          if (data.inlineStyles) navHtml += ` style="${data.inlineStyles}"`;
          navHtml += '>';
          
          if (data.label) {
            navHtml += `<div class="mc-navigation-label">${data.label}</div>`;
          }
          
          if (data.items && data.items.length > 0) {
            navHtml += '<ul class="mc-navigation-items">';
            data.items.forEach(item => {
              const itemClasses = item.classes || '';
              const itemStyles = item.inlineStyles || '';
              const target = item.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabel = item.ariaLabel ? ` aria-label="${item.ariaLabel}"` : '';
              navHtml += `<li class="mc-navigation-item ${itemClasses}">`;
              navHtml += `<a href="${item.link}" ${target}${ariaLabel} ${itemStyles ? `style="${itemStyles}"` : ''}>${item.text}</a>`;
              navHtml += '</li>';
            });
            navHtml += '</ul>';
          }
          
          navHtml += '</nav>';
          return navHtml;
        
        case 'mediaimage':
        case 'mediaImage':
          // Hero Banner style with background image and overlay text
          let mediaImageHtml = '<div class="mc-media-image mc-hero-banner"';
          if (data.id) mediaImageHtml += ` id="${data.id}"`;
          
          // Build class list
          let mediaImageClasses = 'mc-media-image mc-hero-banner';
          if (data.classes) mediaImageClasses += ` ${data.classes}`;
          mediaImageHtml += ` class="${mediaImageClasses}"`;
          
          // Extract image URLs from various possible data structures
          let imageUrls = [];
          
          // Priority 1: data.urls (from backend transformation)
          if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
            imageUrls = data.urls.filter(url => url); // Remove empty/null values
          }
          // Priority 2: data.images as array of URL strings or objects
          else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            imageUrls = data.images
              .map(img => {
                // Handle different image data structures
                if (typeof img === 'string') {
                  return img;
                } else if (img && typeof img === 'object') {
                  // Try various possible URL fields
                  return img.url || img.src || img.file?.url || null;
                }
                return null;
              })
              .filter(url => url); // Remove nulls
          }
          // Priority 3: Single image field
          else if (data.image) {
            const imgUrl = typeof data.image === 'string' 
              ? data.image 
              : data.image.url || data.image.src || data.image.file?.url;
            if (imgUrl) imageUrls = [imgUrl];
          }
          
          // Set background image if available
          const backgroundImage = imageUrls.length > 0 ? imageUrls[0] : '';
          if (backgroundImage) {
            mediaImageHtml += ` style="background-image: url('${backgroundImage}');"`;
          }
          mediaImageHtml += '>';
          
          // Overlay for better text readability
          mediaImageHtml += '<div class="mc-hero-overlay"></div>';
          
          // Content container (text on top of image)
          mediaImageHtml += '<div class="mc-hero-content">';
          
          // Internal Name / Title (if present)
          if (data.internalName) {
            mediaImageHtml += `<h1 class="mc-hero-title">${data.internalName}</h1>`;
          }
          
          // Caption / Description
          if (data.caption) {
            mediaImageHtml += `<p class="mc-hero-caption">${data.caption}</p>`;
          }
          
          // Alt Text as subtitle (if different from caption and exists)
          if (data.altText && data.altText !== data.caption && data.altText !== data.internalName) {
            mediaImageHtml += `<p class="mc-hero-subtitle">${data.altText}</p>`;
          }
          
          mediaImageHtml += '</div>'; // End mc-hero-content
          mediaImageHtml += '</div>'; // End mc-hero-banner
          return mediaImageHtml;
        
        case 'mediavideo':
        case 'mediaVideo':
          let mediaVideoHtml = '<div class="mc-media-video"';
          if (data.id) mediaVideoHtml += ` id="${data.id}"`;
          
          // Build class list
          let mediaVideoClasses = 'mc-media-video';
          if (data.classes) mediaVideoClasses += ` ${data.classes}`;
          mediaVideoHtml += ` class="${mediaVideoClasses}"`;
          
          // Default styling for a modern video container
          const mediaVideoDefaultStyle = 'max-width: 900px; margin: 40px auto; padding: 0; background: #000; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);';
          if (data.inlineStyles) {
            mediaVideoHtml += ` style="${data.inlineStyles}"`;
          } else {
            mediaVideoHtml += ` style="${mediaVideoDefaultStyle}"`;
          }
          mediaVideoHtml += '>';
          
          // Extract video URLs from various possible data structures
          let videoUrls = [];
          
          // Priority 1: data.videoUrls (from backend transformation)
          if (data.videoUrls && Array.isArray(data.videoUrls) && data.videoUrls.length > 0) {
            videoUrls = data.videoUrls.filter(url => url);
          }
          // Priority 2: data.urls as array
          else if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
            videoUrls = data.urls.filter(url => url);
          }
          // Priority 3: data.videoUrl single string
          else if (data.videoUrl) {
            videoUrls = [data.videoUrl];
          }
          
          // Extract poster URL
          let posterUrl = null;
          if (data.posterUrl) {
            posterUrl = data.posterUrl;
          } else if (data.posterImage) {
            if (typeof data.posterImage === 'string') {
              posterUrl = data.posterImage;
            } else if (data.posterImage.url) {
              posterUrl = data.posterImage.url;
            } else if (data.posterImage.urls && data.posterImage.urls.length > 0) {
              posterUrl = data.posterImage.urls[0];
            }
          }
          
          // Render video if we have URLs
          if (videoUrls.length > 0) {
            // Video wrapper with aspect ratio
            mediaVideoHtml += '<div class="mc-media-video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background: #000;">';
            
            // Video element
            mediaVideoHtml += '<video class="mc-media-video-element" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;" controls';
            
            // Attributes
            if (data.isAutoPlay) mediaVideoHtml += ' autoplay muted loop playsinline';
            if (posterUrl) mediaVideoHtml += ` poster="${posterUrl}"`;
            mediaVideoHtml += '>';
            
            // Video sources
            videoUrls.forEach(url => {
              const extension = url.split('.').pop().toLowerCase().split('?')[0];
              let mimeType = 'video/mp4';
              
              if (extension === 'webm') mimeType = 'video/webm';
              else if (extension === 'ogg' || extension === 'ogv') mimeType = 'video/ogg';
              else if (extension === 'mov') mimeType = 'video/quicktime';
              
              mediaVideoHtml += `<source src="${url}" type="${mimeType}">`;
            });
            
            mediaVideoHtml += '<p style="color: white; padding: 20px; text-align: center;">Your browser does not support the video tag. <a href="' + videoUrls[0] + '" style="color: #4CAF50;">Download the video</a></p>';
            mediaVideoHtml += '</video>';
            mediaVideoHtml += '</div>'; // end video-wrapper
            
            // Video info panel
            if (data.title || data.description || data.duration || data.uploadedDate || data.transcriptUrl) {
              mediaVideoHtml += '<div class="mc-media-video-info" style="padding: 20px; background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);">';
              
              // Title
              if (data.title || data.internalName) {
                const videoTitle = data.title || data.internalName;
                mediaVideoHtml += `<h3 class="mc-media-video-title" style="margin: 0 0 8px 0; color: #fff; font-size: 20px; font-weight: 600;">${videoTitle}</h3>`;
              }
              
              // Description
              if (data.description) {
                mediaVideoHtml += `<p class="mc-media-video-description" style="margin: 0 0 12px 0; color: #b0b0b0; font-size: 14px; line-height: 1.6;">${data.description}</p>`;
              }
              
              // Meta info (duration, date)
              if (data.duration || data.uploadedDate) {
                mediaVideoHtml += '<div class="mc-media-video-meta" style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #888; margin-bottom: 12px;">';
                
                if (data.duration) {
                  // Parse ISO 8601 duration (PT0M15S) to readable format
                  let durationText = data.duration;
                  const durationMatch = data.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                  if (durationMatch) {
                    const hours = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
                    const minutes = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
                    const seconds = durationMatch[3] ? parseInt(durationMatch[3]) : 0;
                    
                    if (hours > 0) {
                      durationText = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    } else {
                      durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                  }
                  mediaVideoHtml += `<span style="display: flex; align-items: center; gap: 4px;"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>${durationText}</span>`;
                }
                
                if (data.uploadedDate) {
                  const uploadDate = new Date(data.uploadedDate);
                  const dateText = uploadDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  mediaVideoHtml += `<span style="display: flex; align-items: center; gap: 4px;"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>${dateText}</span>`;
                }
                
                mediaVideoHtml += '</div>';
              }
              
              // Transcript link
              if (data.transcriptUrl) {
                mediaVideoHtml += `<a href="${data.transcriptUrl}" class="mc-media-video-transcript" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #3a3a3a; color: #fff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='#4a4a4a'" onmouseout="this.style.background='#3a3a3a'"><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>View Transcript</a>`;
              }
              
              mediaVideoHtml += '</div>'; // end video-info
            }
          } else {
            // No video found - show placeholder
            mediaVideoHtml += `<div class="mc-media-video-placeholder" style="padding: 80px 40px; text-align: center; background: #1a1a1a; color: #666;">
              <svg style="width: 64px; height: 64px; margin: 0 auto 16px; opacity: 0.4;" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
              <p style="margin: 0; font-size: 16px; color: #888;">No video available</p>
            </div>`;
          }
          
          mediaVideoHtml += '</div>';
          return mediaVideoHtml;
        
        case 'infolist':
        case 'infoList':
          let infoListHtml = '<div class="mc-info-list"';
          if (data.id) infoListHtml += ` id="${data.id}"`;
          if (data.classes) infoListHtml += ` class="mc-info-list ${data.classes}"`;
          if (data.inlineStyles) infoListHtml += ` style="${data.inlineStyles}"`;
          infoListHtml += '>';
          
          if (data.leftLogo && data.leftLogo.length > 0) {
            infoListHtml += '<div class="mc-info-list-left-logos">';
            data.leftLogo.forEach(logo => {
              infoListHtml += `<img src="${logo}" alt="Logo" class="mc-info-list-logo" loading="lazy">`;
            });
            infoListHtml += '</div>';
          }
          
          if (data.text) {
            infoListHtml += `<div class="mc-info-list-text">${data.text}</div>`;
          }
          
          if (data.listItem) {
            infoListHtml += `<div class="mc-info-list-items">${data.listItem}</div>`;
          }
          
          if (data.rightLogo && data.rightLogo.length > 0) {
            infoListHtml += '<div class="mc-info-list-right-logos">';
            data.rightLogo.forEach(logo => {
              infoListHtml += `<img src="${logo}" alt="Logo" class="mc-info-list-logo" loading="lazy">`;
            });
            infoListHtml += '</div>';
          }
          
          infoListHtml += '</div>';
          return infoListHtml;
        
        case 'footnoteitem':
        case 'footnoteItem':
          let footnoteItemHtml = '<div class="mc-footnote-item"';
          if (data.id) footnoteItemHtml += ` id="${data.id}"`;
          const ariaLabel = data.ariaLabel ? ` aria-label="${data.ariaLabel}"` : '';
          footnoteItemHtml += `${ariaLabel}>`;
          
          if (data.text) {
            footnoteItemHtml += `<div class="mc-footnote-text">${data.text}</div>`;
          }
          
          footnoteItemHtml += '</div>';
          return footnoteItemHtml;
        
        case 'microcopy':
        case 'microCopy':
          let microCopyHtml = '<div class="mc-micro-copy">';
          
          if (data.items && data.items.length > 0) {
            microCopyHtml += '<dl class="mc-micro-copy-list">';
            data.items.forEach(item => {
              if (item.key) {
                microCopyHtml += `<dt class="mc-micro-copy-key">${item.key}</dt>`;
              }
              if (item.value) {
                microCopyHtml += `<dd class="mc-micro-copy-value">${item.value}</dd>`;
              }
            });
            microCopyHtml += '</dl>';
          }
          
          microCopyHtml += '</div>';
          return microCopyHtml;
        
        case 'carouselcards':
        case 'carouselCards':
          let carouselCardsHtml = '<div class="mc-carousel-cards">';
          
          if (data.mainHeading && data.mainHeading.text) {
            const headingTag = data.mainHeading.tag || 'h2';
            const headingClasses = data.mainHeading.classes || '';
            const headingStyles = data.mainHeading.inlineStyles || '';
            carouselCardsHtml += `<${headingTag} class="mc-carousel-heading ${headingClasses}" ${headingStyles ? `style="${headingStyles}"` : ''}>${data.mainHeading.text}</${headingTag}>`;
          }
          
          if (data.description) {
            carouselCardsHtml += `<div class="mc-carousel-description">${data.description}</div>`;
          }
          
          carouselCardsHtml += '<div class="mc-carousel-cards-container">';
          
          if (data.images && data.images.urls && data.images.urls.length > 0) {
            data.images.urls.forEach((url, index) => {
              const altText = data.images.altText || `Image ${index + 1}`;
              carouselCardsHtml += `<div class="mc-carousel-card">`;
              carouselCardsHtml += `<img src="${url}" alt="${altText}" loading="lazy">`;
              carouselCardsHtml += `</div>`;
            });
          }
          
          carouselCardsHtml += '</div>';
          
          if (data.cta && data.cta.length > 0) {
            carouselCardsHtml += '<div class="mc-carousel-ctas">';
            data.cta.forEach(cta => {
              const ctaClasses = cta.classes || 'mc-cta-button';
              const ctaStyles = cta.inlineStyles || '';
              const target = cta.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabelCta = cta.ariaLabel ? ` aria-label="${cta.ariaLabel}"` : '';
              carouselCardsHtml += `<a href="${cta.link}" class="${ctaClasses}" ${ctaStyles ? `style="${ctaStyles}"` : ''}${target}${ariaLabelCta}>${cta.text}</a>`;
            });
            carouselCardsHtml += '</div>';
          }
          
          carouselCardsHtml += '</div>';
          return carouselCardsHtml;
        
        case 'carouselitems':
        case 'carouselItems':
          let carouselItemsHtml = '<div class="mc-carousel-items">';
          
          if (data.mainHeading && data.mainHeading.text) {
            const headingTag = data.mainHeading.tag || 'h2';
            const headingClasses = data.mainHeading.classes || '';
            const headingStyles = data.mainHeading.inlineStyles || '';
            carouselItemsHtml += `<${headingTag} class="mc-carousel-heading ${headingClasses}" ${headingStyles ? `style="${headingStyles}"` : ''}>${data.mainHeading.text}</${headingTag}>`;
          }
          
          if (data.description) {
            carouselItemsHtml += `<div class="mc-carousel-description">${data.description}</div>`;
          }
          
          if (data.image && data.image.urls && data.image.urls.length > 0) {
            const altText = data.image.altText || 'Carousel image';
            carouselItemsHtml += `<div class="mc-carousel-image">`;
            carouselItemsHtml += `<img src="${data.image.urls[0]}" alt="${altText}" loading="lazy">`;
            carouselItemsHtml += `</div>`;
          }
          
          if (data.cta && data.cta.length > 0) {
            carouselItemsHtml += '<div class="mc-carousel-ctas">';
            data.cta.forEach(cta => {
              const ctaClasses = cta.classes || 'mc-cta-button';
              const ctaStyles = cta.inlineStyles || '';
              const target = cta.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabelCta = cta.ariaLabel ? ` aria-label="${cta.ariaLabel}"` : '';
              carouselItemsHtml += `<a href="${cta.link}" class="${ctaClasses}" ${ctaStyles ? `style="${ctaStyles}"` : ''}${target}${ariaLabelCta}>${cta.text}</a>`;
            });
            carouselItemsHtml += '</div>';
          }
          
          carouselItemsHtml += '</div>';
          return carouselItemsHtml;
        
        case 'heroimagescroll':
        case 'heroImageScroll':
          let heroImageScrollHtml = '<div class="mc-hero-image-scroll" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 80px 20px; text-align: center; position: relative; overflow: hidden;">';
          
          // Main Heading
          if (data.mainHeading) {
            let headingText = '';
            if (typeof data.mainHeading === 'string') {
              headingText = data.mainHeading;
            } else if (typeof data.mainHeading === 'object') {
              headingText = data.mainHeading.text || data.mainHeading.internalName || '';
            }
            
            if (headingText) {
              const headingTag = (data.mainHeading.tag || 'h1');
              const headingClasses = (typeof data.mainHeading === 'object' ? data.mainHeading.classes : '') || '';
              const headingStyles = (typeof data.mainHeading === 'object' ? data.mainHeading.inlineStyles : '') || 'font-size: 48px; font-weight: 700; margin: 0 0 20px 0; line-height: 1.2;';
              heroImageScrollHtml += `<${headingTag} class="mc-hero-main-heading ${headingClasses}" style="${headingStyles}">${headingText}</${headingTag}>`;
            }
          }
          
          // Sub Heading
          if (data.subHeading) {
            let subHeadingText = '';
            if (typeof data.subHeading === 'string') {
              subHeadingText = data.subHeading;
            } else if (typeof data.subHeading === 'object') {
              subHeadingText = data.subHeading.text || data.subHeading.internalName || '';
            }
            
            if (subHeadingText) {
              const subHeadingTag = (data.subHeading.tag || 'h2');
              const subHeadingClasses = (typeof data.subHeading === 'object' ? data.subHeading.classes : '') || '';
              const subHeadingStyles = (typeof data.subHeading === 'object' ? data.subHeading.inlineStyles : '') || 'font-size: 24px; font-weight: 400; margin: 0 0 30px 0; opacity: 0.95;';
              heroImageScrollHtml += `<${subHeadingTag} class="mc-hero-sub-heading ${subHeadingClasses}" style="${subHeadingStyles}">${subHeadingText}</${subHeadingTag}>`;
            }
          }
          
          // Description (can be RichText or string)
          if (data.description) {
            const descriptionText = typeof data.description === 'string' ? data.description : 
                                   (data.description.content ? this.richTextToHtml(data.description) : JSON.stringify(data.description));
            heroImageScrollHtml += `<div class="mc-hero-description" style="font-size: 18px; max-width: 700px; margin: 0 auto 40px; line-height: 1.6; opacity: 0.9;">${descriptionText}</div>`;
          }
          
          // CTAs / Buttons
          if (data.cta && Array.isArray(data.cta) && data.cta.length > 0) {
            heroImageScrollHtml += '<div class="mc-hero-ctas" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px;">';
            data.cta.forEach((cta, idx) => {
              // Extract CTA properties
              const ctaText = cta.text || cta.internalName || `Button ${idx + 1}`;
              const ctaLink = cta.link || '#';
              const ctaClasses = cta.classes || '';
              const ctaStyles = cta.inlineStyles || '';
              const target = cta.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabelCta = cta.ariaLabel ? ` aria-label="${cta.ariaLabel}"` : '';
              
              // Default button styling
              const defaultButtonStyle = idx === 0 
                ? 'background: white; color: #667eea; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);'
                : 'background: transparent; color: white; padding: 14px 32px; border: 2px solid white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; transition: all 0.3s;';
              
              const finalStyle = ctaStyles || defaultButtonStyle;
              
              heroImageScrollHtml += `<a href="${ctaLink}" class="mc-cta-button ${ctaClasses}" style="${finalStyle}"${target}${ariaLabelCta}>${ctaText}</a>`;
            });
            heroImageScrollHtml += '</div>';
          }
          
          // Image
          if (data.images) {
            let imageUrl = null;
            let altText = 'Hero image';
            
            // Handle different image data structures
            if (data.images.urls && data.images.urls.length > 0) {
              imageUrl = data.images.urls[0];
              altText = data.images.altText || altText;
            } else if (data.images.url) {
              imageUrl = data.images.url;
              altText = data.images.altText || data.images.title || altText;
            }
            
            if (imageUrl) {
              heroImageScrollHtml += `<div class="mc-hero-image" style="max-width: 1000px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">`;
              heroImageScrollHtml += `<img src="${imageUrl}" alt="${altText}" loading="lazy" style="width: 100%; height: auto; display: block;">`;
              heroImageScrollHtml += `</div>`;
            }
          }
          
          heroImageScrollHtml += '</div>';
          return heroImageScrollHtml;
        
        case 'genericheading':
        case 'genericHeading':
          const headingTag = data.tag || 'h2';
          const headingClasses = data.classes || '';
          const headingStyles = data.inlineStyles || '';
          const headingText = data.text || '';
          return `<${headingTag} class="mc-generic-heading ${headingClasses}" ${headingStyles ? `style="${headingStyles}"` : ''}>${headingText}</${headingTag}>`;
        
        case 'genericcta':
        case 'genericCta':
          const ctaClasses = data.classes || 'mc-generic-cta';
          const ctaStyles = data.inlineStyles || '';
          const target = data.openInNewTab ? ' target="_blank" rel="noopener"' : '';
          const ariaLabelGeneric = data.ariaLabel ? ` aria-label="${data.ariaLabel}"` : '';
          
          let ctaIconHtml = '';
          if (data.icon && data.icon.urls && data.icon.urls.length > 0) {
            const iconAlt = data.icon.altText || 'Icon';
            ctaIconHtml = `<img src="${data.icon.urls[0]}" alt="${iconAlt}" class="mc-cta-icon" loading="lazy">`;
          }
          
          return `<a href="${data.link || '#'}" class="${ctaClasses}" ${ctaStyles ? `style="${ctaStyles}"` : ''}${target}${ariaLabelGeneric}>${ctaIconHtml}${data.text || 'Click here'}</a>`;
        
        case 'genericbadge':
        case 'genericBadge':
          const badgeClasses = data.classes || '';
          const badgeStyles = data.inlineStyles || '';
          return `<span class="mc-generic-badge ${badgeClasses}" ${badgeStyles ? `style="${badgeStyles}"` : ''}>${data.text || ''}</span>`;
        
        case 'genericcard':
        case 'genericCard':
          let genericCardHtml = '<div class="mc-generic-card"';
          if (data.id) genericCardHtml += ` id="${data.id}"`;
          if (data.classes) genericCardHtml += ` class="mc-generic-card ${data.classes}"`;
          if (data.inlineStyles) genericCardHtml += ` style="${data.inlineStyles}"`;
          if (data.isClickable) genericCardHtml += ' data-clickable="true"';
          genericCardHtml += '>';
          
          if (data.badge && data.badge.text) {
            const badgeClassesCard = data.badge.classes || '';
            const badgeStylesCard = data.badge.inlineStyles || '';
            genericCardHtml += `<span class="mc-card-badge ${badgeClassesCard}" ${badgeStylesCard ? `style="${badgeStylesCard}"` : ''}>${data.badge.text}</span>`;
          }
          
          if (data.asset && data.asset.type) {
            if (data.asset.type === 'image' && data.asset.urls && data.asset.urls.length > 0) {
              const imgClasses = data.asset.classes || '';
              const altText = data.asset.altText || '';
              genericCardHtml += `<div class="mc-card-image ${imgClasses}">`;
              genericCardHtml += `<img src="${data.asset.urls[0]}" alt="${altText}" loading="lazy">`;
              genericCardHtml += '</div>';
            }
          }
          
          genericCardHtml += '<div class="mc-card-content">';
          
          if (data.heading && data.heading.text) {
            const headingTagCard = data.heading.tag || 'h3';
            const headingClassesCard = data.heading.classes || '';
            const headingStylesCard = data.heading.inlineStyles || '';
            genericCardHtml += `<${headingTagCard} class="mc-card-title ${headingClassesCard}" ${headingStylesCard ? `style="${headingStylesCard}"` : ''}>${data.heading.text}</${headingTagCard}>`;
          }
          
          if (data.description) {
            genericCardHtml += `<div class="mc-card-description">${data.description}</div>`;
          }
          
          if (data.cta && data.cta.length > 0) {
            genericCardHtml += '<div class="mc-card-ctas">';
            data.cta.forEach(cta => {
              const ctaClassesCard = cta.classes || 'mc-cta-link';
              const ctaStylesCard = cta.inlineStyles || '';
              const targetCard = cta.openInNewTab ? ' target="_blank" rel="noopener"' : '';
              const ariaLabelCard = cta.ariaLabel ? ` aria-label="${cta.ariaLabel}"` : '';
              genericCardHtml += `<a href="${cta.link}" class="${ctaClassesCard}" ${ctaStylesCard ? `style="${ctaStylesCard}"` : ''}${targetCard}${ariaLabelCard}>${cta.text}</a>`;
            });
            genericCardHtml += '</div>';
          }
          
          genericCardHtml += '</div>';
          genericCardHtml += '</div>';
          return genericCardHtml;
        
        default:
          // 🔧 CRITICAL: ALWAYS render something, never return empty
          console.warn(`⚠️ [SDK] Unknown component type: ${componentType}, rendering fallback`);
          
          let genericContent = '';
          let hasRichText = false;
          
          // Extract title - handle both string and object heading
          let title = componentType || 'Content';
          if (data.title) {
            title = data.title;
          } else if (data.heading) {
            if (typeof data.heading === 'string') {
              title = data.heading;
            } else if (typeof data.heading === 'object' && data.heading.text) {
              title = data.heading.text;
            }
          } else if (data.name) {
            title = data.name;
          }
          
          // Try to extract meaningful content from data
          Object.keys(data).forEach(key => {
            const value = data[key];
            
            if (!value || key === 'sys' || key === 'metadata' || key === 'title' || key === 'heading' || key === 'name') {
              return;
            }
            
            if (value && typeof value === 'object' && value.nodeType === 'document') {
              hasRichText = true;
              const html = this.richTextToHtml(value);
              if (html) {
                genericContent += `
                  <div class="mc-field">
                    <div class="mc-field-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div class="mc-richtext">${html}</div>
                  </div>
                `;
              }
            }
            else if (typeof value === 'string' && value.trim()) {
              genericContent += `
                <div class="mc-field">
                  <span class="mc-field-label">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span class="mc-field-value">${value}</span>
                </div>
              `;
            }
            else if (Array.isArray(value) && value.length > 0) {
              const arrayItems = value.map(item => {
                if (typeof item === 'string') return item;
                if (item.title || item.name) return item.title || item.name;
                return JSON.stringify(item);
              }).join(', ');
              
              genericContent += `
                <div class="mc-field">
                  <span class="mc-field-label">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span class="mc-field-value">${arrayItems}</span>
                </div>
              `;
            }
          });
          
          // 🔧 ALWAYS show something, even if no content extracted
          if (!genericContent) {
            // Check if this is the fallback component from backend
            const isFallback = component && (component.id === 'fallback-default-component' || component.source === 'system-fallback');
            
            if (isFallback) {
              // Render the fallback component properly
              return `
                <div class="mc-alert mc-alert-info" style="margin: 24px auto; max-width: 800px; padding: 32px 24px; background-color: #f0f4f8; border-radius: 8px; border: 1px solid #d1d9e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <div style="display: flex; align-items: start; gap: 16px;">
                    <span style="font-size: 24px;">ℹ️</span>
                    <div style="flex: 1;">
                      <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #333;">${data.heading || 'Content Unavailable'}</h3>
                      <p style="margin: 0; line-height: 1.6; color: #555;">${data.message || 'Default content is displayed. The requested content could not be loaded at this time.'}</p>
                    </div>
                  </div>
                </div>
              `;
            }
            
            // Generic unknown component - still show something
            return `
              <div class="mc-debug-component" style="margin: 16px auto; padding: 20px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; max-width: 800px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <span style="font-size: 24px;">⚙️</span>
                  <div class="mc-debug-title" style="font-size: 18px; font-weight: 600; color: #495057;">${title}</div>
                </div>
                <p style="margin: 0 0 12px 0; color: #6c757d; font-size: 14px;">This component type (${componentType}) is not yet supported. Showing raw data:</p>
                <details class="mc-debug-details">
                  <summary style="cursor: pointer; color: #0078d4; font-weight: 500;">View Raw Data</summary>
                  <pre class="mc-debug-pre" style="margin-top: 12px; padding: 12px; background: white; border: 1px solid #dee2e6; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(data, null, 2)}</pre>
                </details>
              </div>
            `;
          }
          
          return `
            <div class="mc-generic-component" style="margin: 16px auto; max-width: 800px;">
              <h3 class="mc-generic-title" style="font-size: 24px; margin-bottom: 16px; color: #333;">${title}</h3>
              ${genericContent}
            </div>
          `;
      }
    },

    startBehaviorTracking: function() {
      document.addEventListener('mouseup', () => {
        if (this.websocketClosed) {
          return;
        }
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
          const textSelection = {
            text: selectedText.substring(0, 200),
            length: selectedText.length,
            timestamp: Date.now()
          };
          
          this.userBehavior.textSelections.push(textSelection);
          if (this.userBehavior.textSelections.length > 10) {
            this.userBehavior.textSelections.shift();
          }
          
          this.userBehavior.lastActivityTime = Date.now();
        }
      });
      
      document.addEventListener('click', (e) => {
        if (this.websocketClosed) {
          return;
        }
        
        this.userBehavior.totalClicks++;
        this.userBehavior.lastActivityTime = Date.now();
        
        let className = null;
        try {
          className = typeof e.target.className === 'string' 
            ? e.target.className 
            : (e.target.className?.baseVal || null);
        } catch (err) {
          className = null;
        }
        
        let elementText = null;
        try {
          if (e.target.innerText) {
            elementText = e.target.innerText.substring(0, 100);
          } else if (e.target.textContent) {
            elementText = e.target.textContent.trim().substring(0, 100);
          } else if (e.target.alt) {
            elementText = e.target.alt.substring(0, 100);
          } else if (e.target.title) {
            elementText = e.target.title.substring(0, 100);
          }
        } catch (err) {
          elementText = null;
        }
        
        const interaction = {
          type: 'click',
          element: e.target.tagName?.toLowerCase() || 'unknown',
          id: e.target.id || null,
          class: className,
          text: elementText,
          href: e.target.href || null,
          timestamp: Date.now()
        };
        
        this.userBehavior.recentInteractions.push(interaction);
        if (this.userBehavior.recentInteractions.length > 10) {
          this.userBehavior.recentInteractions.shift();
        }
      });
      
      let hoverTimeout;
      document.addEventListener('mouseover', (e) => {
        if (this.websocketClosed) {
          clearTimeout(hoverTimeout);
          return;
        }
        
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          this.userBehavior.totalHovers++;
          this.userBehavior.lastActivityTime = Date.now();
          
          let elementText = null;
          try {
            if (e.target.innerText && e.target.innerText.trim()) {
              elementText = e.target.innerText.trim().substring(0, 100);
            } else if (e.target.textContent && e.target.textContent.trim()) {
              elementText = e.target.textContent.trim().substring(0, 100);
            } else if (e.target.alt) {
              elementText = e.target.alt.substring(0, 100);
            } else if (e.target.title) {
              elementText = e.target.title.substring(0, 100);
            } else if (e.target.placeholder) {
              elementText = e.target.placeholder.substring(0, 100);
            }
          } catch (err) {
            elementText = null;
          }
          
          const hover = {
            element: e.target.tagName?.toLowerCase() || 'unknown',
            id: e.target.id || null,
            text: elementText,
            timestamp: Date.now()
          };
          
          this.userBehavior.recentHovers.push(hover);
          if (this.userBehavior.recentHovers.length > 20) {
            this.userBehavior.recentHovers.shift();
          }
        }, 500);
      });
    },

    updateGeolocationData: async function() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          this.userBehavior.ip = data.ip;
          this.userBehavior.country = data.country_name;
          this.userBehavior.city = data.city;
          
          if (data.timezone) {
            this.userBehavior.timezone = data.timezone;
          }
        } else if (response.status === 403 || response.status === 429) {
          // Rate limited or forbidden - silently skip, not critical for functionality
          console.log('[MindContent SDK] ℹ️ Geolocation API rate limited, continuing without location data');
        }
      } catch (error) {
        // Network error or timeout - non-critical, continue without geolocation
        if (error.name !== 'AbortError') {
          console.log('[MindContent SDK] ℹ️ Geolocation unavailable, continuing without location data');
        }
      }
    },

    sanitizeForPostMessage: function(obj) {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitizeForPostMessage(item));
      }
      
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          
          if (value instanceof Node || 
              value instanceof Window || 
              typeof value === 'function' ||
              value instanceof SVGAnimatedString) {
            continue;
          }
          
          if (typeof value === 'object' && value !== null) {
            sanitized[key] = this.sanitizeForPostMessage(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      
      return sanitized;
    },

    getNewUserBehavior: function() {
      const now = Date.now();
      const sessionDuration = this.sessionStart ? Math.floor((now - this.sessionStart) / 1000) : 0;
      const timeSinceLastActivity = this.userBehavior.lastActivityTime 
        ? Math.floor((now - this.userBehavior.lastActivityTime) / 1000) 
        : 0;
      
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const connectionType = connection ? (connection.effectiveType || 'unknown') : 'unknown';
      const downlink = connection ? connection.downlink : null;
      const rtt = connection ? connection.rtt : null;
      const networkType = connection ? (connection.type || 'unknown') : 'unknown';
      
      const deviceType = this.getDeviceType();
      
      const newInteractions = this.userBehavior.recentInteractions.filter(
        interaction => interaction.timestamp > this.lastSentTimestamp
      );
      
      const newHovers = this.userBehavior.recentHovers.filter(
        hover => hover.timestamp > this.lastSentTimestamp
      );
      
      const newTextSelections = this.userBehavior.textSelections.filter(
        selection => selection.timestamp > this.lastSentTimestamp
      );
      
      const newScrollPattern = this.userBehavior.scrollPattern.filter(
        scroll => scroll.timestamp > this.lastSentTimestamp
      );
      
      this.lastSentTimestamp = now;
      
      const deviceContext = {
        screenResolution: this.userBehavior.screenResolution,
        deviceType: deviceType,
        userAgent: this.userBehavior.userAgent,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city
      };
      
      return {
        sessionDuration: sessionDuration,
        previousPage: this.userBehavior.previousPage,
        timeSinceLastActivity: timeSinceLastActivity,
        totalClicks: this.userBehavior.totalClicks,
        totalHovers: this.userBehavior.totalHovers,
        recentInteractions: newInteractions,
        recentHovers: newHovers,
        textSelections: newTextSelections,
        scrollPattern: newScrollPattern,
        totalInteractions: this.userBehavior.totalClicks + this.userBehavior.totalHovers,
        userAgent: this.userBehavior.userAgent,
        screenResolution: this.userBehavior.screenResolution,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        deviceType: deviceType,
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        net: connectionType,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        deviceContext: deviceContext
      };
    },

    getUserBehavior: function() {
      const now = Date.now();
      const sessionDuration = this.sessionStart ? Math.floor((now - this.sessionStart) / 1000) : 0;
      const timeSinceLastActivity = this.userBehavior.lastActivityTime 
        ? Math.floor((now - this.userBehavior.lastActivityTime) / 1000) 
        : 0;
      
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const connectionType = connection ? (connection.effectiveType || 'unknown') : 'unknown';
      const downlink = connection ? connection.downlink : null;
      const rtt = connection ? connection.rtt : null;
      const networkType = connection ? (connection.type || 'unknown') : 'unknown';
      
      const deviceType = this.getDeviceType();
      
      const deviceContext = {
        screenResolution: this.userBehavior.screenResolution,
        deviceType: deviceType,
        userAgent: this.userBehavior.userAgent,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city
      };
      
      return {
        sessionDuration: sessionDuration,
        previousPage: this.userBehavior.previousPage,
        timeSinceLastActivity: timeSinceLastActivity,
        totalClicks: this.userBehavior.totalClicks,
        totalHovers: this.userBehavior.totalHovers,
        recentInteractions: this.userBehavior.recentInteractions,
        recentHovers: this.userBehavior.recentHovers,
        textSelections: this.userBehavior.textSelections,
        scrollPattern: this.userBehavior.scrollPattern,
        totalInteractions: this.userBehavior.totalClicks + this.userBehavior.totalHovers,
        userAgent: this.userBehavior.userAgent,
        screenResolution: this.userBehavior.screenResolution,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        deviceType: deviceType,
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        net: connectionType,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        deviceContext: deviceContext
      };
    },

    logUserBehavior: function() {
      const behavior = this.getUserBehavior();
      return behavior;
    },

    getDeviceType: function() {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
      }
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
      }
      return 'desktop';
    },

    sendMessage: function(message) {
      if (!this.iframe || !this.iframe.contentWindow) {
        return;
      }
      
      const sanitizedMessage = this.sanitizeForPostMessage(message);
      this.iframe.contentWindow.postMessage(sanitizedMessage, this.config.reactAppUrl);
    },

    startScrollTracking: function() {
      let scrollTimeout;
      
      const sendScrollEvent = () => {
        if (this.websocketClosed || this.pageNotConfigured) {
          return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        
        this.userBehavior.scrollPattern.push({
          percent: Math.round(scrollPercent),
          timestamp: Date.now()
        });
        if (this.userBehavior.scrollPattern.length > 20) {
          this.userBehavior.scrollPattern.shift();
        }
        
        const userBehavior = this.getNewUserBehavior();
        
        const selectedUserId = localStorage.getItem('mindcontent_selected_user');
        const realUserId = (selectedUserId && selectedUserId !== 'anonymous') ? selectedUserId : null;
        
        this.sendMessage({
          type: 'scroll_event',
          scrollPercent: Math.round(scrollPercent * 10) / 10,
          userBehavior: userBehavior,
          selectedUserId: realUserId
        });
      };
      
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(sendScrollEvent, 200);
      });
    },

    destroy: function() {
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
        this.messageHandler = null;
      }
      
      if (this.toggleButton) {
        this.toggleButton.remove();
        this.toggleButton = null;
      }
      
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
    },
    
    toggleAccordion: function(itemId) {
      const item = document.querySelector('[data-item-id="' + itemId + '"]');
      if (!item) return;
      
      const button = item.querySelector('.mc-accordion-header');
      const content = item.querySelector('.mc-accordion-content');
      const icon = item.querySelector('.mc-accordion-icon');
      
      if (!button || !content || !icon) return;
      
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        // Close
        button.setAttribute('aria-expanded', 'false');
        content.style.maxHeight = '0';
        content.style.padding = '0 24px';
        icon.style.transform = 'rotate(0deg)';
        item.style.boxShadow = 'none';
        button.style.background = 'white';
      } else {
        // Open
        button.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 60 + 'px';
        content.style.padding = '0 24px';
        icon.style.transform = 'rotate(180deg)';
        item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        button.style.background = '#f9fafb';
      }
    },
    
    testLoading: function() {
      this.injectLoadingPlaceholder('test-' + Date.now());
    },

    // ========================================
    // 🗺️ HEATMAP TRACKING FUNCTIONS
    // ========================================

    findComponentAtPosition: function(x, y) {
      /**
       * Find which component is under the cursor position
       * Returns component data or null if not over a component
       */
      const components = document.querySelectorAll('[data-component-id]');
      
      for (const comp of components) {
        const rect = comp.getBoundingClientRect();
        const absoluteTop = window.pageYOffset + rect.top;
        const absoluteBottom = absoluteTop + rect.height;
        
        // Check if cursor is within component bounds
        if (y >= absoluteTop && y <= absoluteBottom && 
            x >= rect.left && x <= rect.right) {
          
          return {
            id: comp.getAttribute('data-component-id'),
            type: comp.getAttribute('data-component-type') || 'unknown',
            dbId: comp.getAttribute('data-db-id') || null,
            order: parseInt(comp.getAttribute('data-order') || '0'),
            relativeY: y - absoluteTop,
            height: rect.height,
            width: rect.width,
            top: absoluteTop
          };
        }
      }
      
      return null; // Cursor not over any component
    },

    getComponentsSnapshot: function() {
      /**
       * Capture snapshot of all visible components
       * Used to reconstruct page layout for heatmap visualization
       */
      const components = document.querySelectorAll('[data-component-id]');
      const snapshot = [];
      
      components.forEach((comp, index) => {
        const rect = comp.getBoundingClientRect();
        snapshot.push({
          id: comp.getAttribute('data-component-id'),
          type: comp.getAttribute('data-component-type') || 'unknown',
          dbId: comp.getAttribute('data-db-id') || null,
          order: index,
          top: window.pageYOffset + rect.top,
          height: rect.height,
          width: rect.width
        });
      });
      
      return snapshot;
    },

    startMouseTracking: function() {
      /**
       * Initialize mouse tracking for heatmap
       * Captures mouse positions with throttling and sends in batches
       */
      // In tracking-only mode, allow heatmap even if websocketClosed
      // because the WebSocket should stay open for heatmap data
      if (this.pageNotConfigured) {
        return;
      }

      // Mouse move listener with throttle
      document.addEventListener('mousemove', (e) => {
        // Always stop if page is not configured
        if (this.pageNotConfigured) {
          if (this.mouseMoveTimeout) {
            clearTimeout(this.mouseMoveTimeout);
            this.mouseMoveTimeout = null;
          }
          return;
        }
        
        // In normal mode (not tracking-only), stop if websocket closed
        // In tracking-only mode, websocket should never close, so always allow
        if (!this.config.trackingOnly && this.websocketClosed) {
          if (this.mouseMoveTimeout) {
            clearTimeout(this.mouseMoveTimeout);
            this.mouseMoveTimeout = null;
          }
          return;
        }
        
        // Throttle: capture every 100ms
        if (this.mouseMoveTimeout) return;
        
        this.mouseMoveTimeout = setTimeout(() => {
          const pageX = e.pageX;
          const pageY = e.pageY;
          
          // Find component under cursor
          const component = this.findComponentAtPosition(pageX, pageY);
          
          // Create position entry
          const position = {
            x: Math.round(pageX),
            y: Math.round(pageY),
            t: Date.now()
          };
          
          // Add component context if cursor is over a component
          if (component) {
            position.cId = component.id;
            position.cType = component.type;
            if (component.dbId) position.cDbId = component.dbId;
            position.cOrder = component.order;
            position.cY = Math.round(component.relativeY);
            position.cHeight = Math.round(component.height);
          }
          
          this.mousePositionBuffer.push(position);
          
          // Send batch if buffer is full
          if (this.mousePositionBuffer.length >= this.HEATMAP_BATCH_SIZE) {
            this.sendHeatmapBatch();
          }
          
          this.mouseMoveTimeout = null;
        }, 100);
      });

      // Timer to send batch periodically (every 15 seconds)
      this.heatmapSendInterval = setInterval(() => {
        if (this.mousePositionBuffer.length > 0) {
          this.sendHeatmapBatch();
        }
      }, this.HEATMAP_SEND_INTERVAL);

      // Send before page unload
      window.addEventListener('beforeunload', () => {
        this.sendHeatmapBatch();
      });

      console.log('[MindContent SDK] 🗺️ Mouse tracking started for heatmap');
    },

    sendHeatmapBatch: function() {
      /**
       * Send batch of mouse positions via WebSocket
       */
      if (!this.iframe || !this.iframe.contentWindow) {
        return;
      }

      // Always stop if page is not configured
      if (this.pageNotConfigured) {
        return;
      }
      
      // In normal mode (not tracking-only), stop if websocket closed
      // In tracking-only mode, websocket should never close, so always allow
      if (!this.config.trackingOnly && this.websocketClosed) {
        return;
      }

      if (this.mousePositionBuffer.length === 0) {
        return;
      }

      try {
        const message = {
          type: 'heatmap_batch',
          userId: this.config.userId || localStorage.getItem('user_id'),
          sessionId: this.getOrCreateSessionId(),
          pageUrl: window.location.href,
          positions: this.mousePositionBuffer,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          scrollHeight: document.documentElement.scrollHeight,
          deviceType: this.getDeviceType(),
          componentsSnapshot: this.getComponentsSnapshot()
        };

        // Send via postMessage to iframe (which forwards to WebSocket)
        const sanitizedMessage = this.sanitizeForPostMessage(message);
        this.iframe.contentWindow.postMessage(sanitizedMessage, this.config.reactAppUrl);

        console.log(`[MindContent SDK] 🗺️ Sent heatmap batch: ${this.mousePositionBuffer.length} positions`);
        
        // Clear buffer
        this.mousePositionBuffer = [];
        this.lastHeatmapSend = Date.now();
        
      } catch (error) {
        console.error('[MindContent SDK] ❌ Error sending heatmap batch:', error);
      }
    }
  };

  // Auto-initialization function
  function autoInitialize() {
    const container = document.getElementById('mindcontent');    
    if (container) {
      const pageId = container.getAttribute('data-page-id');
      const apiUrl = container.getAttribute('data-api-url');  
      const initConfig = { pageId: pageId };
      if (apiUrl) {
        initConfig.reactAppUrl = apiUrl;
      }
      MindContent.init(initConfig);
    } else {
      console.log('[MindContent SDK] 📊 No div#mindcontent found - initializing in tracking-only mode');
      MindContent.init({});  // Initialize without pageId for tracking-only mode
    }
  }
  
  // Auto-init: supports both DOMContentLoaded and dynamic loading
  if (document.readyState === 'loading') {
    // DOM still loading
    document.addEventListener('DOMContentLoaded', autoInitialize);
  } else {
    // DOM already loaded (script loaded dynamically)
    autoInitialize();
  }

  window.MindContent = MindContent;

})(window);
