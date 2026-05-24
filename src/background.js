// background.js
importScripts('config.js');

const DYNAMIC_RULE_LIMIT = chrome.declarativeNetRequest.MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES || 5000;

// ------------------------------------------------------------------
// ULTRA-FAST DOMAIN LOOKUP (Binary search on binary file with precomputed offsets)
// ------------------------------------------------------------------

/** Sorted domain list loaded as a raw ArrayBuffer. */
let domainBuffer = null;
/** Number of domains stored in the buffer. */
let domainCount = 0;
/** Precomputed offsets to achieve O(1) random access in variable-width binary strings. */
let domainOffsets = [];

/**
 * Loads the binary domain file and stores it for binary search.
 * The file format: [2-byte length][UTF-8 string]... repeated.
 */
async function loadMasterDomainList() {
  try {
    const resp = await fetch(chrome.runtime.getURL('assets/data/domains.bin'));
    domainBuffer = await resp.arrayBuffer();
    
    // Precompute offsets for true O(1) string retrieval
    let offset = 0;
    const view = new DataView(domainBuffer);
    const tempOffsets = [];
    
    while (offset < domainBuffer.byteLength) {
      tempOffsets.push(offset);
      const len = view.getUint16(offset);  // big-endian
      offset += 2 + len;
    }
    
    domainOffsets = tempOffsets;
    domainCount = domainOffsets.length;
    console.log(`[BlockX] Optimized binary domain list loaded: ${domainCount} entries`);
  } catch (e) {
    console.error('[BlockX] Failed to load binary domain file:', e);
    domainBuffer = null;
    domainCount = 0;
    domainOffsets = [];
  }
}

/**
 * Reads a domain at a specific index (0‑based) from the binary buffer in O(1) time.
 * @param {number} index
 * @returns {string} domain in lowercase, or null if out of range
 */
function readDomainAt(index) {
  if (!domainBuffer || index >= domainCount) return null;
  const offset = domainOffsets[index];
  const view = new DataView(domainBuffer);
  const len = view.getUint16(offset);
  const bytes = new Uint8Array(domainBuffer, offset + 2, len);
  return new TextDecoder().decode(bytes);
}

/**
 * Binary search for a domain in the master list in O(log N) time.
 * @param {string} domain – normalised domain (lowercase, no www.)
 * @returns {boolean}
 */
function isMasterBlocked(domain) {
  if (!domainBuffer || domainCount === 0) return false;
  let low = 0;
  let high = domainCount - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const midDomain = readDomainAt(mid);
    if (midDomain === null) return false;
    const cmp = domain.localeCompare(midDomain);
    if (cmp === 0) return true;
    else if (cmp < 0) high = mid - 1;
    else low = mid + 1;
  }
  return false;
}

// ------------------------------------------------------------------
// PUNYCODE HELPER (IDN → ASCII)
// ------------------------------------------------------------------
function toPunycode(domain) {
  try {
    return new URL('http://' + domain).hostname;
  } catch {
    return domain;
  }
}

const isAscii = (str) => /^[\x00-\x7F]*$/.test(str);

// ------------------------------------------------------------------
// DNR RULES UPDATE (user‑defined only)
// ------------------------------------------------------------------
async function updateBlockingRules() {
  try {
    const config = await loadConfig();
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    if (config.BLOCK_METHOD === 'none') {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds });
      return;
    }

    const rules = [];
    // Start dynamic rules from ID 10000 to prevent collisions with static rulesets!
    let ruleId = 10000;

    const action = (() => {
      switch (config.BLOCK_METHOD) {
        case 'infinite_hang':
          return { type: 'redirect', redirect: { url: 'http://1.1.1.1:81' } };
        case 'data_uri':
          return { type: 'redirect', redirect: { url: 'data:text/plain,Blocked' } };
        default:
          if (config.SHOW_GAME_INSTANTLY && config.GAMES.length > 0) {
            let index = config.ACTIVE_GAME_INDEX;
            if (index === -1) index = Math.floor(Math.random() * config.GAMES.length);
            return { type: 'redirect', redirect: { extensionPath: '/' + config.GAMES[index].path } };
          }
          return { type: 'redirect', redirect: { extensionPath: '/assets/blocked-pages/blocked.html' } };
      }
    })();

    const addRule = (priority, filter, isDomain = false) => {
      if (rules.length >= DYNAMIC_RULE_LIMIT) return false;
      const clean = filter.trim().toLowerCase();
      if (!clean) return false;

      if (isDomain) {
        const asciiDomain = toPunycode(clean);
        if (!isAscii(asciiDomain)) return false;
        rules.push({
          id: ruleId++,
          priority,
          action,
          condition: {
            urlFilter: `||${asciiDomain}^`,
            resourceTypes: ['main_frame']
          }
        });
        return true;
      }

      if (!isAscii(clean)) return false;
      rules.push({
        id: ruleId++,
        priority,
        action,
        condition: {
          urlFilter: clean,
          resourceTypes: ['main_frame']
        }
      });
      return true;
    };

    [...new Set(config.DOMAINS)].forEach(d => addRule(10, d, true));
    [...new Set(config.KEYWORDS)].forEach(k => addRule(9, k));
    config.PAGE_URLS.forEach(p => addRule(8, p));

    console.log(`[BlockX] Applying ${rules.length}/${DYNAMIC_RULE_LIMIT} dynamic user rules starting at ID 10000.`);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });

    chrome.storage.session.remove('CACHED_BADWORDS');

  } catch (err) {
    console.error("[BlockX] Fatal error in updateBlockingRules:", err);
  }
}

