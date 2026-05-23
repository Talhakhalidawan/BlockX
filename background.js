// Import shared config
importScripts('config.js');

async function updateBlockingRules() {
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map(rule => rule.id);

  let rules = [];
  
  if (CONFIG.BLOCK_METHOD !== 'none') {
    CONFIG.KEYWORDS.forEach((kw, index) => {
      let action;
      const id = index + 100;

      // Determine the target URL based on config
      const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD);

      switch (CONFIG.BLOCK_METHOD) {
        case 'infinite_hang':
          action = { type: 'redirect', redirect: { url: targetUrl } };
          break;
        case 'data_uri':
          action = { type: 'redirect', redirect: { url: 'data:text/plain,Blocked' } };
          break;
        case 'blocked_page':
        default:
          if (CONFIG.SHOW_GAME_INSTANTLY) {
             const game = CONFIG.GAMES[CONFIG.ACTIVE_GAME_INDEX];
             action = { type: 'redirect', redirect: { extensionPath: '/' + game.path } };
          } else {
             action = { type: 'redirect', redirect: { extensionPath: '/blocked.html' } };
          }
          break;
      }

      rules.push({
        id: id,
        priority: 2,
        action: action,
        condition: {
          urlFilter: `*${kw}*`,
          resourceTypes: ['main_frame']
        }
      });
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: rules
  });
}

chrome.runtime.onInstalled.addListener(updateBlockingRules);
chrome.runtime.onStartup.addListener(updateBlockingRules);

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
