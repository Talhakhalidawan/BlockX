# Blocker

Blocker is a high-performance network configuration and site management tool for Chrome. It enforces content filtering, search engine safety policies, and domain restriction with minimal resource overhead.

## Key Features

- Protocol-Level Blocking: Restricts customized domains and keyword patterns instantly before page loading.
- High-Performance Domain Lookup: Employs a binary search lookup algorithm optimized to O(log N) operations on precomputed binary indexing files.
- Content Observer and Barrier: Injects an instant CSS visibility barrier to prevent screen flashing, scanning page title and URL patterns using an optimized regex filter.
- SafeSearch Enforcement: Automatically injects SafeSearch query parameters for Google, Bing, DuckDuckGo, Yahoo, and strict restrictions on YouTube requests.
- Multiple Blocking Modes: Supports three blocking experiences:
  - Interactive Hub: Redirects users to a customizable dashboard with integrated offline interactive elements (Tower Blocks and 3D Rubik's Cube).
  - Connection Timeout: Simulates standard network timeouts by redirecting requests to an inactive server IP.
  - Discreet Null: Terminates network streams cleanly via data URI abort actions.
- Dashboard Access Security: Protects settings panels using a secure local passcode gateway.

## Installation

To load and install this extension in Google Chrome, follow these steps:

1. Clone or download this repository to a local directory.
2. Open Google Chrome and navigate to the extensions page by entering `chrome://extensions` in the address bar.
3. Enable developer mode by toggling the "Developer mode" switch in the top-right corner.
4. Click the "Load unpacked" button in the top-left corner.
5. Select the root folder of the downloaded extension (the folder containing the `manifest.json` file).

The extension will load immediately, and its controls will be accessible through the extensions toolbar.
