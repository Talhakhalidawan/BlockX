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
    const badwords = await loadList('badwords.json');
    const domains = await loadList('domains.json');

    let rules = [];
    let ruleId = 100;
    
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
              // For DNR rules, we can't easily do "random" per request without multiple rules.
              // We'll pick a game during rule generation, or just use the first one if -1.
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

      // 1. Process Page URLs (Highest Priority)
      CONFIG.PAGE_URLS.forEach((pageUrl) => {
        if (rules.length < DYNAMIC_RULE_LIMIT && isAscii(pageUrl)) {
          rules.push({
            id: ruleId++,
            priority: 4,
            action: action,
            condition: { urlFilter: `*${pageUrl}*`, resourceTypes: ['main_frame'] }
          });
        }
      });

      // 2. Process Badwords (High Priority)
      badwords.concat(CONFIG.KEYWORDS).forEach((kw) => {
        if (rules.length < DYNAMIC_RULE_LIMIT && kw.trim() && isAscii(kw)) {
          rules.push({
            id: ruleId++,
            priority: 2,
            action: action,
            condition: { urlFilter: `*${kw}*`, resourceTypes: ['main_frame'] }
          });
        }
      });

      // 3. Process Domains (Up to limit)
      domains.concat(CONFIG.DOMAINS).forEach((domain) => {
        if (rules.length < DYNAMIC_RULE_LIMIT && domain.trim() && isAscii(domain)) {
          rules.push({
            id: ruleId++,
            priority: 3,
            action: action,
            condition: { urlFilter: `||${domain}`, resourceTypes: ['main_frame'] }
          });
        }
      });
    }

    console.log(`Applying ${rules.length} blocking rules...`);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });
  } catch (err) {
    // This catches the missing syntax and API errors properly
    console.error("Failed to update DNR rules:", err);
  }
}

chrome.runtime.onInstalled.addListener(updateBlockingRules);
chrome.runtime.onStartup.addListener(updateBlockingRules);

// Listen for settings changes
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