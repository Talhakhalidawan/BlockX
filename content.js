(async function() {
  // CONFIG and getBlockUrl are loaded via manifest.json (config.js)
  await loadConfig();
  
  let BADWORDS = [];

  // Fetch badwords list for title checking
  fetch(chrome.runtime.getURL('data/badwords.json'))
    .then(r => r.json())
    .then(list => {
      BADWORDS = list;
      verifyPageSafety(); // Re-check title after list loads
    });

  function handleBlock() {
    const hostname = window.location.hostname;
    const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, hostname);
    
    if (CONFIG.BLOCK_METHOD === 'blocked_page') {
      chrome.runtime.sendMessage({ action: 'triggerBlock' });
    }
    window.location.href = targetUrl;
  }

  function containsExplicitContent(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    
    // Check combined keywords (custom + JSON)
    const allKeywords = CONFIG.KEYWORDS.concat(BADWORDS);
    
    return allKeywords.some(kw => {
      if (!kw || kw.length < 3) return false;
      // Use simple includes for the huge list to keep performance high
      // but only if it's not a common sub-word
      return lowerText.includes(kw.toLowerCase());
    });
  }

  // Phase 1: Pre-check URL and Domain instantly
  const currentHostname = window.location.hostname;
  const isBlockedDomain = CONFIG.DOMAINS.some(d => 
    currentHostname === d || currentHostname.endsWith('.' + d)
  );

  if (isBlockedDomain || containsExplicitContent(window.location.href)) {
    handleBlock();
    return;
  }

  // Phase 2: Inject CSS to obscure page
  const css = 'html { visibility: hidden !important; background: #ffffff !important; }';
  const head = document.head || document.documentElement;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);

  // Phase 3: Evaluate title safety dynamically
  function verifyPageSafety() {
    if (document.title && containsExplicitContent(document.title)) {
      observer.disconnect();
      handleBlock();
    } else if (document.title) {
      // If we've reached DOMContentLoaded and the title is safe, remove the barrier
      // (Safety net handles this too)
      if (style.parentNode) style.parentNode.removeChild(style);
    }
  }

  verifyPageSafety();
  const observer = new MutationObserver(verifyPageSafety);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });

  window.addEventListener('DOMContentLoaded', () => {
    if (style.parentNode) style.parentNode.removeChild(style);
    observer.disconnect();
  });
})();
