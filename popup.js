// popup.js

let currentTab = null;
let currentContext = { type: 'domain', value: '' };

async function init() {
    await loadConfig();
    await detectContext();
    setupListeners();
}

/**
 * Detects if we should block a domain or a search keyword
 */
async function detectContext() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    if (!currentTab || !currentTab.url) return;

    const url = new URL(currentTab.url);
    const domain = url.hostname;
    const protocol = url.protocol;

    // 1. Check for system pages (chrome://, about:, edge://, etc.)
    const systemProtocols = ['chrome:', 'about:', 'edge:', 'brave:', 'view-source:', 'chrome-extension:'];
    if (systemProtocols.includes(protocol) || domain === 'chrome.google.com') {
        document.getElementById('context-action').classList.add('hidden');
        document.getElementById('display-name').textContent = "System Protected Page";
        return;
    }

    // 2. Detect Google Search Keyword
    if (domain.includes('google.com') && url.pathname.includes('/search')) {
        const params = new URLSearchParams(url.search);
        const query = params.get('q');
        if (query) {
            currentContext = { type: 'keyword', value: query };
            document.getElementById('display-name').textContent = `"${query}"`;
            document.getElementById('context-type').textContent = 'Search Keyword';
            document.getElementById('block-type-label').textContent = 'Keyword';
            return;
        }
    }

    // 3. Default: Domain
    currentContext = { type: 'domain', value: domain };
    document.getElementById('display-name').textContent = domain;
    document.getElementById('context-type').textContent = 'Domain';
    document.getElementById('block-type-label').textContent = 'Site';
}

function setupListeners() {
    // Open Settings
    const settingsBtn = document.getElementById('open-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Block Context Button
    const blockBtn = document.getElementById('block-btn');
    if (blockBtn) {
        blockBtn.addEventListener('click', async () => {
            const { type, value } = currentContext;
            if (!value) return;
            
            chrome.storage.local.get({
                CUSTOM_DOMAINS: [],
                CUSTOM_KEYWORDS: []
            }, (items) => {
                if (type === 'domain') {
                    if (!items.CUSTOM_DOMAINS.includes(value)) {
                        items.CUSTOM_DOMAINS.push(value);
                    }
                } else {
                    if (!items.CUSTOM_KEYWORDS.includes(value)) {
                        items.CUSTOM_KEYWORDS.push(value);
                    }
                }

                chrome.storage.local.set(items, () => {
                    // If it was a domain, redirect them out immediately
                    if (type === 'domain' && currentTab) {
                        const targetUrl = getBlockUrl(CONFIG.BLOCK_METHOD, value);
                        chrome.tabs.update(currentTab.id, { url: targetUrl });
                    } else if (currentTab) {
                        // For keywords, just reload the page to trigger block
                        chrome.tabs.reload(currentTab.id);
                    }
                    window.close();
                });
            });
        });
    }

    // Toggle Quick Add
    const toggleBtn = document.getElementById('toggle-quick-add');
    const panel = document.getElementById('quick-add-panel');
    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.toggle('active');
            panel.classList.toggle('hidden');
        });
    }

    // Quick Add Logic
    const saveBtn = document.getElementById('quick-save-btn');
    const quickInput = document.getElementById('quick-input');
    if (saveBtn) saveBtn.addEventListener('click', saveQuickAdd);
    if (quickInput) {
        quickInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveQuickAdd();
        });
    }
}

function saveQuickAdd() {
    const input = document.getElementById('quick-input');
    if (!input) return;
    const rawVal = input.value.trim().toLowerCase();
    if (!rawVal) return;

    // Simple auto-detection: if it contains a dot and doesn't have spaces, it's likely a domain
    const isDomain = rawVal.includes('.') && !rawVal.includes(' ');
    const storageKey = isDomain ? 'CUSTOM_DOMAINS' : 'CUSTOM_KEYWORDS';

    chrome.storage.local.get({
        CUSTOM_DOMAINS: [],
        CUSTOM_KEYWORDS: []
    }, (items) => {
        if (!items[storageKey].includes(rawVal)) {
            items[storageKey].push(rawVal);
            chrome.storage.local.set(items, () => {
                input.value = '';
                input.placeholder = "Added successfully!";
                setTimeout(() => {
                    input.placeholder = "Enter domain or keyword...";
                    const toggleBtn = document.getElementById('toggle-quick-add');
                    if (toggleBtn) toggleBtn.click(); // close
                }, 1000);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
