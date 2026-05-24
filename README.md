# Blocker

Blocker is a high-performance network configuration and site management tool for Google Chrome. It enforces content filtering, search engine safety policies, and domain restrictions with zero resource lag.

---

## Technical Features

* **Protocol-Level Blocking**
  Restricts customized domains and keyword patterns instantly before network page resources begin loading.

* **Ultra-Fast Binary Searches**
  Employs a binary search lookup algorithm optimized to run in O(log N) time using precomputed binary index offsets for high-volume list lookups.

* **Visual Shielding Barrier**
  Injects an instant, automatic CSS visibility barrier on startup to prevent screen flashes, scanning page titles and URL query components using a optimized O(N) regex alternation filter.

* **SafeSearch Policy Enforcement**
  Automatically rewrites and appends strict SafeSearch query parameters for Google, Bing, DuckDuckGo, Yahoo, and enforces strict YouTube content restrictions.

* **Flexible Enforcement Modes**
  Offers three distinct network blocking outcomes configurable from the dashboard:
  * **Interactive Hub:** Redirects blocked requests to a clean extension landing zone with integrated offline elements (Tower Blocks stacker and a 3D Rubik's Cube).
  * **Connection Error:** Simulates standard protocol network timeouts by redirecting requests to an inactive local server IP.
  * **Discreet Null:** Aborts request streams cleanly using data URI prepending formats.

* **Configuration Protection**
  Features a tamper-resistant security gateway that locks the settings panel behind a personal password, utilizing background mutation checks to prevent manual inspector overrides.

---

## Easy Installation Guide

This guide is written to help you install the extension in under two minutes, even if you have never installed a Chrome extension before.

### Step 1: Download the Extension Folder
1. Download this repository as a ZIP archive to your computer.
2. Locate the downloaded file and extract (unzip) it. You will get a folder named `Blocker`.

### Step 2: Open Extensions in Google Chrome
1. Launch your Google Chrome browser.
2. In the URL address bar at the very top of the window, type in the following address and press **Enter**:
   ```
   chrome://extensions
   ```

### Step 3: Turn on Developer Mode
1. Look at the top-right corner of the Extensions page that just opened.
2. Find the switch labeled **Developer mode**.
3. Click the switch to turn it **On** (it will slide to the right and change color).

### Step 4: Load the Blocker Folder
1. Look at the top-left corner of the page and click the button labeled **Load unpacked**.
2. A file selection window will open. Navigate to where you extracted the folder in Step 1.
3. Select the root folder named `Blocker` (this is the folder that contains the `manifest.json` file inside it).
4. Click **Open** or **Select Folder**.

The extension is now active! The settings page will launch automatically, and you can access the controller popup by clicking the puzzle piece or extension icon in your Chrome toolbar.

---

## Third-Party Credits

This project integrates public open-source games and data indexes. For complete attributions and original source links, please view the [Credits and Attributions Document](CREDITS.md).
