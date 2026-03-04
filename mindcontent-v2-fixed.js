(function(window) {
  'use strict';

  

  // Detecção automática de ambiente (local vs produção)
  const isLocalEnvironment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.protocol === 'file:';
  
  const REACT_APP_URL = isLocalEnvironment 
    ? 'http://localhost:5173' 
    : 'https://app-frontend-webperso-dev-si6m63nydv3ko.azurewebsites.net';
  
  const API_URL = isLocalEnvironment
    ? 'http://localhost:8000'
    : 'https://app-backend-webperso-dev-si6m63nydv3ko.azurewebsites.net';
  
  

  const MindContent = {
    version: '2.0.3-all-components',
    config: {
      reactAppUrl: REACT_APP_URL,
      containerId: 'mindcontent',
      pageUrl: null,
      autoInit: true
    },
    iframe: null,
    container: null,
    toggleButton: null,
    sidebarOpen: false,
    messageHandler: null,
    websocketClosed: false,
    sessionStart: null,
    lastSentTimestamp: 0,
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
      batteryLevel: null,
      isCharging: false,
      ip: null,
      country: null,
      city: null,
      frameRate: 60,
      performance: 100
    },

    init: function(options) {
      this.config = { ...this.config, ...options };
      this.showIntentModal();
      this.continueInit();
    },
    
    showIntentModal: async function() {
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
      
      let usersOptions = '<option value="anonymous">Anonymous User</option>';
      try {
        const response = await fetch(`${API_URL}/api/users`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.users && data.users.length > 0) {
          data.users.forEach(user => {
            usersOptions += `<option value="${user.user_id}">${user.full_name} (${user.city}, ${user.country})</option>`;
          });
        }
      } catch (error) {
      }
      
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
      
      const startBtn = document.getElementById('mindcontent-intent-start-btn');
      const consentCheckbox = document.getElementById('mindcontent-ai-consent');
      const userSelect = document.getElementById('mindcontent-user-select');
      
      const self = this;
      
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
      
      startBtn.addEventListener('click', async () => {
        if (startBtn.disabled) return;
        
        const selectedUserId = userSelect.value;
        
        localStorage.setItem('mindcontent_simulated_intent', randomIntent);
        localStorage.setItem('mindcontent_selected_user', selectedUserId);
        localStorage.setItem('mindcontent_ai_consent', 'true');
        
        const modal = document.getElementById('mindcontent-intent-modal');
        if (modal) {
          modal.remove();
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
    
    sendUserPurchasesToReact: function() {
      if (!this.config.currentUser || !this.iframe) {
        return;
      }
      
      const iframe = document.getElementById('mindcontent-iframe');
      
      if (iframe && iframe.contentWindow) {
        const payload = {
          type: 'USER_PURCHASES',
          data: {
            user: this.config.currentUser,
            purchases: this.config.userPurchases || [],
            totalPurchases: this.config.totalPurchases || 0,
            loadTime: this.config.purchasesLoadTime || 0,
            timing: this.config.purchasesTiming || null
          }
        };
        
        iframe.contentWindow.postMessage(payload, this.config.reactAppUrl);
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
      
      this.updateBatteryInfo();
      this.updateGeolocationData();
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
        this.setupCommunication();
        this.startScrollTracking();
      };
      
      iframe.onerror = (e) => {
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
        
        const validTypes = ['mindcontent_ready', 'mindcontent_log', 'mindcontent_component', 'mindcontent_loading', 'mindcontent_remove_loading', 'initial_decision', 'mindcontent_websocket_closed', 'mindcontent_status_update', 'sidebar_opened', 'sidebar_closed'];
        if (!message || !message.type || !validTypes.includes(message.type)) {
          return;
        }
        
        const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
        const isExpectedOrigin = event.origin.startsWith(this.config.reactAppUrl);
        
        if (!isLocalhost && !isExpectedOrigin) {
          return;
        }
        
        if (message.type === 'mindcontent_websocket_closed') {
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
          this.sendMessage({
            type: 'config',
            data: {
              pageUrl: this.config.pageUrl,
              userId: this.config.userId
            }
          });
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
      const loadingDiv = document.querySelector(`[data-loading-id="${component.loadingId}"]`);
      if (loadingDiv) {
        loadingDiv.remove();
      }
      
      const targetContainer = document.getElementById(this.config.containerId);
      if (!targetContainer) {
        return;
      }

      const componentHtml = this.renderComponent(component);
      
      const wrapper = document.createElement('div');
      wrapper.className = 'mc-dynamic-component';
      wrapper.setAttribute('data-component-id', component.id);
      wrapper.innerHTML = componentHtml;
      
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
        case 'herobanner':
        case 'hero':
          const heading = data.heading || data.title || data.name || 'Welcome';
          
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
          let footnotesContent = '';
          if (typeof data.content === 'string') {
            footnotesContent = data.content;
          } else if (data.content && data.content.nodeType === 'document') {
            footnotesContent = this.richTextToHtml(data.content);
          } else if (data.text) {
            footnotesContent = data.text;
          }
          
          return `
            <div class="mc-footnotes">
              <div class="mc-footnotes-icon">📝</div>
              <div class="mc-footnotes-content">${footnotesContent}</div>
            </div>
          `;
        
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
        
        default:
          let genericContent = '';
          let hasRichText = false;
          
          const title = data.title || data.heading || data.name || componentType;
          
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
            else if (typeof value === 'string') {
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
          
          if (!genericContent) {
            return `
              <div class="mc-debug-component">
                <div class="mc-debug-title">⚙️ ${title}</div>
                <details class="mc-debug-details">
                  <summary>View Raw Data</summary>
                  <pre class="mc-debug-pre">${JSON.stringify(data, null, 2)}</pre>
                </details>
              </div>
            `;
          }
          
          return `
            <div class="mc-generic-component">
              <h3 class="mc-generic-title">${title}</h3>
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

    updateBatteryInfo: async function() {
      try {
        if ('getBattery' in navigator) {
          const battery = await navigator.getBattery();
          this.userBehavior.batteryLevel = Math.round(battery.level * 100);
          this.userBehavior.isCharging = battery.charging;
          
          battery.addEventListener('levelchange', () => {
            this.userBehavior.batteryLevel = Math.round(battery.level * 100);
          });
          battery.addEventListener('chargingchange', () => {
            this.userBehavior.isCharging = battery.charging;
          });
        }
      } catch (error) {
      }
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
        }
      } catch (error) {
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
        batteryLevel: this.userBehavior.batteryLevel,
        isCharging: this.userBehavior.isCharging,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        frameRate: this.userBehavior.frameRate,
        performance: this.userBehavior.performance,
        fps: this.userBehavior.frameRate,
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
        batteryLevel: this.userBehavior.batteryLevel,
        isCharging: this.userBehavior.isCharging,
        ip: this.userBehavior.ip,
        country: this.userBehavior.country,
        city: this.userBehavior.city,
        frameRate: this.userBehavior.frameRate,
        performance: this.userBehavior.performance,
        fps: this.userBehavior.frameRate,
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
        if (this.websocketClosed) {
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
    
    testLoading: function() {
      this.injectLoadingPlaceholder('test-' + Date.now());
    }
  };

  // Auto-initialization function
  function autoInitialize() {
    const container = document.getElementById('mindcontent');
    if (container) {
      const pageId = container.getAttribute('data-page-id');
      const apiUrl = container.getAttribute('data-api-url');
      
      const initConfig = { pageId: pageId };
      
      // Só sobrescreve reactAppUrl se explicitamente fornecido via data-api-url
      if (apiUrl) {
        initConfig.reactAppUrl = apiUrl;
      }
      // Caso contrário, usa a detecção automática já configurada
      
      MindContent.init(initConfig);
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
