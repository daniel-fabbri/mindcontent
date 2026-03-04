/**
 * MindContent SDK Loader
 * Automatically detects environment and loads both CSS and JS SDK files
 * Just include this script in any HTML page: <script src="mindcontent-loader.js"></script>
 */
(function() {
    // Detect environment
    const isLocal = window.location.protocol === 'file:' || 
                   window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1';
    
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // Set base URLs based on environment
    let cssUrl, sdkUrl, envName;
    
    if (isLocal) {
        cssUrl = 'file:///C:/dev/mindcontent/mindcontent-frontend/public/mindcontent.css';
        sdkUrl = 'file:///C:/dev/mindcontent/mindcontent-frontend/public/mindcontent-v2-fixed.js';
        envName = 'Local';
    } else if (isGitHubPages) {
        // Use relative paths for GitHub Pages
        cssUrl = 'mindcontent.css';
        sdkUrl = 'mindcontent-v2-fixed.js';
        envName = 'GitHub Pages';
    } else {
        // Azure production
        cssUrl = 'https://app-frontend-webperso-dev-si6m63nydv3ko.azurewebsites.net/mindcontent.css';
        sdkUrl = 'https://app-frontend-webperso-dev-si6m63nydv3ko.azurewebsites.net/mindcontent-v2-fixed.js';
        envName = 'Azure Production';
    }
    
    console.log(`[MindContent Loader] Environment: ${envName}`);
    
    // Load CSS first
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.onload = function() {
        console.log(`[MindContent Loader] CSS loaded from: ${cssUrl}`);
    };
    link.onerror = function() {
        console.error(`[MindContent Loader] ❌ Failed to load CSS from: ${cssUrl}`);
    };
    document.head.appendChild(link);
    
    // Load SDK JavaScript
    const script = document.createElement('script');
    script.src = sdkUrl;
    script.async = false;
    
    script.onload = function() {
        console.log(`[MindContent Loader] ✅ SDK loaded from: ${sdkUrl}`);
    };
    
    script.onerror = function() {
        console.error(`[MindContent Loader] ❌ Failed to load SDK from: ${sdkUrl}`);
    };
    
    document.head.appendChild(script);
})();
