# BlockX (Blocker)

> **High-Performance Network Configuration & Site Management for Chrome**
>
> BlockX enforces content filtering, search engine safety policies, and domain restrictions with near-zero resource overhead. It puts you in total control of your browsing environment.

---

## Key Features

| Feature | Description | Performance / Tech |
| :--- | :--- | :--- |
| **Protocol-Level Blocking** | Instantly restricts customized domains and keyword patterns before pages even load. | Zero-latency interception |
| **Binary Search Lookup** | High-performance domain lookup optimized to **$O(\log N)$** operations. | Precomputed binary indexing files |
| **Content Observer & Barrier** | Injects an instant CSS visibility barrier to prevent screen flashing. | Optimized regex filter |
| **SafeSearch Enforcement** | Automatically enforces SafeSearch for Google, Bing, DuckDuckGo, Yahoo, and YouTube. | Strict query parameter injection |
| **Interactive Block Hub** | Multiple customizable experiences: Interactive Hub (Tower Blocks & 3D Rubik's Cube), Connection Timeout, or Discreet Null. | Offline-enabled canvas games |
| **Dashboard Security** | Protects settings panels using a secure local passcode gateway. | Secure local storage hashing |

---

## Multiple Blocking Modes

Customize your restriction experience using **three distinct modes**:

*   **Interactive Hub:** Redirects users to an offline-capable interactive space featuring playable games (Tower Blocks & 3D Rubik's Cube).
*   **Connection Timeout:** Simulates standard network timeouts by routing requests to an inactive server IP.
*   **Discreet Null:** Quietly and cleanly terminates network streams via abort actions.

---

## Quick Installation Guide

Setting up **BlockX** in Google Chrome is quick and simple, even if you are not a developer! Follow the step-by-step instructions below:

### For Non-Coders (Easy Method)

1.  **Download the Extension:**
    *   Click on the green **Code** button at the top right of this repository page.
    *   Select **Download ZIP** from the dropdown menu.
    *   Extract the downloaded ZIP file to a folder on your computer (e.g., your Desktop or Documents).
2.  **Open Chrome Extensions:**
    *   Open Google Chrome.
    *   Type `chrome://extensions` in your address bar and press **Enter**.
3.  **Enable Developer Mode:**
    *   Look at the top-right corner of the Extensions page.
    *   Toggle the **Developer mode** switch to **ON** (usually found in the top-right corner).
4.  **Load the Extension:**
    *   Click the **Load unpacked** button in the top-left corner.
    *   Select the extracted folder containing the extension files (make sure you select the folder that directly contains the `manifest.json` file).
5.  **Start Using:**
    *   The extension will load immediately! You can access its settings dashboard by pinning the **BlockX (BX)** icon in your Chrome toolbar.

---

### For Developers / Coders

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Talhakhalidawan/BlockX.git
    cd BlockX
    ```
2.  **Load into Chrome:**
    *   Navigate to `chrome://extensions`.
    *   Enable **Developer Mode**.
    *   Click **Load unpacked** and select the cloned directory.

---

## Credits & Attributions

This project integrates several high-quality open-source components and dictionaries. 

For full details, licenses, and references for integrated canvas elements (such as Tower Blocks and Rubik's Cube games) and domain list dictionaries, please see the [CREDITS.md](CREDITS.md) file.

---

## License

Distributed under the **Elite Shield Blocker License**. See the [LICENSE](LICENSE) file for more information.
