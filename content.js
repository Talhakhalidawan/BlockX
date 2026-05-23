(function() {
  // Hardcoded keywords
  const strictKeywords = ['porn', 'nude', 'xxx', 'hentai', 'pornhub', 'xvideos']; 
  const boundaryKeywords = ['sex', 'adult'];

  function containsExplicitContent(text) {
    const lowerText = text.toLowerCase();
    
    // 1. Check strict phrases anywhere in text
    if (strictKeywords.some(kw => lowerText.includes(kw))) return true;
    
    // 2. Check boundary phrases safely (prevents blocking words like "essex")
    return boundaryKeywords.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerText);
    });
  }

  // Phase 1: Pre-check URL instantly
  if (containsExplicitContent(window.location.href)) {
    window.location.href = chrome.runtime.getURL("blocked.html");
    return;
  }

  // Phase 2: Inject CSS to obscure page before browser draws pixels (Prevents Flashing)
  const css = 'html { visibility: hidden !important; background: #ffffff !important; }';
  const head = document.head || document.documentElement;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  head.appendChild(style);

  // Phase 3: Evaluate title safety dynamically
  function verifyPageSafety() {
    if (document.title) {
      if (containsExplicitContent(document.title)) {
        observer.disconnect();
        window.location.href = chrome.runtime.getURL("blocked.html");
      } else {
        // Safe page: strip the visibility barrier immediately
        if (style.parentNode) style.parentNode.removeChild(style);
      }
    }
  }

  // Execute check immediately in case title node is ready
  verifyPageSafety();

  // Watch HTML stream for the exact moment the <title> tag finishes parsing
  const observer = new MutationObserver(verifyPageSafety);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });

  // Safety net cleanup
  window.addEventListener('DOMContentLoaded', () => {
    if (style.parentNode) style.parentNode.removeChild(style);
    observer.disconnect();
  });
})();