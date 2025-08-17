// Webview preload script for performance optimizations
// This script runs in the context of each webview to optimize loading

(function() {
  'use strict';

  // DNS prefetching optimization
  function enableDNSPrefetch() {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'x-dns-prefetch-control';
    meta.content = 'on';
    document.head.appendChild(meta);
  }

  // Resource hints for better loading
  function addResourceHints() {
    // Add preconnect for common CDNs and services
    const commonDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://ajax.googleapis.com',
      'https://code.jquery.com',
      'https://unpkg.com',
      'https://cdn.jsdelivr.net',
      'https://stackpath.bootstrapcdn.com'
    ];

    commonDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Add DNS prefetch for current domain's subdomains
    const currentDomain = window.location.hostname;
    const subdomains = ['www', 'cdn', 'static', 'assets', 'img', 'images'];
    subdomains.forEach(subdomain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${subdomain}.${currentDomain}`;
      document.head.appendChild(link);
    });
  }

  // Optimize images for faster loading
  function optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add loading="lazy" for images below the fold
      if (!img.hasAttribute('loading')) {
        const rect = img.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          img.loading = 'lazy';
        }
      }
    });
  }

  // Optimize external scripts
  function optimizeScripts() {
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      // Add async to non-critical scripts
      if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
        // Only add async if it's not a critical script
        const src = script.src.toLowerCase();
        if (!src.includes('jquery') && !src.includes('bootstrap') && !src.includes('critical')) {
          script.async = true;
        }
      }
    });
  }

  // Preload critical resources
  function preloadCriticalResources() {
    // Find and preload critical CSS and JS files
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const scripts = document.querySelectorAll('script[src]');

    links.forEach(link => {
      if (link.href && !link.hasAttribute('data-preloaded')) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = link.href;
        preloadLink.as = 'style';
        preloadLink.setAttribute('data-preloaded', 'true');
        document.head.appendChild(preloadLink);
      }
    });

    scripts.forEach(script => {
      if (script.src && !script.hasAttribute('data-preloaded')) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = script.src;
        preloadLink.as = 'script';
        preloadLink.setAttribute('data-preloaded', 'true');
        document.head.appendChild(preloadLink);
      }
    });
  }

  // Performance monitoring
  function reportPerformance() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;

      // Send performance data to main process if needed
      console.log(`Page load time: ${loadTime}ms, DOM ready: ${domReady}ms`);
    }
  }

  // Optimize fonts loading
  function optimizeFonts() {
    const fontLinks = document.querySelectorAll('link[href*="fonts"]');
    fontLinks.forEach(link => {
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'font');
      link.setAttribute('type', 'font/woff2');
      link.setAttribute('crossorigin', 'anonymous');
    });
  }

  // Initialize optimizations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      enableDNSPrefetch();
      addResourceHints();
      optimizeImages();
      optimizeScripts();
      preloadCriticalResources();
      optimizeFonts();
    });
  } else {
    enableDNSPrefetch();
    addResourceHints();
    optimizeImages();
    optimizeScripts();
    preloadCriticalResources();
    optimizeFonts();
  }

  // Report performance when page is fully loaded
  window.addEventListener('load', reportPerformance);

  // Optimize images as they're added dynamically
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'IMG') {
            const rect = node.getBoundingClientRect();
            if (rect.top > window.innerHeight && !node.hasAttribute('loading')) {
              node.loading = 'lazy';
            }
          }
          // Also check for images within added elements
          const images = node.querySelectorAll && node.querySelectorAll('img');
          if (images) {
            images.forEach(img => {
              const rect = img.getBoundingClientRect();
              if (rect.top > window.innerHeight && !img.hasAttribute('loading')) {
                img.loading = 'lazy';
              }
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
