/**
 * MindContent - Site Components Loader
 * Automatically injects common site elements (head meta tags, header, footer)
 * Version: 1.0.0
 */

(function() {
    'use strict';

    // Configuration
    const SITE_CONFIG = {
        siteName: 'MindContent',
        tagline: 'AI-Powered Content Personalization',
        year: new Date().getFullYear(),
        logo: 'https://uhf.microsoft.com/images/microsoft/RE1Mu3b.png',
        navigation: [
            { href: 'index.html', label: 'Home', id: 'home' },
            { href: 'products.html', label: 'Products', id: 'products' },
            { href: 'services.html', label: 'Services', id: 'services' },
            { href: 'contact.html', label: 'Contact', id: 'contact' }
        ]
    };

    /**
     * Inject meta tags and CSS in <head>
     */
    function injectHead(pageTitle) {
        const head = document.head;
        
        // Set page title
        if (pageTitle) {
            document.title = `${pageTitle} - ${SITE_CONFIG.siteName}`;
        }

        // Check if style.css is already loaded
        const existingStylesheet = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .find(link => link.href.includes('style.css'));
        
        if (!existingStylesheet) {
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = 'style.css';
            head.appendChild(styleLink);
        }

        console.log('✅ Head elements injected');
    }

    /**
     * Inject site header with navigation
     */
    function injectHeader() {
        // Determine current page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Create header HTML
        const headerHTML = `
            <div class="my-header" style="background: white;">
                <img src="${SITE_CONFIG.logo}" alt="${SITE_CONFIG.siteName}" style="height: 40px; vertical-align: middle;">
                <nav style="display: inline-block; margin-left: 30px;">
                    ${SITE_CONFIG.navigation.map(item => {
                        const isActive = currentPage.includes(item.href) || 
                                       (currentPage === '' && item.href === 'index.html');
                        const fontWeight = isActive ? 'bold' : 'normal';
                        return `<a href="${item.href}" style="margin: 0 15px; font-weight: ${fontWeight};">${item.label}</a>`;
                    }).join('')}
                </nav>
            </div>
        `;

        // Insert at the beginning of body
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = headerHTML;
        document.body.insertBefore(tempDiv.firstElementChild, document.body.firstChild);

        console.log('✅ Header injected');
    }

    /**
     * Inject site footer
     */
    function injectFooter() {
        const footerHTML = `
            <div class="my-footer">
                <p>&copy; ${SITE_CONFIG.year} ${SITE_CONFIG.siteName}. All rights reserved.</p>
                <p><small>Powered by AI & Machine Learning</small></p>
            </div>
        `;

        // Insert before the closing body tag
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = footerHTML;
        document.body.appendChild(tempDiv.firstElementChild);

        console.log('✅ Footer injected');
    }

    /**
     * Initialize all components
     */
    function init() {
        // Get page title from data attribute or meta tag
        const pageTitle = document.body.getAttribute('data-page-title') || 
                         document.querySelector('meta[name="page-title"]')?.content;

        injectHead(pageTitle);
        injectHeader();
        // injectFooter();

        console.log('🎨 Site components initialized');
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
