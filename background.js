// background.js
importScripts('config.js');

const DYNAMIC_RULE_LIMIT = chrome.declarativeNetRequest.MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES || 5000;

// ------------------------------------------------------------------
// FAST DOMAIN LOOKUP (Binary Search)
// ------------------------------------------------------------------

/** Sorted array of all master domains (loaded once). */
let masterDomainList = null;

/**
 * Loads the sorted and cleaned domain list from data/domains.json.
 * Called on install / startup.
 */
async function loadMasterDomainList() {
  try {
    const resp = await fetch(chrome.runtime.getURL('data/domains.json'));
    masterDomainList = await resp.json();
    console.log(`[BlockX] Master domain list loaded: ${masterDomainList.length} entries`);
  } catch (e) {
    console.error('[BlockX] Failed to load master domain list:', e);
    masterDomainList = [];
  }
}

/**
 * Binary search for a domain in the master list.
 * @param {string} domain – normalised domain (lowercase, no www.)
 * @returns {boolean} true if the domain exists in the master blocklist.
 */
function isMasterBlocked(domain) {
  if (!masterDomainList || masterDomainList.length === 0) return false;
  let low = 0;
  let high = masterDomainList.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cmp = domain.localeCompare(masterDomainList[mid]);
    if (cmp === 0) return true;
    else if (cmp < 0) high = mid - 1;
    else low = mid + 1;
  }
  return false;
}

// ------------------------------------------------------------------
// PUNYCODE HELPER (IDN → ASCII)
// ------------------------------------------------------------------

/**
 * Converts an international domain name to Punycode ASCII.
 * Example: "münchen.de" → "xn--mnchen-3ya.de"
 */
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
    let ruleId = 1;

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
          return { type: 'redirect', redirect: { extensionPath: '/blocked.html' } };
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

      // keywords – must be ASCII to avoid mismatches
      if (!isAscii(clean)) return false;
      rules.push({
        id: ruleId++,
        priority,
        action,
        condition: {
          urlFilter: `*${clean}*`,
          resourceTypes: ['main_frame']
        }
      });
      return true;
    };

    // 1. User Domains (priority 10)
    [...new Set(config.DOMAINS)].forEach(d => addRule(10, d, true));

    // 2. User Keywords (priority 9)
    [...new Set(config.KEYWORDS)].forEach(k => addRule(9, k));

    // 3. Static Page URLs (priority 8)
    config.PAGE_URLS.forEach(p => addRule(8, p));

    console.log(`[BlockX] Applying ${rules.length}/${DYNAMIC_RULE_LIMIT} dynamic user rules.`);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });

    // Invalidate content‑script keyword cache
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

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.CUSTOM_DOMAINS || changes.CUSTOM_KEYWORDS || changes.BLOCK_METHOD)) {
    updateBlockingRules();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    sendResponse({ config: CONFIG });
  }
  if (request.action === 'triggerBlock' && sender.tab) {
    const url = new URL(sender.tab.url);
    const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, url.hostname);
    chrome.tabs.update(sender.tab.id, { url: targetUrl });
  }
  // Fast binary search lookup for any domain
  if (request.action === 'isMasterBlocked') {
    const domain = request.domain?.toLowerCase().replace(/^www\./, '');
    sendResponse({ blocked: isMasterBlocked(domain) });
  }
  return true; // keeps the message channel open for async responses
});