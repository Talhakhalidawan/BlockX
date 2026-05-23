// options.js

const sections = {
    general: { title: "General Settings", subtitle: "Configure your core protection parameters." },
    lists: { title: "Domain Management", subtitle: "Manage the database of restricted hostnames." },
    keywords: { title: "Content Filtering", subtitle: "Define patterns to block based on page content." },
    security: { title: "Security Protection", subtitle: "Secure your configuration with a dashboard password." }
};

let state = {
    BLOCK_METHOD: 'blocked_page',
    CUSTOM_DOMAINS: [],
    CUSTOM_KEYWORDS: [],
    ACTIVE_GAME_INDEX: -1,
    SECURITY_ENABLED: false,
    PASSWORD: ''
};

async function init() {
    await loadConfig();
    await restore_options();
    
    // 1. Initial lock state
    if (state.SECURITY_ENABLED) {
        document.body.classList.add('is-locked');
    }

    // 2. Setup Gateway & Listeners
    handleSecurityGateway();
    setupNavigation();
    setupEnforcementCards();
    setupSecurityLogic();
    
    // 3. Populate dynamic elements
    populateGames();
    setupListManager('domain-input', 'add-domain-btn', 'domain-list', 'CUSTOM_DOMAINS');
    setupListManager('keyword-input', 'add-keyword-btn', 'keyword-list', 'CUSTOM_KEYWORDS');
    
    renderList('domain-list', 'CUSTOM_DOMAINS');
    renderList('keyword-list', 'CUSTOM_KEYWORDS');

    // 4. Prevention: Tamper-proof the gateway
    monitorGatewayTampering();
}

/**
 * Ensures the security gateway cannot be deleted or hidden via DevTools.
 */
function monitorGatewayTampering() {
    if (!state.SECURITY_ENABLED) return;

    const observer = new MutationObserver((mutations) => {
        const gateway = document.getElementById('security-gateway');
        const isLocked = document.body.classList.contains('is-locked');
        
        if (isLocked && (!gateway || gateway.classList.contains('hidden'))) {
            // Tampering detected: either element deleted or hidden manually
            window.location.reload(); 
        }
    });

    observer.observe(document.body, { childList: true, attributes: true, subtree: true });
}

function handleSecurityGateway() {
    const gateway = document.getElementById('security-gateway');
    const title = document.getElementById('gateway-title');
    const desc = document.getElementById('gateway-desc');
    const unlockBtn = document.getElementById('gateway-unlock-btn');
    const passInput = document.getElementById('gateway-password');
    const errorMsg = document.getElementById('gateway-error');

    if (!state.SECURITY_ENABLED) {
        gateway.classList.add('hidden');
        document.body.classList.remove('is-locked');
        return;
    }

    if (!state.PASSWORD) {
        title.textContent = "Setup Security";
        desc.textContent = "Please set an initial password for your dashboard.";
        unlockBtn.textContent = "Set & Unlock";
    }

    gateway.classList.remove('hidden');

    const attemptUnlock = () => {
        const input = passInput.value;
        if (!state.PASSWORD) {
            if (input.length < 1) return;
            state.PASSWORD = input;
            saveState();
            unlock();
        } else if (input === state.PASSWORD) {
            unlock();
        } else {
            errorMsg.classList.remove('hidden');
        }
    };

    const unlock = () => {
        gateway.classList.add('hidden');
        document.body.classList.remove('is-locked');
        errorMsg.classList.add('hidden');
        // Briefly disable observer to prevent self-triggering during legitimate unlock
    };

    unlockBtn.addEventListener('click', attemptUnlock);
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptUnlock();
    });
}

function setupSecurityLogic() {
    const toggle = document.getElementById('security-toggle');
    const setupBox = document.getElementById('password-management');
    const updateBtn = document.getElementById('set-password-btn');
    const newPassInput = document.getElementById('new-password');

    toggle.checked = state.SECURITY_ENABLED;
    if (state.SECURITY_ENABLED) setupBox.classList.remove('hidden');

    toggle.addEventListener('change', () => {
        state.SECURITY_ENABLED = toggle.checked;
        if (state.SECURITY_ENABLED) {
            setupBox.classList.remove('hidden');
        } else {
            setupBox.classList.add('hidden');
        }
        saveState();
    });

    updateBtn.addEventListener('click', () => {
        const pass = newPassInput.value;
        if (pass) {
            state.PASSWORD = pass;
            saveState();
            showToast('Password updated successfully.');
            newPassInput.value = '';
        }
    });
}

function saveState() {
    const activeGameRadio = document.querySelector('input[name="activeGame"]:checked');
    state.ACTIVE_GAME_INDEX = activeGameRadio ? parseInt(activeGameRadio.value) : -1;

    chrome.storage.local.set({
        BLOCK_METHOD: state.BLOCK_METHOD,
        CUSTOM_DOMAINS: state.CUSTOM_DOMAINS,
        CUSTOM_KEYWORDS: state.CUSTOM_KEYWORDS,
        ACTIVE_GAME_INDEX: state.ACTIVE_GAME_INDEX,
        SECURITY_ENABLED: state.SECURITY_ENABLED,
        PASSWORD: state.PASSWORD
    }, () => {
        if (!chrome.runtime.lastError) {
            showToast('Settings auto-saved.');
        }
    });
}

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

function updateHubVisibility(method) {
    const gameSection = document.getElementById('game-selection');
    if (method === 'blocked_page') {
        gameSection.classList.remove('hidden');
    } else {
        gameSection.classList.add('hidden');
    }
}

function setupEnforcementCards() {
    const inputs = document.querySelectorAll('input[name="blockMethod"]');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            state.BLOCK_METHOD = input.value;
            updateHubVisibility(input.value);
            saveState();
        });
    });
}

function setupListManager(inputId, btnId, listId, stateKey) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;

    const addItem = () => {
        const val = input.value.trim().toLowerCase();
        if (val && !state[stateKey].includes(val)) {
            state[stateKey].push(val);
            renderList(listId, stateKey);
            input.value = '';
            saveState();
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

    container.querySelectorAll('.tag-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            const idx = parseInt(btn.getAttribute('data-index'));
            state[key].splice(idx, 1);
            renderList(listId, key);
            saveState();
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
            ACTIVE_GAME_INDEX: -1,
            SECURITY_ENABLED: false,
            PASSWORD: ''
        }, (items) => {
            state = items;

            const methodInput = document.querySelector(`input[name="blockMethod"][value="${state.BLOCK_METHOD}"]`);
            if (methodInput) {
                methodInput.checked = true;
                updateHubVisibility(state.BLOCK_METHOD);
            }

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
