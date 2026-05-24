// inject.js - Runs in the MAIN world at document_start to block YouTube Shorts SPA routing & Service Worker
(function () {
  'use strict';

  // --- 1. DISABLE AND UNREGISTER SERVICE WORKERS FOR YOUTUBE ---
  if (navigator.serviceWorker) {
    const originalRegister = navigator.serviceWorker.register;
    Object.defineProperty(navigator.serviceWorker, 'register', {
      value: function (scriptURL, options) {
        console.warn('[ShortsBlocker] Blocked Service Worker registration for:', scriptURL);
        return Promise.reject(new Error('Service Workers disabled by extension.'));
      },
      writable: false,
      configurable: false
    });

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[ShortsBlocker] Successfully unregistered existing Service Worker.');
            window.location.reload();
          }
        });
      }
    });
  }

  // --- 2. INTERCEPT SPA HISTORY ROUTING ---
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  function handleNavigation(url) {
    if (!url) return;
    const urlString = url.toString();
    // Notify the isolated world content script that the URL is changing
    window.postMessage({ type: 'URL_CHANGED', url: urlString }, '*');
  }

  history.pushState = function (state, title, url) {
    const result = originalPushState.apply(this, arguments);
    handleNavigation(url);
    return result;
  };

  history.replaceState = function (state, title, url) {
    const result = originalReplaceState.apply(this, arguments);
    handleNavigation(url);
    return result;
  };
})();
