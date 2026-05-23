// options.js

const sections = {
    general: { title: "General Settings", subtitle: "Configure your core protection parameters." },
    lists: { title: "Domain Management", subtitle: "Manage the database of restricted hostnames." },
    keywords: { title: "Content Filtering", subtitle: "Define patterns to block based on page content." },
    security: { title: "Security & Privacy", subtitle: "Protect your configuration and manage keys." }
};

let state = {
    BLOCK_METHOD: 'blocked_page',
    CUSTOM_DOMAINS: [],
    CUSTOM_KEYWORDS: [],
    ACTIVE_GAME_INDEX: -1
};

async function init() {
    await loadConfig();
    
    // 1. Setup Static UI & Listeners first
    setupNavigation();
    setupEnforcementCards();
    
    // 2. Populate dynamic elements (Games) so they exist in the DOM
    populateGames();
    
    // 3. Setup List Managers
    setupListManager('domain-input', 'add-domain-btn', 'domain-list', 'CUSTOM_DOMAINS');
    setupListManager('keyword-input', 'add-keyword-btn', 'keyword-list', 'CUSTOM_KEYWORDS');
    
    // 4. Finally restore stored options (now that listeners and elements are ready)
    await restore_options();

    // Initial render of lists (List Managers do this, but just to be sure)
    renderList('domain-list', 'CUSTOM_DOMAINS');
    renderList('keyword-list', 'CUSTOM_KEYWORDS');
}

/**
 * Persists current state to chrome.storage.local
 */
function saveState() {
    const activeGameRadio = document.querySelector('input[name="activeGame"]:checked');
    state.ACTIVE_GAME_INDEX = activeGameRadio ? parseInt(activeGameRadio.value) : -1;

    chrome.storage.local.set({
        BLOCK_METHOD: state.BLOCK_METHOD,
        CUSTOM_DOMAINS: state.CUSTOM_DOMAINS,
        CUSTOM_KEYWORDS: state.CUSTOM_KEYWORDS,
        ACTIVE_GAME_INDEX: state.ACTIVE_GAME_INDEX
    }, () => {
        if (!chrome.runtime.lastError) {
            showToast('Settings auto-saved.');
        }
    });
}

/**
 * Handles sidebar navigation
 */
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            if (!sections[sectionId]) return;

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            document.getElementById('page-title').textContent = sections[sectionId].title;
            document.getElementById('page-subtitle').textContent = sections[sectionId].subtitle;

            document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${sectionId}`).classList.add('active');
        });
    });
}

/**
 * Updates the visibility of the Hub Experience section
 */
function updateHubVisibility(method) {
    const gameSection = document.getElementById('game-selection');
    if (method === 'blocked_page') {
        gameSection.classList.remove('hidden');
    } else {
        gameSection.classList.add('hidden');
    }
}

/**
 * Handles block method card selection
 */
function setupEnforcementCards() {
    const inputs = document.querySelectorAll('input[name="blockMethod"]');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            state.BLOCK_METHOD = input.value;
            updateHubVisibility(input.value);
            saveState(); // Auto-save
        });
    });
}

/**
 * Generic list manager for Domains and Keywords
 */
function setupListManager(inputId, btnId, listId, stateKey) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);

    const addItem = () => {
        const val = input.value.trim().toLowerCase();
        if (val && !state[stateKey].includes(val)) {
            state[stateKey].push(val);
            renderList(listId, stateKey);
            input.value = '';
            saveState(); // Auto-save
        }
    };

    btn.addEventListener('click', addItem);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });
}

function renderList(listId, stateKey) {
    const container = document.getElementById(listId);
    if (!container) return;
    container.innerHTML = '';
    
    state[stateKey].forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'tag-item';
        el.innerHTML = `
            <span>${item}</span>
            <div class="tag-delete" data-key="${stateKey}" data-index="${index}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        `;
        container.appendChild(el);
    });

    // Re-attach delete listeners
    container.querySelectorAll('.tag-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            const idx = parseInt(btn.getAttribute('data-index'));
            state[key].splice(idx, 1);
            renderList(listId, key);
            saveState(); // Auto-save
        });
    });
}

function populateGames() {
    const gameList = document.getElementById('game-list');
    if (!gameList) return;
    gameList.innerHTML = '';

    const randomRadio = document.querySelector('input[name="activeGame"][value="-1"]');
    if (randomRadio) {
        randomRadio.addEventListener('change', saveState);
    }

    CONFIG.GAMES.forEach((game, index) => {
        const label = document.createElement('label');
        label.className = 'hub-item';
        label.innerHTML = `
            <input type="radio" name="activeGame" value="${index}" class="sr-only">
            <div class="hub-item-box">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 7 5 5-5 5"></path><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                <span>${game.name}</span>
            </div>
        `;
        const radio = label.querySelector('input');
        radio.addEventListener('change', saveState);
        gameList.appendChild(label);
    });
}

async function restore_options() {
    return new Promise((resolve) => {
        chrome.storage.local.get({
            BLOCK_METHOD: 'blocked_page',
            CUSTOM_DOMAINS: [],
            CUSTOM_KEYWORDS: [],
            ACTIVE_GAME_INDEX: -1
        }, (items) => {
            state = items;

            // Restore Block Method UI
            const methodInput = document.querySelector(`input[name="blockMethod"][value="${state.BLOCK_METHOD}"]`);
            if (methodInput) {
                methodInput.checked = true;
                updateHubVisibility(state.BLOCK_METHOD);
            }

            // Restore Active Game
            const gameRadio = document.querySelector(`input[name="activeGame"][value="${state.ACTIVE_GAME_INDEX}"]`);
            if (gameRadio) gameRadio.checked = true;

            resolve();
        });
    });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;
    
    toastText.textContent = msg;
    toast.classList.add('show');
    
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000);
}

document.addEventListener('DOMContentLoaded', init);
