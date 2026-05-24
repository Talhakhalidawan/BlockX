// content.js
(async function() {
  await loadConfig();
  
  let filterRegex = null;

  // Use the best available storage: session (faster) if present, else local
  const storage = chrome.storage.session || chrome.storage.local;

  async function prepareFilter() {
    return new Promise((resolve) => {
      storage.get(['CACHED_BADWORDS'], async (result) => {
        let badwords = null;

        // Guard: result might be undefined in edge cases
        if (result && result.CACHED_BADWORDS) {
          badwords = result.CACHED_BADWORDS;
        }

        if (!badwords) {
          try {
            const r = await fetch(chrome.runtime.getURL('assets/data/badwords.json'));
            badwords = await r.json();
            // Store the fetched list for future tabs
            storage.set({ CACHED_BADWORDS: badwords });
          } catch (e) {
            badwords = [];
          }
        }

        const allKeywords = CONFIG.KEYWORDS.concat(badwords);
        filterRegex = createOptimizedFilter(allKeywords);
        resolve();
      });
    });
  }

  function handleBlock() {
    const hostname = window.location.hostname;
    const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, hostname);
    
    if (window.location.href.includes('chrome-extension://')) return;

    if (CONFIG.BLOCK_METHOD === 'blocked_page') {
      chrome.runtime.sendMessage({ action: 'triggerBlock' });
    }
    window.location.href = targetUrl;
  }

  function isExplicit(text) {
    if (!text || !filterRegex) return false;
    return filterRegex.test(text);
  }

  // Phase 1: Pre‑check URL and domain instantly
  const currentHostname = window.location.hostname;
  const isBlockedDomain = CONFIG.DOMAINS.some(d => 
    currentHostname === d || currentHostname.endsWith('.' + d)
  );

  if (isBlockedDomain || isExplicit(window.location.href)) {
    handleBlock();
    return;
  }

  // Phase 2: Inject CSS barrier
  const style = document.createElement('style');
  style.textContent = 'html { visibility: hidden !important; background: #ffffff !important; }';
  (document.head || document.documentElement).appendChild(style);

  // Phase 3: Wait for regex and then verify
  await prepareFilter();

  function verifyPageSafety() {
    if (isExplicit(document.title) || isExplicit(window.location.href)) {
      observer.disconnect();
      handleBlock();
      return true;
    }
    return false;
  }

  const cleanup = () => {
    if (!verifyPageSafety()) {
      if (style.parentNode) style.parentNode.removeChild(style);
    }
    observer.disconnect();
  };

  const observer = new MutationObserver(() => {
    if (document.title) verifyPageSafety();
  });
  
  observer.observe(document.documentElement, { subtree: true, childList: true });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    cleanup();
  } else {
    window.addEventListener('DOMContentLoaded', cleanup);
  }
})();