// ------------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  loadMasterDomainList();
  updateBlockingRules();
});
chrome.runtime.onStartup.addListener(() => {
  loadMasterDomainList();
  updateBlockingRules();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local') {
    const shouldUpdate = [
      'CUSTOM_DOMAINS',
      'CUSTOM_KEYWORDS',
      'CUSTOM_PAGES',
      'BLOCK_METHOD',
      'ACTIVE_GAME_INDEX'
    ].some(key => changes[key] !== undefined);

    if (shouldUpdate) {
      console.log("[BlockX] Storage config changed. Re-synchronizing rules...");
      await updateBlockingRules();
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    loadConfig().then(() => {
      sendResponse({ config: CONFIG });
    });
    return true; // Keep message channel open for asynchronous reply
  }
  if (request.action === 'triggerBlock' && sender.tab) {
    loadConfig().then(() => {
      const url = new URL(sender.tab.url);
      const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, url.hostname);
      chrome.tabs.update(sender.tab.id, { url: targetUrl });
    });
    return true; // Keep message channel open for asynchronous reply
  }
  if (request.action === 'isMasterBlocked') {
    const domain = request.domain?.toLowerCase().replace(/^www\./, '');
    sendResponse({ blocked: isMasterBlocked(domain) });
  }
  return true;
});

// ------------------------------------------------------------------
// RELIABLE SPA NAVIGATION INTERCEPTION (tabs.onUpdated)
// ------------------------------------------------------------------

/**
 * Checks if the URL matches custom domains, pages, keywords, or master blocked list.
 */
function shouldBlockUrl(urlStr, config) {
  if (!urlStr) return false;
  const urlLower = urlStr.toLowerCase();
  
  if (urlLower.startsWith('chrome-extension://') || urlLower.startsWith('chrome://') || urlLower.startsWith('about:')) {
    return false;
  }

  // 1. Check custom domains
  if (config.DOMAINS && config.DOMAINS.length > 0) {
    try {
      const parsed = new URL(urlStr);
      const hostname = parsed.hostname.toLowerCase();
      const domainMatch = config.DOMAINS.some(d => {
        const clean = d.trim().toLowerCase();
        return hostname === clean || hostname.endsWith('.' + clean);
      });
      if (domainMatch) return true;
    } catch (e) {
      const domainMatch = config.DOMAINS.some(d => {
        const clean = d.trim().toLowerCase();
        return urlLower.includes(clean);
      });
      if (domainMatch) return true;
    }
  }

  // 2. Check custom pages
  if (config.PAGE_URLS && config.PAGE_URLS.length > 0) {
    const pageMatch = config.PAGE_URLS.some(p => {
      const clean = p.trim().toLowerCase();
      const cleanPattern = clean.replace(/^https?:\/\//i, '');
      return urlLower.includes(cleanPattern);
    });
    if (pageMatch) return true;
  }

  // 3. Check custom keywords
  if (config.KEYWORDS && config.KEYWORDS.length > 0) {
    const keywordMatch = config.KEYWORDS.some(k => {
      const clean = k.trim().toLowerCase();
      return urlLower.includes(clean);
    });
    if (keywordMatch) return true;
  }

  // 4. Check master domains list
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (isMasterBlocked(hostname)) return true;
  } catch (e) {
    // Ignore URL parsing errors
  }

  return false;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const url = changeInfo.url;
    if (url.startsWith('chrome-extension://') || url.startsWith('chrome://') || url.startsWith('about:')) {
      return;
    }

    const config = await loadConfig();
    if (config.BLOCK_METHOD === 'none') return;

    if (shouldBlockUrl(url, config)) {
      console.log(`[BlockX] Intercepted blocked URL via tabs.onUpdated: ${url}`);
      try {
        const parsedUrl = new URL(url);
        const targetUrl = getBlockUrl(config.BLOCK_METHOD, parsedUrl.hostname);
        chrome.tabs.update(tabId, { url: targetUrl });
      } catch (err) {
        const targetUrl = getBlockUrl(config.BLOCK_METHOD, '');
        chrome.tabs.update(tabId, { url: targetUrl });
      }
    }
  }
});