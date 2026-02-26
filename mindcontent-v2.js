/**
 * MindContent SDK - Embed Version
 * Version: 2.0.0
 * 
 * Este SDK embeda o aplicativo React completo via iframe.
 * Toda a lógica de WebSocket, sidebar, e logs fica no React.
 * 
 * Usage:
 * <script src="mindcontent.js"></script>
 * <div id="mindcontent"></div>
 * 
 * The SDK automatically detects the current page URL and loads
 * the appropriate content configuration from the backend.
 */

(function(window) {
  'use strict';

  const MindContent = {
    version: '2.0.0',
    config: {
      reactAppUrl: 'http://localhost:5173',
      containerId: 'mindcontent',
      pageUrl: null, // Will be set to current page URL
      autoInit: true
    },
    iframe: null,
    container: null,
    toggleButton: null, // Fixed button outside iframe
    sidebarOpen: false, // Track sidebar state
    messageHandler: null, // Store handler to remove later
    websocketClosed: false, // Flag to stop sending scroll events after WebSocket closes
    sessionStart: null, // Track session start time
    lastSentTimestamp: 0, // Track last sent interaction timestamp to avoid duplicates
    userBehavior: { // Track user behavior data
      totalClicks: 0,
      totalHovers: 0,
      recentInteractions: [],
      recentHovers: [],
      scrollPattern: [],
      textSelections: [], // Track text selections
      lastActivityTime: null,
      previousPage: null,
      userAgent: null,
      screenResolution: null,
      timezone: null,
      language: null,
      batteryLevel: null,
      isCharging: false,
      ip: null,
      country: null,
      city: null,
      frameRate: 60,
      performance: 100
    },

    /**
     * Initialize the SDK
     */
    init: function(options) {
      this.config = { ...this.config, ...options };
      
      // � SHOW INTENT MODAL FIRST (before anything else)
      this.showIntentModal();
      this.continueInit();
    },
    
    /**
     * Show intent selection modal (non-blocking)
     */    showIntentModal: function() {
      // Ensure DOM is ready
      if (!document.body) {
        console.warn('[MindContent] DOM not ready yet, waiting...');
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
      
      // Choose random intent
      const randomIntent = possibleIntents[Math.floor(Math.random() * possibleIntents.length)];
      console.log('[MindContent] 🎯 Random intent selected:', randomIntent);
      
      // Store selected intent for later use
      this.config.simulatedIntent = randomIntent;
      
      // Create improved modal HTML with AI consent checkbox
      const modalHTML = `
        <div id="mindcontent-intent-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999999;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          animation: fadeIn 0.3s ease-out;
        ">
          <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          </style>
          <div style="
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 580px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4), 0 0 1px rgba(0, 0, 0, 0.2);
            text-align: center;
            animation: slideUp 0.4s ease-out;
          ">
            <div style="
              font-size: 32px;
              font-weight: 700;
              background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 16px;
              letter-spacing: -0.5px;
            ">AI-Powered Experience</div>
            
            <div style="
              font-size: 14px;
              color: #666;
              margin-bottom: 32px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 1px;
            ">Proof of Concept</div>
            
            <div style="
              font-size: 15px;
              color: #444;
              line-height: 1.7;
              margin-bottom: 28px;
              text-align: left;
              padding: 0 8px;
            ">This is a <strong>proof of concept</strong> demonstrating real-time AI interactions. 
            You'll be assigned a suggested intent below. Please navigate through the page naturally 
            so we can observe how AI adapts to your behavior and provides contextual content.</div>
            
            <div style="
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 28px;
              border: 2px solid #90caf9;
            ">
              <div style="
                font-size: 13px;
                color: #1976d2;
                margin-bottom: 8px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">Your Suggested Intent</div>
              <div style="
                font-size: 22px;
                font-weight: 700;
                color: #0d47a1;
                line-height: 1.4;
              ">${randomIntent}</div>
            </div>
            
            <div style="
              background: #fff;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 32px;
              text-align: left;
            ">
              <label style="
                display: flex;
                align-items: start;
                cursor: pointer;
                user-select: none;
              ">
                <input type="checkbox" id="mindcontent-ai-consent" style="
                  width: 20px;
                  height: 20px;
                  margin-right: 12px;
                  margin-top: 2px;
                  cursor: pointer;
                  flex-shrink: 0;
                "/>
                <span style="
                  font-size: 14px;
                  color: #333;
                  line-height: 1.5;
                ">
                  <strong>I consent to AI-powered interactions</strong><br>
                  <span style="font-size: 13px; color: #666;">
                    I understand this is a demonstration and my interactions will be analyzed by AI 
                    to provide personalized content recommendations in real-time.
                  </span>
                </span>
              </label>
            </div>
            
            <button id="mindcontent-intent-start-btn" disabled style="
              background: #ccc;
              color: #999;
              border: none;
              border-radius: 8px;
              padding: 16px 48px;
              font-size: 17px;
              font-weight: 700;
              cursor: not-allowed;
              transition: all 0.3s;
              box-shadow: none;
              width: 100%;
              letter-spacing: 0.5px;
            ">Start Experience</button>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      console.log('[MindContent] 📋 Intent modal displayed');
      
      const startBtn = document.getElementById('mindcontent-intent-start-btn');
      const consentCheckbox = document.getElementById('mindcontent-ai-consent');
      
      consentCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          startBtn.disabled = false;
          startBtn.style.background = 'linear-gradient(135deg, #0078d4 0%, #005a9e 100%)';
          startBtn.style.color = 'white';
          startBtn.style.cursor = 'pointer';
          startBtn.style.boxShadow = '0 4px 16px rgba(0, 120, 212, 0.4)';
          console.log('[MindContent] ✅ AI consent granted, button enabled');
        } else {
          startBtn.disabled = true;
          startBtn.style.background = '#ccc';
          startBtn.style.color = '#999';
          startBtn.style.cursor = 'not-allowed';
          startBtn.style.boxShadow = 'none';
          console.log('[MindContent] ⚠️ AI consent revoked, button disabled');
        }
      });
      
      startBtn.addEventListener('mouseenter', () => {
        if (!startBtn.disabled) {
          startBtn.style.transform = 'translateY(-2px)';
          startBtn.style.boxShadow = '0 6px 20px rgba(0, 120, 212, 0.5)';
        }
      });
      
      startBtn.addEventListener('mouseleave', () => {
        if (!startBtn.disabled) {
          startBtn.style.transform = 'translateY(0)';
          startBtn.style.boxShadow = '0 4px 16px rgba(0, 120, 212, 0.4)';
        }
      });
      
      startBtn.addEventListener('click', () => {
        if (startBtn.disabled) return;
        
        console.log('[MindContent] ✅ User clicked Start with intent:', randomIntent);
        console.log('[MindContent] ✅ AI consent: granted');
        
        localStorage.setItem('mindcontent_simulated_intent', randomIntent);
        localStorage.setItem('mindcontent_ai_consent', 'true');
        console.log('[MindContent] 💾 Intent and consent saved to localStorage');
        
        const modal = document.getElementById('mindcontent-intent-modal');
        if (modal) {
          modal.remove();
          console.log('[MindContent] 🚀 Modal closed, experience started');
        }
      });
    },
    
    /**
     * Continue initialization after intent modal is closed
     */
    continueInit: function() {
      // �🆕 Get or create user_id in localStorage
      let userId = localStorage.getItem('user_id');
      if (!userId) {
        // Generate new UUID (using crypto API for better randomness)
        if (window.crypto && window.crypto.randomUUID) {
          userId = crypto.randomUUID();
        } else {
          // Fallback for older browsers
          userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        localStorage.setItem('user_id', userId);
        console.log('[MindContent] 🆕 Generated new user_id:', userId);
      } else {
        console.log('[MindContent] ♻️ Using existing user_id:', userId);
      }
      this.config.userId = userId;
      
      // Capture current page URL (without hash)
      if (!this.config.pageUrl) {
        this.config.pageUrl = window.location.origin + window.location.pathname;
      }
      
      console.log('[MindContent] Initializing for page:', this.config.pageUrl);
      console.log('[MindContent] User ID:', this.config.userId);
      
      // Initialize session tracking
      this.sessionStart = Date.now();
      this.userBehavior.previousPage = document.referrer || 'Direct';
      this.userBehavior.userAgent = navigator.userAgent;
      this.userBehavior.screenResolution = `${window.screen.width}x${window.screen.height}`;
      this.userBehavior.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.userBehavior.language = navigator.language || navigator.userLanguage;
      this.userBehavior.lastActivityTime = Date.now();
      
      console.log('[MindContent] 📊 Initial data collected:', {
        screen: this.userBehavior.screenResolution,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        previousPage: this.userBehavior.previousPage
      });
      
      // Update battery info (async)
      this.updateBatteryInfo();
      
      // Update geolocation data (async)
      this.updateGeolocationData();
      
      // Start behavior tracking
      this.startBehaviorTracking();
      
      if (this.config.autoInit) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.embedReactApp();
          });
        } else {
          this.embedReactApp();
        }
      }
    },

    /**
     * Embed React app via iframe
     */
    embedReactApp: function() {
      console.log('[MindContent] Embedding React app...');
      
      // Find or create container
      let container = document.getElementById(this.config.containerId);
      if (!container) {
        console.error('[MindContent] Container not found:', this.config.containerId);
        return;
      }
      
      this.container = container;
      
      // Create iframe - Covers entire viewport but is transparent
      const iframe = document.createElement('iframe');
      iframe.id = 'mindcontent-iframe';
      iframe.src = `${this.config.reactAppUrl}/embed`;
      iframe.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
        z-index: 999999;
        background: transparent;
        pointer-events: none;
      `;
      iframe.setAttribute('allowtransparency', 'true');
      
      // Load handler
      iframe.onload = () => {
        console.log('[MindContent] React app loaded successfully');
        this.iframe = iframe;
        this.setupCommunication();
        this.startScrollTracking();
      };
      
      // Error handler
      iframe.onerror = (e) => {
        console.error('[MindContent] Failed to load React app:', e);
      };
      
      // Append iframe to body (not container, to be truly fixed)
      document.body.appendChild(iframe);
      
      console.log('[MindContent] Iframe created, loading React app from:', iframe.src);
      
      // Create fixed toggle button outside iframe
      this.createToggleButton();
    },

    /**
     * Create fixed toggle button outside iframe
     */
    createToggleButton: function() {
      console.log('[MindContent] Creating fixed toggle button...');
      
      // Create button
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
      
      button.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        padding: 0;
      `;
      
      // Status indicator
      const indicator = button.querySelector('#mindcontent-status-indicator');
      indicator.style.cssText = `
        position: absolute;
        top: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: #ef4444;
        border: 2px solid white;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        z-index: 2000;
      `;
      
      // Hover effect
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
      });
      
      // Click handler - toggle sidebar
      button.addEventListener('click', () => {
        this.toggleSidebar();
      });
      
      document.body.appendChild(button);
      this.toggleButton = button;
      
      console.log('[MindContent] ✅ Fixed toggle button created');
    },

    /**
     * Toggle sidebar open/close
     */
    toggleSidebar: function() {
      this.sidebarOpen = !this.sidebarOpen;
      
      console.log('[MindContent] 🎯 Toggling sidebar:', this.sidebarOpen ? 'OPEN' : 'CLOSED');
      
      // Update iframe pointer-events
      if (this.iframe) {
        this.iframe.style.pointerEvents = this.sidebarOpen ? 'auto' : 'none';
        console.log('[MindContent] 🖱️ Iframe pointer-events:', this.iframe.style.pointerEvents);
      }
      
      // Send message to React to open/close sidebar
      this.sendMessage({
        type: 'toggle_sidebar',
        isOpen: this.sidebarOpen
      });
    },

    /**
     * Update toggle button status indicator
     */
    updateButtonStatus: function(status) {
      if (!this.toggleButton) return;
      
      const indicator = this.toggleButton.querySelector('#mindcontent-status-indicator');
      if (!indicator) return;
      
      // Update indicator color based on status
      if (status === 'Connected') {
        indicator.style.backgroundColor = '#10b981';
        indicator.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.6)';
      } else if (status === 'Completed') {
        indicator.style.backgroundColor = '#3b82f6';
        indicator.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.6)';
      } else {
        indicator.style.backgroundColor = '#ef4444';
        indicator.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
      }
    },

    /**
     * Setup communication with React app via postMessage
     */
    setupCommunication: function() {
      if (!this.iframe) return;
      
      // Remove existing message handler if it exists
      if (this.messageHandler) {
        console.log('[MindContent] 🗑️ Removing existing message handler to prevent duplicates');
        window.removeEventListener('message', this.messageHandler);
      }
      
      // Create and store new message handler
      this.messageHandler = (event) => {
        const message = event.data;
        
        // Only process messages with our expected types
        const validTypes = ['mindcontent_ready', 'mindcontent_log', 'mindcontent_component', 'mindcontent_loading', 'mindcontent_remove_loading', 'initial_decision', 'mindcontent_websocket_closed', 'mindcontent_status_update', 'sidebar_opened', 'sidebar_closed'];
        if (!message || !message.type || !validTypes.includes(message.type)) {
          return; // Ignore non-MindContent messages
        }
        
        console.log('[MindContent] 📨 Received message:', message.type, message);
        
        // Verify origin for security (but be flexible for localhost)
        const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
        const isExpectedOrigin = event.origin.startsWith(this.config.reactAppUrl);
        
        if (!isLocalhost && !isExpectedOrigin) {
          console.warn('[MindContent] ⚠️ Message from unexpected origin:', event.origin);
          return;
        }
        
        // Handle different message types
        if (message.type === 'mindcontent_websocket_closed') {
          console.log('🔌 [MindContent] WebSocket closed, stopping all event tracking (scroll, clicks, hovers, text selection)');
          this.websocketClosed = true;
          
          // Remove all remaining loading placeholders
          this.removeAllLoadingPlaceholders();
        } else if (message.type === 'mindcontent_status_update') {
          // Update button status indicator
          console.log('[MindContent] 📡 Status update:', message.status);
          this.updateButtonStatus(message.status);
        } else if (message.type === 'sidebar_opened' || message.type === 'sidebar_closed') {
          // Sidebar state confirmed by React
          console.log('[MindContent] ✅ Sidebar state confirmed:', message.type);
          this.sidebarOpen = message.type === 'sidebar_opened';
          
          // Ensure pointer-events are correct
          if (this.iframe) {
            this.iframe.style.pointerEvents = this.sidebarOpen ? 'auto' : 'none';
          }
        } else if (message.type === 'mindcontent_remove_all_loading') {
          console.log('[MindContent] 🗑️ Removing all loading placeholders (completion)');
          this.removeAllLoadingPlaceholders();
        } else if (message.type === 'mindcontent_remove_loading') {
          console.log('[MindContent] 🗑️ Removing loading placeholder:', message.loadingId);
          this.removeLoadingPlaceholder(message.loadingId);
        } else if (message.type === 'mindcontent_ready') {
          console.log('[MindContent] ✅ React app is ready, sending config with pageUrl:', this.config.pageUrl, 'userId:', this.config.userId);
          
          // Send configuration to React app with page URL and user ID
          this.sendMessage({
            type: 'config',
            data: {
              pageUrl: this.config.pageUrl,
              userId: this.config.userId
            }
          });
        } else if (message.type === 'mindcontent_log') {
          console.log('[MindContent] Log from React:', message.data);
        } else if (message.type === 'mindcontent_component') {
          console.log('[MindContent] 🎨 Received component:', message.component);
          this.injectComponent(message.component);
        } else if (message.type === 'mindcontent_loading') {
          console.log('='.repeat(60));
          console.log('[MindContent] 🚨 LOADING MESSAGE RECEIVED!!!');
          console.log('[MindContent] 🎯 Loading ID:', message.loadingId);
          console.log('[MindContent] 🎯 Calling injectLoadingPlaceholder...');
          console.log('='.repeat(60));
          this.injectLoadingPlaceholder(message.loadingId);
          console.log('[MindContent] ✅ injectLoadingPlaceholder completed');
        } else if (message.type === 'initial_decision') {
          // Support structured initial_decision with content_id + reasoning
          const initial = {
            content_id: message.content_id ?? message.decision ?? null,
            reasoning: message.reasoning ?? null,
            timestamp: message.timestamp,
            thread_id: message.thread_id
          };
          console.log('[MindContent] 🤖 Initial AI decision received (structured):', initial);

          // If there's a callback registered, call it with structured data
          if (this.config.onInitialDecision && typeof this.config.onInitialDecision === 'function') {
            this.config.onInitialDecision(initial);
          }
        }
      };
      
      // Register the message handler
      console.log('[MindContent] ✅ Registering new message handler');
      window.addEventListener('message', this.messageHandler);
      
      // Send initial ready check
      console.log('[MindContent] 📤 Sending sdk_ready to iframe');
      this.sendMessage({ type: 'sdk_ready' });
    },

    /**
     * Inject loading placeholder
     */
    injectLoadingPlaceholder: function(loadingId) {
      console.log('█'.repeat(60));
      console.log('█ INJECT LOADING PLACEHOLDER CALLED');
      console.log('█ Loading ID:', loadingId);
      console.log('█ Container ID config:', this.config.containerId);
      console.log('█'.repeat(60));
      
      const targetContainer = document.getElementById(this.config.containerId);
      console.log('█ Target container found:', !!targetContainer);
      console.log('█ Target container element:', targetContainer);
      
      if (!targetContainer) {
        console.error('█ ❌ #mindcontent NOT FOUND!');
        alert('ERRO: #mindcontent não encontrado! Ver console.');
        return;
      }
      
      console.log('█ Creating loading div...');

      // Create SIMPLE loading div with spinner
      const loadingDiv = document.createElement('div');
      loadingDiv.setAttribute('data-loading-id', loadingId);
      loadingDiv.style.padding = '100px';
      loadingDiv.style.textAlign = 'center';
      loadingDiv.style.background = 'transparent';
      loadingDiv.style.margin = '20px 0';
      loadingDiv.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 50 50" style="margin: 0 auto; display: block;">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#667eea" stroke-width="4" stroke-dasharray="31.4 31.4" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;

      console.log('█ Appending loading div to container...');
      targetContainer.appendChild(loadingDiv);
      
      console.log('█ ✅ LOADING DIV ADDED!');
      console.log('█ Container children count:', targetContainer.children.length);
      console.log('█ Loading div offsetHeight:', loadingDiv.offsetHeight);
      console.log('█'.repeat(60));
    },

    /**
     * Remove all loading placeholders
     */
    removeAllLoadingPlaceholders: function() {
      const targetContainer = document.getElementById(this.config.containerId);
      if (!targetContainer) return;
      
      const loadingDivs = targetContainer.querySelectorAll('[data-loading-id]');
      console.log('[MindContent] 🗑️ Found', loadingDivs.length, 'loading placeholders to remove');
      
      loadingDivs.forEach(div => {
        console.log('[MindContent] 🗑️ Removing loading:', div.getAttribute('data-loading-id'));
        div.remove();
      });
    },

    /**
     * Remove a specific loading placeholder by ID
     */
    removeLoadingPlaceholder: function(loadingId) {
      if (!loadingId) return;
      const loadingDiv = document.querySelector(`[data-loading-id="${loadingId}"]`);
      if (loadingDiv) {
        loadingDiv.remove();
      }
    },

    /**
     * Inject component into the page
     */
    injectComponent: function(component) {
      console.log('[MindContent] 💉 Injecting component:', component.componentType);
      
      // Remove loading div if it exists
      const loadingDiv = document.querySelector(`[data-loading-id="${component.loadingId}"]`);
      if (loadingDiv) {
        console.log('[MindContent] 🗑️ Removing loading div');
        loadingDiv.remove();
      }
      
      const targetContainer = document.getElementById(this.config.containerId);
      if (!targetContainer) {
        console.error('[MindContent] ❌ #mindcontent not found!');
        return;
      }

      // Create component HTML
      const componentHtml = this.renderComponent(component);
      
      const wrapper = document.createElement('div');
      wrapper.className = 'mindcontent-dynamic-component';
      wrapper.setAttribute('data-component-id', component.id);
      wrapper.innerHTML = componentHtml;
      wrapper.style.margin = '20px 0';
      wrapper.style.paddingTop = '50px';
      wrapper.style.paddingBottom = '50px';
      wrapper.style.opacity = '0';
      wrapper.style.transition = 'opacity 0.5s ease';
      
      targetContainer.appendChild(wrapper);
      
      // Trigger fade-in animation
      setTimeout(() => {
        wrapper.style.opacity = '1';
      }, 10);
      
      console.log('[MindContent] ✅ Component injected with fade-in!');
    },

    /**
     * 🎨 STYLE TOKENS - Shared design system
     * Prevents duplication and ensures consistency
     */
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

    /**
     * Render component HTML based on type and data
     */
    renderComponent: function(component) {
      const { componentType, data } = component;
      
      console.log('[MindContent] 🎨 Rendering component:', componentType, data);
      
      // Map Contentful types to render functions
      const normalizedType = (componentType || '').toLowerCase();
      
      // Simple HTML rendering for each component type
      switch(normalizedType) {
        case 'herobanner':
        case 'hero':
          return `
            <style>
              .mc-hero-btn {
                background: ${this.STYLE_TOKENS.colors.primary};
                color: white;
                border: none;
                padding: ${this.STYLE_TOKENS.spacing.sm} ${this.STYLE_TOKENS.spacing.lg};
                font-size: 16px;
                font-weight: 600;
                border-radius: ${this.STYLE_TOKENS.borderRadius.sm};
                cursor: pointer;
                box-shadow: ${this.STYLE_TOKENS.shadows.sm};
                transition: all 0.3s ease;
              }
              .mc-hero-btn:hover {
                background: ${this.STYLE_TOKENS.colors.primaryHover};
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,120,212,0.4);
              }
              .mc-hero-btn:active {
                transform: translateY(0);
              }
              @media (max-width: 768px) {
                .mc-hero-title { font-size: 36px !important; }
                .mc-hero-subtitle { font-size: 16px !important; }
              }
            </style>
            <div style="text-align: center; padding: ${this.STYLE_TOKENS.spacing.xxl} ${this.STYLE_TOKENS.spacing.md}; max-width: 1200px; margin: ${this.STYLE_TOKENS.spacing.md} auto; background: linear-gradient(135deg, ${this.STYLE_TOKENS.colors.bgLight} 0%, ${this.STYLE_TOKENS.colors.bgLighter} 100%); border-radius: ${this.STYLE_TOKENS.borderRadius.xl}; box-shadow: ${this.STYLE_TOKENS.shadows.md};">
              <h1 class="mc-hero-title" style="background: ${this.STYLE_TOKENS.colors.gradientHero}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: ${this.STYLE_TOKENS.spacing.md}; font-size: 56px; font-weight: 600; line-height: 1.2;">
                ${data.heading || data.title || 'Welcome'}
              </h1>
              ${data.subheading ? `<p class="mc-hero-subtitle" style="font-size: 20px; line-height: 1.6; color: ${this.STYLE_TOKENS.colors.textLight}; margin-bottom: ${this.STYLE_TOKENS.spacing.lg}; max-width: 700px; margin: 0 auto ${this.STYLE_TOKENS.spacing.lg};">${data.subheading}</p>` : ''}
              ${data.ctaText ? `<button class="mc-hero-btn">${data.ctaText}</button>` : ''}
            </div>
          `;
        
        case 'alert':
          // Map Alert to Banner component styling
          const alertTypes = {
            'info': { bg: '#e3f2fd', border: this.STYLE_TOKENS.colors.info, text: '#0d47a1', icon: 'ℹ️' },
            'warning': { bg: '#fff3e0', border: this.STYLE_TOKENS.colors.warning, text: '#e65100', icon: '⚠️' },
            'error': { bg: '#ffebee', border: this.STYLE_TOKENS.colors.error, text: '#c62828', icon: '❌' },
            'success': { bg: '#e8f5e9', border: this.STYLE_TOKENS.colors.success, text: '#1b5e20', icon: '✅' }
          };
          const alertStyle = alertTypes[data.type] || alertTypes.info;
          
          return `
            <style>
              @keyframes alertSlideIn {
                from { opacity: 0; transform: translateX(-20px); }
                to { opacity: 1; transform: translateX(0); }
              }
              .mc-alert {
                animation: alertSlideIn 0.4s ease;
                transition: all 0.3s ease;
              }
              .mc-alert:hover {
                box-shadow: ${this.STYLE_TOKENS.shadows.md};
                transform: translateX(4px);
              }
            </style>
            <div class="mc-alert" style="background: ${alertStyle.bg}; border-left: 4px solid ${alertStyle.border}; color: ${alertStyle.text}; padding: ${this.STYLE_TOKENS.spacing.md} ${this.STYLE_TOKENS.spacing.lg}; border-radius: ${this.STYLE_TOKENS.borderRadius.md}; margin: ${this.STYLE_TOKENS.spacing.md} 0; box-shadow: ${this.STYLE_TOKENS.shadows.sm};">
              ${data.message ? `<p style="margin: 0; font-size: 16px; line-height: 1.6;">${alertStyle.icon} ${data.message}</p>` : `<p style="margin: 0; font-size: 16px; line-height: 1.6;">${alertStyle.icon} Important Notice</p>`}
            </div>
          `;
        
        case 'featurecards':
        case 'featurecard':
        case 'feature':
          // Extract features from different possible properties
          let features = data.features || data.items || [];
          
          // If there's a paragraph/description, show it as a header
          let headerHtml = '';
          if (data.heading || data.paragraph) {
            const paragraphText = data.paragraph?.content?.[0]?.content?.[0]?.value || '';
            headerHtml = `
              <div style="text-align: center; margin-bottom: ${this.STYLE_TOKENS.spacing.xl};">
                ${data.heading ? `<h2 style="font-size: 36px; font-weight: 600; margin-bottom: ${this.STYLE_TOKENS.spacing.sm}; color: ${this.STYLE_TOKENS.colors.text};">${data.heading}</h2>` : ''}
                ${paragraphText ? `<p style="font-size: 18px; color: ${this.STYLE_TOKENS.colors.textLight}; line-height: 1.6; max-width: 800px; margin: 0 auto;">${paragraphText}</p>` : ''}
              </div>
            `;
          }
          
          // If no features array, show the data as a single feature
          if (features.length === 0 && (data.heading || data.paragraph)) {
            return `
              <div style="max-width: 1200px; margin: ${this.STYLE_TOKENS.spacing.xl} auto; padding: 0 ${this.STYLE_TOKENS.spacing.md};">
                ${headerHtml}
              </div>
            `;
          }
          
          return `
            <style>
              .mc-feature-card {
                background: ${this.STYLE_TOKENS.colors.white};
                border-radius: ${this.STYLE_TOKENS.borderRadius.lg};
                padding: ${this.STYLE_TOKENS.spacing.lg};
                text-align: center;
                box-shadow: ${this.STYLE_TOKENS.shadows.sm};
                transition: all 0.3s ease;
                border: 1px solid ${this.STYLE_TOKENS.colors.border};
              }
              .mc-feature-card:hover {
                transform: translateY(-8px);
                box-shadow: ${this.STYLE_TOKENS.shadows.lg};
                border-color: ${this.STYLE_TOKENS.colors.secondary};
              }
              .mc-feature-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto ${this.STYLE_TOKENS.spacing.sm};
                background: ${this.STYLE_TOKENS.colors.gradient};
                border-radius: ${this.STYLE_TOKENS.borderRadius.lg};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                animation: iconFloat 3s ease-in-out infinite;
              }
              @keyframes iconFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
              @media (max-width: 768px) {
                .mc-features-grid { grid-template-columns: 1fr !important; }
              }
            </style>
            <div style="max-width: 1200px; margin: ${this.STYLE_TOKENS.spacing.xl} auto; padding: 0 ${this.STYLE_TOKENS.spacing.md};">
              ${headerHtml}
              <div class="mc-features-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: ${this.STYLE_TOKENS.spacing.md};">
                ${features.map(item => `
                  <div class="mc-feature-card">
                    ${item.icon ? `<div class="mc-feature-icon">✨</div>` : ''}
                    <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: ${this.STYLE_TOKENS.colors.text};">${item.title || 'Feature'}</h3>
                    <p style="color: ${this.STYLE_TOKENS.colors.textLight}; line-height: 1.6; font-size: 14px; margin: 0;">${item.description || ''}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        
        case 'banner':
          return `
            <style>
              @keyframes bannerSlideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .mc-banner {
                animation: bannerSlideIn 0.6s ease;
              }
              @media (max-width: 768px) {
                .mc-banner-title { font-size: 24px !important; }
                .mc-banner-desc { font-size: 16px !important; }
              }
            </style>
            <div class="mc-banner" style="background: ${this.STYLE_TOKENS.colors.gradient}; color: white; padding: ${this.STYLE_TOKENS.spacing.xl} ${this.STYLE_TOKENS.spacing.md}; text-align: center; border-radius: ${this.STYLE_TOKENS.borderRadius.md}; margin: ${this.STYLE_TOKENS.spacing.md} 0;">
              <h2 class="mc-banner-title" style="font-size: 32px; margin: 0 0 ${this.STYLE_TOKENS.spacing.sm} 0;">${data.title || 'Welcome'}</h2>
              <p class="mc-banner-desc" style="font-size: 18px; opacity: 0.9;">${data.description || ''}</p>
            </div>
          `;
        
        case 'contentplacement':
        case 'contentPlacement':
          return `
            <style>
              .mc-content-card {
                background: ${this.STYLE_TOKENS.colors.white};
                border-radius: ${this.STYLE_TOKENS.borderRadius.md};
                overflow: hidden;
                box-shadow: ${this.STYLE_TOKENS.shadows.sm};
                transition: all 0.3s ease;
              }
              .mc-content-card:hover {
                transform: translateY(-4px);
                box-shadow: ${this.STYLE_TOKENS.shadows.md};
              }
              .mc-content-card img {
                transition: transform 0.5s ease;
              }
              .mc-content-card:hover img {
                transform: scale(1.05);
              }
              .mc-content-btn {
                background: ${this.STYLE_TOKENS.colors.secondary};
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: ${this.STYLE_TOKENS.borderRadius.sm};
                cursor: pointer;
                transition: all 0.3s ease;
              }
              .mc-content-btn:hover {
                background: ${this.STYLE_TOKENS.colors.secondaryHover};
                transform: translateX(4px);
              }
              @media (max-width: 768px) {
                .mc-content-grid { grid-template-columns: 1fr !important; }
              }
            </style>
            <div class="mc-content-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: ${this.STYLE_TOKENS.spacing.md}; margin: ${this.STYLE_TOKENS.spacing.md} 0;">
              ${(data.items || []).map(item => `
                <div class="mc-content-card">
                  ${item.image ? `<img src="${item.image}" alt="${item.alt || ''}" style="width: 100%; height: 200px; object-fit: cover;">` : ''}
                  <div style="padding: ${this.STYLE_TOKENS.spacing.md};">
                    <h3 style="margin: 0 0 12px 0;">${item.title || ''}</h3>
                    <p style="color: ${this.STYLE_TOKENS.colors.textLight}; margin: 0 0 ${this.STYLE_TOKENS.spacing.sm} 0;">${item.description || ''}</p>
                    ${item.buttonText ? `<button class="mc-content-btn">${item.buttonText}</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        
        case 'testimonial':
        case 'testimonials':
          // Handle both single testimonial and items array
          if (data.items && Array.isArray(data.items)) {
            return `
              <style>
                .mc-testimonial {
                  background: ${this.STYLE_TOKENS.colors.bgLight};
                  border-left: 4px solid ${this.STYLE_TOKENS.colors.secondary};
                  padding: ${this.STYLE_TOKENS.spacing.md};
                  border-radius: ${this.STYLE_TOKENS.borderRadius.md};
                  transition: all 0.3s ease;
                }
                .mc-testimonial:hover {
                  border-left-width: 8px;
                  padding-left: calc(${this.STYLE_TOKENS.spacing.md} - 4px);
                  box-shadow: ${this.STYLE_TOKENS.shadows.sm};
                }
                @media (max-width: 768px) {
                  .mc-testimonials-grid { grid-template-columns: 1fr !important; }
                }
              </style>
              <div class="mc-testimonials-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: ${this.STYLE_TOKENS.spacing.md}; margin: ${this.STYLE_TOKENS.spacing.md} 0;">
                ${data.items.map(item => `
                  <div class="mc-testimonial">
                    <p style="font-style: italic; margin: 0 0 ${this.STYLE_TOKENS.spacing.sm} 0; font-size: 14px; line-height: 1.6;">"💬 ${item.quote || ''}"</p>
                    <div style="display: flex; align-items: center; gap: 12px; margin-top: auto;">
                      ${item.avatar ? `<img src="${item.avatar}" alt="" style="width: 48px; height: 48px; border-radius: 50%;">` : ''}
                      <div>
                        <div style="font-weight: 600; font-size: 14px;">${item.name || item.author || ''}</div>
                        <div style="color: ${this.STYLE_TOKENS.colors.textLight}; font-size: 12px;">${item.role || ''}</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }
          // Single testimonial (legacy format)
          return `
            <style>
              .mc-testimonial {
                background: ${this.STYLE_TOKENS.colors.bgLight};
                border-left: 4px solid ${this.STYLE_TOKENS.colors.secondary};
                padding: ${this.STYLE_TOKENS.spacing.md};
                border-radius: ${this.STYLE_TOKENS.borderRadius.md};
                margin: ${this.STYLE_TOKENS.spacing.md} 0;
                transition: all 0.3s ease;
              }
              .mc-testimonial:hover {
                border-left-width: 8px;
                padding-left: calc(${this.STYLE_TOKENS.spacing.md} - 4px);
                box-shadow: ${this.STYLE_TOKENS.shadows.sm};
              }
            </style>
            <div class="mc-testimonial">
              <p style="font-style: italic; margin: 0 0 ${this.STYLE_TOKENS.spacing.sm} 0;">"💬 ${data.quote || ''}"</p>
              <div style="display: flex; align-items: center; gap: 12px;">
                ${data.avatar ? `<img src="${data.avatar}" alt="" style="width: 48px; height: 48px; border-radius: 50%;">` : ''}
                <div>
                  <div style="font-weight: 600;">${data.name || data.author || ''}</div>
                  <div style="color: ${this.STYLE_TOKENS.colors.textLight}; font-size: 14px;">${data.role || ''}</div>
                </div>
              </div>
            </div>
          `;
        
        case 'stat':
        case 'stats':
        case 'statistics':
          // Handle both single stat and items array
          if (data.items && Array.isArray(data.items)) {
            return `
              <style>
                .mc-stat-value {
                  font-size: 48px;
                  font-weight: bold;
                  color: ${this.STYLE_TOKENS.colors.secondary};
                  margin-bottom: ${this.STYLE_TOKENS.spacing.xs};
                  animation: countUp 1s ease;
                }
                @keyframes countUp {
                  from { opacity: 0; transform: scale(0.5); }
                  to { opacity: 1; transform: scale(1); }
                }
                .mc-stat-item {
                  transition: transform 0.3s ease;
                }
                .mc-stat-item:hover {
                  transform: scale(1.05);
                }
                @media (max-width: 768px) {
                  .mc-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
                  .mc-stat-value { font-size: 36px !important; }
                }
              </style>
              <div class="mc-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: ${this.STYLE_TOKENS.spacing.lg}; margin: ${this.STYLE_TOKENS.spacing.xl} 0; padding: ${this.STYLE_TOKENS.spacing.lg}; background: linear-gradient(135deg, ${this.STYLE_TOKENS.colors.bgLight} 0%, ${this.STYLE_TOKENS.colors.bgLighter} 100%); border-radius: ${this.STYLE_TOKENS.borderRadius.lg};">
                ${data.items.map(item => `
                  <div class="mc-stat-item" style="text-align: center;">
                    <div class="mc-stat-value">${item.number || item.value || ''}</div>
                    <div style="color: ${this.STYLE_TOKENS.colors.textLight}; font-size: 14px; line-height: 1.4;">${item.label || ''}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
          // Single stat (legacy format)
          return `
            <style>
              .mc-stat-value {
                font-size: 48px;
                font-weight: bold;
                color: ${this.STYLE_TOKENS.colors.secondary};
                animation: countUp 1s ease;
              }
              @keyframes countUp {
                from { opacity: 0; transform: scale(0.5); }
                to { opacity: 1; transform: scale(1); }
              }
            </style>
            <div style="text-align: center; padding: ${this.STYLE_TOKENS.spacing.lg}; margin: ${this.STYLE_TOKENS.spacing.md} 0;">
              <div class="mc-stat-value">${data.value || ''}</div>
              <div style="color: ${this.STYLE_TOKENS.colors.textLight}; margin-top: ${this.STYLE_TOKENS.spacing.xs};">${data.label || ''}</div>
            </div>
          `;
        
        case 'calltoaction':
        case 'callToAction':
        case 'cta':
          return `
            <style>
              .mc-cta-btn {
                background: ${this.STYLE_TOKENS.colors.white};
                color: ${this.STYLE_TOKENS.colors.secondary};
                border: none;
                padding: ${this.STYLE_TOKENS.spacing.sm} ${this.STYLE_TOKENS.spacing.lg};
                font-size: 16px;
                font-weight: 600;
                border-radius: ${this.STYLE_TOKENS.borderRadius.sm};
                cursor: pointer;
                transition: all 0.3s ease;
              }
              .mc-cta-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 8px 16px rgba(0,0,0,0.2);
              }
              @media (max-width: 768px) {
                .mc-cta-title { font-size: 28px !important; }
                .mc-cta-desc { font-size: 16px !important; }
              }
            </style>
            <div style="background: ${this.STYLE_TOKENS.colors.gradient}; color: white; padding: ${this.STYLE_TOKENS.spacing.xxl} ${this.STYLE_TOKENS.spacing.md}; text-align: center; border-radius: ${this.STYLE_TOKENS.borderRadius.md}; margin: ${this.STYLE_TOKENS.spacing.xl} 0;">
              <h2 class="mc-cta-title" style="font-size: 36px; margin: 0 0 ${this.STYLE_TOKENS.spacing.sm} 0;">${data.title || ''}</h2>
              <p class="mc-cta-desc" style="font-size: 18px; opacity: 0.9; margin: 0 0 ${this.STYLE_TOKENS.spacing.lg} 0;">${data.description || ''}</p>
              <button class="mc-cta-btn">${data.buttonText || 'Learn More'}</button>
            </div>
          `;
        
        default:
          return `
            <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0;">
              <p><strong>Component:</strong> ${componentType}</p>
              <pre style="background: white; padding: 16px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
            </div>
          `;
      }
    },

    /**
     * Start tracking user behavior on parent page
     */
    startBehaviorTracking: function() {
      console.log('[MindContent] 👁️ Starting behavior tracking...');
      
      // Track text selection
      document.addEventListener('mouseup', () => {
        // Don't track text selections if WebSocket is closed
        if (this.websocketClosed) {
          return;
        }
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
          const textSelection = {
            text: selectedText.substring(0, 200), // Limit to 200 chars
            length: selectedText.length,
            timestamp: Date.now()
          };
          
          this.userBehavior.textSelections.push(textSelection);
          if (this.userBehavior.textSelections.length > 10) {
            this.userBehavior.textSelections.shift();
          }
          
          this.userBehavior.lastActivityTime = Date.now();
          console.log('📝 [MindContent] Text selected:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));
        }
      });
      
      // Track clicks
      document.addEventListener('click', (e) => {
        // Don't track clicks if WebSocket is closed
        if (this.websocketClosed) {
          return;
        }
        
        this.userBehavior.totalClicks++;
        this.userBehavior.lastActivityTime = Date.now();
        
        // Safely extract className (handle SVG elements)
        let className = null;
        try {
          className = typeof e.target.className === 'string' 
            ? e.target.className 
            : (e.target.className?.baseVal || null);
        } catch (err) {
          className = null;
        }
        
        // Extract text content from element
        let elementText = null;
        try {
          // For buttons, links, and text elements
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
          href: e.target.href || null, // Capture link URLs
          timestamp: Date.now()
        };
        
        this.userBehavior.recentInteractions.push(interaction);
        if (this.userBehavior.recentInteractions.length > 10) {
          this.userBehavior.recentInteractions.shift();
        }
        
        console.log('👆 [MindContent] Click tracked:', interaction.element, interaction.text ? `"${interaction.text.substring(0, 30)}..."` : '');
      });
      
      // Track hover events (mouseover with debounce)
      let hoverTimeout;
      document.addEventListener('mouseover', (e) => {
        // Don't track hovers if WebSocket is closed
        if (this.websocketClosed) {
          clearTimeout(hoverTimeout);
          return;
        }
        
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          this.userBehavior.totalHovers++;
          this.userBehavior.lastActivityTime = Date.now();
          
          // Extract text content from element
          let elementText = null;
          try {
            // Get meaningful text from the element
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
          
          if (elementText) {
            console.log('🖱️ [MindContent] Hover tracked:', hover.element, `"${elementText.substring(0, 30)}..."`);
          }
        }, 500); // Only count if hover lasts 500ms
      });
      
      console.log('[MindContent] ✅ Behavior tracking started');
    },

    /**
     * Update battery information if available
     */
    updateBatteryInfo: async function() {
      try {
        if ('getBattery' in navigator) {
          const battery = await navigator.getBattery();
          this.userBehavior.batteryLevel = Math.round(battery.level * 100);
          this.userBehavior.isCharging = battery.charging;
          
          // Listen for battery changes
          battery.addEventListener('levelchange', () => {
            this.userBehavior.batteryLevel = Math.round(battery.level * 100);
          });
          battery.addEventListener('chargingchange', () => {
            this.userBehavior.isCharging = battery.charging;
          });
          
          console.log('[MindContent] 🔋 Battery info updated:', this.userBehavior.batteryLevel + '%', this.userBehavior.isCharging ? 'Charging' : 'Not charging');
        } else {
          console.log('[MindContent] Battery API not available');
        }
      } catch (error) {
        console.warn('[MindContent] Error getting battery info:', error);
      }
    },

    /**
     * Update geolocation data from ipapi.co (more reliable than ip-api.com)
     * This is a best-effort, non-critical feature - fails silently if unavailable
     */
    updateGeolocationData: async function() {
      console.log('[MindContent] 🌍 Attempting to fetch geolocation...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log('[MindContent] 🌍 Geolocation API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[MindContent] 🌍 Geolocation data received:', data);
          
          this.userBehavior.ip = data.ip;
          this.userBehavior.country = data.country_name;
          this.userBehavior.city = data.city;
          
          // Override timezone if more accurate
          if (data.timezone) {
            this.userBehavior.timezone = data.timezone;
          }
          
          console.log('[MindContent] ✅ Geolocation updated:', {
            ip: this.userBehavior.ip,
            city: this.userBehavior.city,
            country: this.userBehavior.country,
            timezone: this.userBehavior.timezone
          });
        } else {
          console.warn('[MindContent] ⚠️ Geolocation API returned non-OK status:', response.status);
        }
      } catch (error) {
        console.warn('[MindContent] ⚠️ Geolocation fetch failed:', error.message, error.name);
        // Geolocation is non-critical - fail silently in production
      }
    },

    /**
     * Sanitize data to ensure it's postMessage-safe (no DOM objects or non-cloneable types)
     */
    sanitizeForPostMessage: function(obj) {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitizeForPostMessage(item));
      }
      
      // Handle objects
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          
          // Skip DOM elements, functions, and other non-cloneable types
          if (value instanceof Node || 
              value instanceof Window || 
              typeof value === 'function' ||
              value instanceof SVGAnimatedString) {
            continue;
          }
          
          // Recursively sanitize nested objects
          if (typeof value === 'object' && value !== null) {
            sanitized[key] = this.sanitizeForPostMessage(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      
      return sanitized;
    },

    /**
     * Get NEW user behavior data since last send (to avoid sending duplicates)
     */
    getNewUserBehavior: function() {
      const now = Date.now();
      const sessionDuration = this.sessionStart ? Math.floor((now - this.sessionStart) / 1000) : 0;
      const timeSinceLastActivity = this.userBehavior.lastActivityTime 
        ? Math.floor((now - this.userBehavior.lastActivityTime) / 1000) 
        : 0;
      
      // Get connection info
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const connectionType = connection ? (connection.effectiveType || 'unknown') : 'unknown';
      const downlink = connection ? connection.downlink : null;
      const rtt = connection ? connection.rtt : null;
      const networkType = connection ? (connection.type || 'unknown') : 'unknown';
      
      const deviceType = this.getDeviceType();
      
      // Filter only NEW interactions since last send
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
      
      // Update last sent timestamp
      this.lastSentTimestamp = now;
      
      // Create deviceContext for nested structure (backend compatibility)
      const deviceContext = {
        screenResolution: this.userBehavior.screenResolution,
        deviceType: deviceType,
        userAgent: this.userBehavior.userAgent,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        batteryLevel: this.userBehavior.batteryLevel,
        isCharging: this.userBehavior.isCharging,
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        frameRate: this.userBehavior.frameRate,
        performance: this.userBehavior.performance
      };
      
      return {
        // Session data
        sessionDuration: sessionDuration,
        previousPage: this.userBehavior.previousPage,
        timeSinceLastActivity: timeSinceLastActivity,
        
        // NEW interactions only (delta since last send)
        totalClicks: this.userBehavior.totalClicks,
        totalHovers: this.userBehavior.totalHovers,
        recentInteractions: newInteractions, // Only new clicks
        recentHovers: newHovers, // Only new hovers
        textSelections: newTextSelections, // Only new text selections
        scrollPattern: newScrollPattern, // Only new scroll events
        totalInteractions: this.userBehavior.totalClicks + this.userBehavior.totalHovers,
        
        // Device data (flat fields for Sidebar compatibility)
        userAgent: this.userBehavior.userAgent,
        screenResolution: this.userBehavior.screenResolution,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        deviceType: deviceType,
        
        // Network data (flat fields)
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        net: connectionType, // Alias for backend
        
        // Battery data (flat fields)
        batteryLevel: this.userBehavior.batteryLevel,
        isCharging: this.userBehavior.isCharging,
        
        // Location data (flat fields)
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        
        // Performance data (flat fields)
        frameRate: this.userBehavior.frameRate,
        performance: this.userBehavior.performance,
        fps: this.userBehavior.frameRate, // Alias
        
        // Nested structure for backend
        deviceContext: deviceContext
      };
    },

    /**
     * Get current user behavior data (FULL data for debugging)
     */
    getUserBehavior: function() {
      const now = Date.now();
      const sessionDuration = this.sessionStart ? Math.floor((now - this.sessionStart) / 1000) : 0;
      const timeSinceLastActivity = this.userBehavior.lastActivityTime 
        ? Math.floor((now - this.userBehavior.lastActivityTime) / 1000) 
        : 0;
      
      // Get connection info
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const connectionType = connection ? (connection.effectiveType || 'unknown') : 'unknown';
      const downlink = connection ? connection.downlink : null;
      const rtt = connection ? connection.rtt : null;
      const networkType = connection ? (connection.type || 'unknown') : 'unknown';
      
      console.log('[MindContent] 🔍 Network info:', {
        hasConnection: !!connection,
        connectionType,
        downlink,
        rtt,
        networkType
      });
      
      const deviceType = this.getDeviceType();
      
      // Create deviceContext for nested structure (backend compatibility)
      const deviceContext = {
        screenResolution: this.userBehavior.screenResolution,
        deviceType: deviceType,
        userAgent: this.userBehavior.userAgent,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        batteryLevel: this.userBehavior.batteryLevel,
        isCharging: this.userBehavior.isCharging,
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        frameRate: this.userBehavior.frameRate,
        performance: this.userBehavior.performance
      };
      
      return {
        // Session data
        sessionDuration: sessionDuration,
        previousPage: this.userBehavior.previousPage,
        timeSinceLastActivity: timeSinceLastActivity,
        
        // Interaction data
        totalClicks: this.userBehavior.totalClicks,
        totalHovers: this.userBehavior.totalHovers,
        recentInteractions: this.userBehavior.recentInteractions,
        recentHovers: this.userBehavior.recentHovers,
        textSelections: this.userBehavior.textSelections, // Include text selections
        scrollPattern: this.userBehavior.scrollPattern,
        totalInteractions: this.userBehavior.totalClicks + this.userBehavior.totalHovers,
        
        // Device data (flat fields for Sidebar compatibility)
        userAgent: this.userBehavior.userAgent,
        screenResolution: this.userBehavior.screenResolution,
        timezone: this.userBehavior.timezone,
        language: this.userBehavior.language,
        deviceType: deviceType,
        
        // Network data (flat fields)
        connectionType: connectionType,
        downlink: downlink,
        rtt: rtt,
        networkType: networkType,
        net: connectionType, // Alias for backend
        
        // Battery data (flat fields)
        batteryLevel: this.userBehavior.batteryLevel,
        isCharging: this.userBehavior.isCharging,
        
        // Location data (flat fields)
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        
        // Performance data (flat fields)
        frameRate: this.userBehavior.frameRate,
        performance: this.userBehavior.performance,
        fps: this.userBehavior.frameRate, // Alias
        
        // Nested structure for backend
        deviceContext: deviceContext
      };
    },

    /**
     * Log current behavior data for debugging
     */
    logUserBehavior: function() {
      const behavior = this.getUserBehavior();
      console.log('[MindContent] 📊 Current User Behavior:', {
        screenResolution: behavior.screenResolution,
        deviceType: behavior.deviceType,
        connectionType: behavior.connectionType,
        downlink: behavior.downlink,
        rtt: behavior.rtt,
        networkType: behavior.networkType,
        batteryLevel: behavior.batteryLevel,
        isCharging: behavior.isCharging,
        ip: behavior.ip,
        country: behavior.country,
        city: behavior.city,
        sessionDuration: behavior.sessionDuration + 's',
        totalInteractions: behavior.totalInteractions,
        recentTextSelections: behavior.textSelections.length
      });
      
      // Log recent text selections for debugging
      if (behavior.textSelections.length > 0) {
        console.log('[MindContent] 📝 Recent text selections:', 
          behavior.textSelections.map(s => s.text.substring(0, 50) + '...'));
      }
      
      return behavior;
    },

    /**
     * Detect device type
     */
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

    /**
     * Send message to React app
     */
    sendMessage: function(message) {
      if (!this.iframe || !this.iframe.contentWindow) {
        console.warn('[MindContent] Cannot send message, iframe not ready');
        return;
      }
      
      // Sanitize message to remove any non-cloneable objects
      const sanitizedMessage = this.sanitizeForPostMessage(message);
      
      console.log('[MindContent] 📤 Sending to iframe:', sanitizedMessage.type, sanitizedMessage);
      this.iframe.contentWindow.postMessage(sanitizedMessage, this.config.reactAppUrl);
    },

    /**
     * Start scroll tracking on parent page
     */
    startScrollTracking: function() {
      let scrollTimeout;
      
      const sendScrollEvent = () => {        // Don't send scroll events if WebSocket is closed
        if (this.websocketClosed) {
          console.log('⛔ [MindContent] Scroll tracking disabled (WebSocket closed)');
          return;
        }
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        
        // Track scroll pattern
        this.userBehavior.scrollPattern.push({
          percent: Math.round(scrollPercent),
          timestamp: Date.now()
        });
        if (this.userBehavior.scrollPattern.length > 20) {
          this.userBehavior.scrollPattern.shift();
        }
        
        console.log('📜 [MindContent] Scroll:', scrollPercent.toFixed(1) + '%');
        
        // Get only NEW user behavior (delta since last send)
        const userBehavior = this.getNewUserBehavior();
        
        // Log for debugging (only if there are new interactions)
        const hasNewData = userBehavior.recentInteractions.length > 0 || 
                           userBehavior.recentHovers.length > 0 || 
                           userBehavior.textSelections.length > 0;
        
        if (hasNewData) {
          console.log('[MindContent] 🆕 New interactions detected:', {
            clicks: userBehavior.recentInteractions.length,
            hovers: userBehavior.recentHovers.length,
            selections: userBehavior.textSelections.length
          });
        }
        
        console.log('[MindContent] 📤 Sending scroll event with behavior data...');
        
        // Send scroll event to iframe with user behavior
        this.sendMessage({
          type: 'scroll_event',
          scrollPercent: Math.round(scrollPercent * 10) / 10,
          userBehavior: userBehavior
        });
        
        console.log('[MindContent] ✅ Scroll event sent');
      };
      
      // Debounced scroll handler
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(sendScrollEvent, 200);
      });
      
      console.log('[MindContent] 🎯 Scroll tracking started');
    },

    /**
     * Destroy the SDK and remove iframe
     */
    destroy: function() {
      // Remove message handler
      if (this.messageHandler) {
        console.log('[MindContent] 🗑️ Removing message handler');
        window.removeEventListener('message', this.messageHandler);
        this.messageHandler = null;
      }
      
      // Remove toggle button
      if (this.toggleButton) {
        this.toggleButton.remove();
        this.toggleButton = null;
      }
      
      // Remove iframe
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
      
      console.log('[MindContent] SDK destroyed');
    },
    
    /**
     * TEST: Manually inject loading (for debugging)
     */
    testLoading: function() {
      console.log('[MindContent] 🧪 TEST: Manually injecting loading...');
      this.injectLoadingPlaceholder('test-' + Date.now());
    }
  };

  // Auto-initialize if element exists
  window.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('mindcontent');
    if (container) {
      const pageId = container.getAttribute('data-page-id');
      const apiUrl = container.getAttribute('data-api-url');
      
      MindContent.init({
        pageId: pageId,
        reactAppUrl: apiUrl || 'http://localhost:5173'
      });
    }
  });

  // Expose to window
  window.MindContent = MindContent;

})(window);
