# TradeLog — Trading Journal PWA

A local-first, installable web app built with plain HTML, CSS, and JavaScript.

## Features
- Dashboard: net P&L, win rate, closed trades, average R, cumulative P&L chart
- Trade journal: create, edit, search, filter, and delete records
- Confluence checklist with Yes / No / N/A answers and a process gate
- Position size, planned risk and planned risk-to-reward calculator
- Local persistence using `localStorage`
- JSON backup export/import
- PWA manifest and service worker for offline use

## Run locally
Service workers generally require HTTPS or localhost. Do not open `index.html` as a `file://` URL if you want install/offline features.

### Easiest on a computer with Python
1. Extract this folder.
2. Open a terminal in the `trade-journal-app` folder.
3. Run `python -m http.server 8000`.
4. Open `http://localhost:8000` in your browser.

### Use on Android
For installation and offline caching, host the folder on a static HTTPS host (for example, GitHub Pages or Netlify), open its HTTPS URL in Chrome, then use the browser menu → **Install app** or **Add to Home screen**. Open it once while online so the service worker can cache the app. The trade data remains local to that browser/device and does not sync automatically.

## Important notes
- This is a starter project, not financial advice.
- Gross result is entered manually. For closed trades, net P&L = gross result minus fees.
- The simple position-size formula assumes price movement per unit; contracts, leverage, lot size, quote currency, and instrument multipliers may change sizing in real markets.
- Browser local storage can be cleared. Export JSON backups regularly.
- Do not store passwords, exchange API keys, or other secrets in this app.
