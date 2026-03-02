/**
 * MindContent SDK Configuration
 * This file is auto-generated during build process
 * DO NOT EDIT MANUALLY
 */

// Detect environment based on hostname
const isProduction = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

// Environment-specific configuration
const config = {
  development: {
    apiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000',
    reactAppUrl: 'http://localhost:5173'
  },
  production: {
    apiUrl: 'https://app-backend-webperso-dev-si6m63nydv3ko.azurewebsites.net',
    wsUrl: 'wss://app-backend-webperso-dev-si6m63nydv3ko.azurewebsites.net',
    reactAppUrl: 'https://app-frontend-webperso-dev-si6m63nydv3ko.azurewebsites.net'
  }
};

// Export current environment configuration
const currentEnv = isProduction() ? 'production' : 'development';
window.MINDCONTENT_CONFIG = config[currentEnv];

console.log('[MindContent] Environment:', currentEnv);
console.log('[MindContent] Config:', window.MINDCONTENT_CONFIG);
