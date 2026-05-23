(function() {
  // CONFIG and getBlockUrl are loaded via manifest.json (config.js)

  function handleBlock() {
    const hostname = window.location.hostname;
    // getBlockUrl will return the game URL if SHOW_GAME_INSTANTLY is true
    const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, hostname);
    
    // Notify background for a tab-level redirect if needed
    if (CONFIG.BLOCK_METHOD === 'blocked_page') {
      chrome.runtime.sendMessage({ action: 'triggerBlock' });
    }
    window.location.href = targetUrl;
  }

  function containsExplicitContent(text) {
    const lowerText = text.toLowerCase();
    return CONFIG.KEYWORDS.some(kw => {
      if (kw.length <= 3) return lowerText.includes(kw);
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  if (containsExplicitContent(window.location.href)) {
    handleBlock();
    return;
  }

  const css = 'html { visibility: hidden !important; background: #ffffff !important; }';
  const head = document.head || document.documentElement;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);

  function verifyPageSafety() {
    if (document.title) {
      if (containsExplicitContent(document.title)) {
        observer.disconnect();
        handleBlock();
      } else {
        if (style.parentNode) style.parentNode.removeChild(style);
      }
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
