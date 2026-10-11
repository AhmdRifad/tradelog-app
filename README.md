# TradeLog --- Trading Journal

A lightweight, installable trading journal for recording trades,
reviewing results, and following a consistent checklist.

**Live app:** [https://ahmdrifad.github.io/tradelog-app/\](https://ahmdrifad.github.io/tradelog-app/)
**Repository:** https://github.com/AhmdRifad/tradelog-app

## Features

-   **Overview dashboard** for reviewing recorded net P&L, win rate,
    closed-trade count, average R, and cumulative P&L.
-   **Trade journal** for recording and reviewing trade details,
    including market, direction, timeframe, setup, entry/exit prices,
    position size, contract multiplier, fees, and notes where supported
    by the current build.
-   **P&L calculation** using entry price, exit price, direction,
    position size, contract multiplier, and recorded fees when the
    required data is available.
-   **Confluence checklist** to help review personal setup conditions
    and trading rules.
-   **Risk-planning calculations** where supported by the app's current
    fields.
-   **Export and data-management options** for backing up journal
    records where available.
-   **Progressive Web App (PWA)** support for home-screen installation
    and browser-managed caching/offline use.

> TradeLog is a recordkeeping and learning tool. It does not place
> orders, connect to a broker or exchange, provide live prices, or
> guarantee results.

## Automatic P&L

The app's simplified gross P&L calculation is:

-   **Long:**
    `(Exit price - Entry price) × Position size × Contract multiplier`
-   **Short:**
    `(Entry price - Exit price) × Position size × Contract multiplier`
-   **Net P&L:** `Gross P&L - recorded fees`

**Important:** Futures and CFDs can use different contract sizes, tick
values, quote currencies, and fee structures. Confirm the correct
position-size unit and contract multiplier for the instrument. The
simplified formula may not include funding, swaps, slippage, currency
conversion, or costs that have not been entered.

## Main navigation

  Section         Purpose
  --------------- --------------------------------------------------------
  Overview        Summary metrics and cumulative P&L view
  Trade journal   Create, find, review, and manage trade records
  Confluence      Review setup conditions and personal rules
  Settings        Available app preferences and data-management controls

The precise options may vary with the currently deployed version.

## Data and privacy

-   The app is designed for local-first use; records may be stored in
    browser-local storage on the device/browser profile.
-   Data is not automatically synced between devices or browser
    profiles.
-   Clearing site data or resetting browser storage may delete locally
    stored trades, checklist progress, or preferences.
-   Export backups regularly before clearing browser data, changing
    devices, or troubleshooting the installed app.
-   Treat exported files as private because they may contain trade
    history and notes.
-   Do not store passwords, API keys, or other secrets in journal notes.

## Running and publishing

This project is hosted with GitHub Pages.

1.  Open the repository: https://github.com/AhmdRifad/tradelog-app
2.  Edit the relevant project files and commit your changes.
3.  Confirm that GitHub Pages has finished publishing.
4.  Open the live site and verify the updated fields and calculations.
5.  If the normal browser or home-screen app still shows an old version,
    close and reopen it and reload the website. A stale browser cache or
    service worker may be responsible.
6.  Clearing site data can erase local records. Back up first if the
    records matter.

## Project files

  -----------------------------------------------------------------------
  File                                Purpose
  ----------------------------------- -----------------------------------
  `index.html`                        Page structure, navigation, forms,
                                      dialogs, and labels

  `style.css`                         Theme, colours, typography, layout,
                                      and responsive styling

  `app.js`                            App logic, calculations,
                                      validation, rendering, and data
                                      handling

  `manifest.json`                     PWA name, icons, launch URL,
                                      display mode, and theme metadata

  `sw.js`                             Service-worker caching and offline
                                      resource handling

  `README.md`                         Project overview and usage notes

  `icons/`                            App and home-screen icons
  -----------------------------------------------------------------------

Only include file names that actually exist in the repository; adjust
this list if your project structure differs.

## Theme

The app's documented theme colour is **navy `#101923`**, with a **teal
accent `#35D0BA`**.

## Troubleshooting

### Position size or contract multiplier is missing

Confirm that the updated `index.html` has been committed and published.
Reload the public site and check whether the browser is displaying
cached resources.

### Net P&L differs from gross P&L

Recorded fees are subtracted from gross P&L. Check both values and
confirm the instrument multiplier and quantity units.

### A trade is not visible

Clear the journal search and select the broadest available outcome
filter.

### The app looks older in normal Chrome than in Incognito

The normal browser or installed app may be using stale cached resources.
Before clearing site data, export any records you want to keep.

### Records do not appear on another device

Local browser storage does not automatically sync across devices. Use an
export/import feature if available in your build.

## Disclaimer

TradeLog is a personal recordkeeping and process-review tool, not
financial advice. Calculations are simplified and depend on correct
input values and instrument specifications. Do not treat journal
statistics, checklist scores, or planner outputs as a promise of future
performance.
