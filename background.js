// Import shared config
importScripts('config.js');

// Chrome limits "unsafe" (redirect) rules to 5,000, not 30,000. 
const DYNAMIC_RULE_LIMIT = chrome.declarativeNetRequest.MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES || 5000;

async function loadList(filename) {
    try {
        const response = await fetch(chrome.runtime.getURL('data/' + filename));
        return await response.json();
    } catch (e) {
        console.error(`Failed to load ${filename}:`, e);
        return [];
    }
}

// Helper to ensure urlFilter only contains valid ASCII characters
const isAscii = (str) => /^[\x00-\x7F]*$/.test(str);

async function updateBlockingRules() {
  try {
    await loadConfig();
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    // Load huge lists from JSON files
    const masterBadwords = await loadList('badwords.json');
    const masterDomains = await loadList('domains.json');

    let rules = [];
    let ruleId = 1; // Start from 1 for reliability
    
    if (CONFIG.BLOCK_METHOD !== 'none') {
      function getAction() {
        switch (CONFIG.BLOCK_METHOD) {
          case 'infinite_hang':
            return { type: 'redirect', redirect: { url: 'http://1.1.1.1:81' } };
          case 'data_uri':
            return { type: 'redirect', redirect: { url: 'data:text/plain,Blocked' } };
          case 'blocked_page':
          default:
            if (CONFIG.SHOW_GAME_INSTANTLY && CONFIG.GAMES.length > 0) {
              let gameIndex = CONFIG.ACTIVE_GAME_INDEX;
              if (gameIndex === -1) {
                gameIndex = Math.floor(Math.random() * CONFIG.GAMES.length);
              }
              const game = CONFIG.GAMES[gameIndex];
              return { type: 'redirect', redirect: { extensionPath: '/' + game.path } };
            } else {
              return { type: 'redirect', redirect: { extensionPath: '/blocked.html' } };
            }
        }
      }

      const action = getAction();

      // --- PRIORITY 1: CUSTOM USER DOMAINS ---
      // These MUST be first so they are never truncated by the limit.
      const customDomains = [...new Set(CONFIG.DOMAINS)]; 
      customDomains.forEach((domain) => {
        const d = domain.trim().toLowerCase();
        if (rules.length < DYNAMIC_RULE_LIMIT && d && isAscii(d)) {
          rules.push({
            id: ruleId++,
            priority: 10,
            action: action,
            condition: { urlFilter: `||${d}^`, resourceTypes: ['main_frame'] }
          });
        }
      });

      // --- PRIORITY 2: CUSTOM USER KEYWORDS ---
      const customKeywords = [...new Set(CONFIG.KEYWORDS)];
      customKeywords.forEach((kw) => {
        const k = kw.trim().toLowerCase();
        if (rules.length < DYNAMIC_RULE_LIMIT && k && isAscii(k)) {
          rules.push({
            id: ruleId++,
            priority: 9,
            action: action,
            condition: { urlFilter: `*${k}*`, resourceTypes: ['main_frame'] }
          });
        }
      });

      // --- PRIORITY 3: PAGE SPECIFIC URLS ---
      CONFIG.PAGE_URLS.forEach((pageUrl) => {
        if (rules.length < DYNAMIC_RULE_LIMIT && isAscii(pageUrl)) {
          rules.push({
            id: ruleId++,
            priority: 8,
            action: action,
            condition: { urlFilter: `*${pageUrl}*`, resourceTypes: ['main_frame'] }
          });
        }
      });

      // --- PRIORITY 4: MASTER DOMAINS (From domains.json) ---
      // Only add until we hit the limit
      masterDomains.forEach((domain) => {
        const d = domain.trim().toLowerCase();
        if (rules.length < DYNAMIC_RULE_LIMIT && d && isAscii(d) && !customDomains.includes(d)) {
          rules.push({
            id: ruleId++,
            priority: 5,
            action: action,
            condition: { urlFilter: `||${d}`, resourceTypes: ['main_frame'] }
          });
        }
      });

      // --- PRIORITY 5: MASTER BADWORDS (From badwords.json) ---
      masterBadwords.forEach((kw) => {
        const k = kw.trim().toLowerCase();
        if (rules.length < DYNAMIC_RULE_LIMIT && k && isAscii(k) && !customKeywords.includes(k)) {
          rules.push({
            id: ruleId++,
            priority: 4,
            action: action,
            condition: { urlFilter: `*${k}*`, resourceTypes: ['main_frame'] }
          });
        }
      });
    }

    console.log(`Applying ${rules.length} blocking rules (User defined domains: ${CONFIG.DOMAINS.length})...`);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });
  } catch (err) {
    console.error("Failed to update DNR rules:", err);
  }
}

chrome.runtime.onInstalled.addListener(updateBlockingRules);
chrome.runtime.onStartup.addListener(updateBlockingRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    updateBlockingRules();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    sendResponse({ config: CONFIG });
  }
  if (request.action === 'triggerBlock' && sender.tab) {
     const hostname = new URL(sender.tab.url).hostname;
     const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, hostname);
     chrome.tabs.update(sender.tab.id, { url: targetUrl });
  }
});
