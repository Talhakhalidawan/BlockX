// inject.js - Runs in the MAIN world at document_start to intercept SPA history routing transitions
(function () {
  'use strict';

  // --- 1. INTERCEPT SPA HISTORY ROUTING ---
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
