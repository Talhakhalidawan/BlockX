const CONFIG = {
  // 'blocked_page', 'infinite_hang', 'data_uri'
  BLOCK_METHOD: 'blocked_page', 
  
  // If true, shows the game specified in ACTIVE_GAME_INDEX instead of blocked.html
  SHOW_GAME_INSTANTLY: true,
  ACTIVE_GAME_INDEX: 0, 

  KEYWORDS: [
    'porn', 'nude', 'xxx', 'hentai', 'pornhub', 'xvideos', 
    'sex', 'adult', 'fuck', 'bastard', 'facebook'
  ],

  GAMES: [
    { name: "Drive Mad", path: "blocked-pages/drive-mad.html" },
    { name: "Rubiks Cube", path: "blocked-pages/rubiks-cube.html" },
    { name: "Tower Blocks", path: "blocked-pages/tower-blocks.html" },
  ]
};

function getBlockUrl(method, hostname, extensionUrl) {
  if (method === 'blocked_page' && CONFIG.SHOW_GAME_INSTANTLY && CONFIG.GAMES.length > 0) {
    const game = CONFIG.GAMES[CONFIG.ACTIVE_GAME_INDEX];
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
