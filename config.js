let CONFIG = {
  // 'blocked_page', 'infinite_hang', 'data_uri'
  BLOCK_METHOD: 'blocked_page', 
  
  // If true, shows the game specified in ACTIVE_GAME_INDEX instead of blocked.html
  SHOW_GAME_INSTANTLY: true,
  ACTIVE_GAME_INDEX: 0, 

  // Custom Keywords (Overridden by badwords.json if loaded)
  KEYWORDS: [],

  // Custom Domains (Overridden by domains.json if loaded)
  DOMAINS: [],

  // Specific Pages or Paths to block
  PAGE_URLS: [
    'reddit.com/r/nsfw',
    'reddit.com/r/porn',
    'twitter.com/search?q=porn',
    'google.com/search?q=porn',
    'bing.com/search?q=porn'
  ],

  GAMES: [
    { name: "Tower Blocks", path: "blocked-pages/tower-blocks.html" },
    { name: "Rubiks Cube", path: "blocked-pages/rubiks-cube.html" },
  ]
};

/**
 * Loads configuration from chrome.storage.local and merges it into CONFIG.
 */
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      BLOCK_METHOD: 'blocked_page',
      CUSTOM_KEYWORDS: [],
      CUSTOM_DOMAINS: [],
      ACTIVE_GAME_INDEX: -1
    }, (items) => {
      CONFIG.BLOCK_METHOD = items.BLOCK_METHOD;
      CONFIG.KEYWORDS = items.CUSTOM_KEYWORDS;
      CONFIG.DOMAINS = items.CUSTOM_DOMAINS;
      CONFIG.ACTIVE_GAME_INDEX = items.ACTIVE_GAME_INDEX;
      resolve(CONFIG);
    });
  });
}

function getBlockUrl(method, hostname, extensionUrl) {
  if (method === 'blocked_page' && CONFIG.SHOW_GAME_INSTANTLY && CONFIG.GAMES.length > 0) {
    let gameIndex = CONFIG.ACTIVE_GAME_INDEX;
    if (gameIndex === -1) {
      gameIndex = Math.floor(Math.random() * CONFIG.GAMES.length);
    }
    const game = CONFIG.GAMES[gameIndex];
    return chrome.runtime.getURL(game.path);
  }

  switch (method) {
    case 'infinite_hang':
      return "http://1.1.1.1:81";
    case 'data_uri':
      return "data:" + (hostname || "Blocked");
    case 'blocked_page':
    default:
      return extensionUrl || chrome.runtime.getURL("blocked.html");
  }
}
