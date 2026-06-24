# Design Document

## Overview

The Expense & Budget Visualizer is a fully client-side, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no backend and no network requests after the initial page load. All data is stored and read from the browser's `localStorage` API. The pie chart is rendered via Chart.js loaded from CDN.

The application provides:
- Add and delete expense transactions
- View a running total balance
- A pie chart of spending distribution by category
- Sort transactions by amount or category
- A spending limit highlight when total exceeds the set limit
- Dark/Light mode toggle with persistence
- A responsive layout that works from 320px upward

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Single JS file (`js/app.js`) | Requirement 11.3 mandates exactly one JavaScript file — no modules, no bundler |
| Chart.js via CDN | Requirement 11.1 allows Chart.js as the only external library |
| `localStorage` only | Requirement 6 — no backend, no IndexedDB, keeps architecture minimal |
| CSS-only responsive layout | Requirement 10.3 forbids JavaScript for layout switching |
| `Date.now()` as transaction ID | Simple, collision-free ID generation without external dependencies |

---

## Architecture

The application is a single flat module with no imports. All logic lives in `js/app.js` and is initialised on `DOMContentLoaded`.

```
┌─────────────────────────────────────┐
│             index.html              │
│  (entry point — links CSS and JS)   │
└────────────────┬────────────────────┘
                 │
    ┌────────────▼────────────┐
    │        js/app.js        │
    │                         │
    │  Data Layer             │
    │   loadTransactions()    │
    │   saveTransactions()    │
    │   addTransaction()      │
    │   deleteTransaction()   │
    │   showStorageWarning()  │
    │                         │
    │  Render Functions       │
    │   renderBalance()       │
    │   renderList()          │
    │   renderChart()         │
    │                         │
    │  Initialisers           │
    │   initForm()            │
    │   initDeleteListener()  │
    │   initSortListener()    │
    │   initSpendingLimit()   │
    │   initTheme()           │
    │   initThemeToggle()     │
    └─────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
Validate input (initForm / delete listener)
    │ valid
    ▼
Mutate in-memory `transactions` array
    │
    ▼
saveTransactions() → localStorage
    │
    ▼
renderBalance() + renderList() + renderChart()
```

---

## File Structure

```
project-root/
├── index.html          ← single HTML entry point
├── css/
│   └── style.css       ← all styles (mobile-first + desktop media query)
└── js/
    └── app.js          ← all JavaScript logic
```

No build tools, no npm, no test framework. The app opens directly as a local HTML file in a browser.

---

## Components

### HTML Sections (`index.html`)

| Element | ID / Role | Description |
|---|---|---|
| `<header>` | — | Total balance display, spending limit input, theme toggle button |
| `<span>` | `#total-balance` | Displays running sum of all transaction amounts |
| `<input>` | `#spending-limit` | Optional numeric spending limit |
| `<button>` | `#theme-toggle` | Toggles dark/light mode |
| `<section>` | `#form-section` | Add Transaction form |
| `<input>` | `#item-name` | Item name text field |
| `<input>` | `#item-amount` | Amount numeric field |
| `<select>` | `#item-category` | Category selector (Food, Transport, Fun) |
| `<p>` | `#form-error` | Inline validation error message |
| `<section>` | `#list-section` | Transaction list and sort controls |
| `<select>` | `#sort-select` | Sort order selector |
| `<p>` | `#empty-state` | Shown when transaction list is empty |
| `<ul>` | `#transaction-list` | Rendered list of transactions |
| `<section>` | `#chart-section` | Pie chart and placeholder |
| `<canvas>` | `#spending-chart` | Chart.js render target |
| `<p>` | `#chart-placeholder` | Shown when there are no transactions |

### JavaScript Functions (`js/app.js`)

#### Data Layer

| Function | Description |
|---|---|
| `loadTransactions()` | Reads `ebv_transactions` from `localStorage`, parses JSON, returns `[]` on missing key or parse error |
| `saveTransactions(list)` | Serialises array to JSON and writes to `ebv_transactions`; calls `showStorageWarning()` on failure |
| `showStorageWarning()` | Inserts a visible red banner at the top of `<body>` warning that data cannot be saved |
| `addTransaction(name, amount, category)` | Creates `{ id: Date.now(), name, amount: parseFloat(amount), category }`, pushes to `transactions`, calls `saveTransactions()` |
| `deleteTransaction(id)` | Filters `transactions` to remove matching id, calls `saveTransactions()` |

#### Render Functions

| Function | Description |
|---|---|
| `renderBalance()` | Sums all `transaction.amount` values, writes result to `#total-balance`; applies/removes `.over-limit` class based on spending limit |
| `renderList()` | Clears and rebuilds `#transaction-list`; handles empty-state visibility; applies sort order from `#sort-select` |
| `renderChart()` | Computes per-category totals; destroys previous Chart.js instance if any; creates new pie chart; handles no-data placeholder |

#### Initialisers

| Function | Description |
|---|---|
| `initForm()` | Attaches `submit` listener on `#transaction-form`; validates fields; calls `addTransaction()` + all three render functions on success |
| `initDeleteListener()` | Attaches delegated `click` listener on `#transaction-list`; calls `deleteTransaction()` + all three render functions on delete |
| `initSortListener()` | Attaches `change` listener on `#sort-select`; calls `renderList()` |
| `initSpendingLimitListener()` | Attaches `input` listener on `#spending-limit`; calls `renderBalance()` |
| `initTheme()` | Reads `ebv_theme` from `localStorage` on load; applies `dark-mode` class to `<body>` if value is `"dark"` |
| `initThemeToggle()` | Attaches `click` listener on `#theme-toggle`; toggles `dark-mode` class; persists preference; calls `renderChart()` to update legend colour |

---

## Data Model

All transactions are stored as a JSON array under a single `localStorage` key.

### localStorage Keys

| Key | Type | Description |
|---|---|---|
| `ebv_transactions` | `Transaction[]` | All transaction records |
| `ebv_theme` | `"dark" \| "light"` | User's persisted theme preference |

### Transaction

```js
{
  id: number,        // Date.now() at creation time — unique per session
  name: string,      // item name, non-empty after trim
  amount: number,    // positive float, parsed via parseFloat()
  category: string,  // one of: "Food" | "Transport" | "Fun"
}
```

### In-Memory State

```js
let transactions = []; // module-level single source of truth
let chartInstance = null; // active Chart.js instance, or null
```

---

## Validation Rules

All validation is performed in `initForm()` before any data mutation:

| Field | Rule | Error Message |
|---|---|---|
| Item Name | Non-empty after `trim()` | "Item name is required." |
| Amount | `parseFloat(value) > 0` and not `NaN` | "Please enter a valid positive amount." |
| Category | Non-empty after `trim()` | "Please select a category." |

On invalid input: error shown in `#form-error`, form not submitted, `transactions` array unchanged.  
On valid input: `#form-error` cleared, form reset, all three render functions called.

---

## CSS Layout

### Mobile-First Base (all widths)

- Single-column stacked layout: header → form → list → chart
- `box-sizing: border-box` globally
- `min-width: 320px` with no horizontal scrollbar
- All inputs, selects, and buttons have `min-height: 44px` for touch targets
- Transaction list scrollable via `max-height: 300px; overflow-y: auto`

### Desktop Layout (`@media (min-width: 768px)`)

- CSS Grid two-column layout: form + list on left, chart on right
- Header spans full width via `grid-area: header`
- No JavaScript involved in layout switching

### Theme Classes

| Class | Applied To | Effect |
|---|---|---|
| `.dark-mode` | `<body>` | Dark backgrounds, light text across all sections |
| `.over-limit` | `#total-balance` | Red text when total exceeds spending limit |
| `.hidden` | `#empty-state`, `#transaction-list` | `display: none !important` |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `localStorage` write fails | `showStorageWarning()` inserts persistent red banner; in-memory data unchanged |
| `localStorage` read fails / malformed JSON | `loadTransactions()` returns `[]`; app starts with empty state |
| Form submitted with invalid data | Inline error in `#form-error`; no data mutation |
| Chart.js canvas reuse | Previous `chartInstance.destroy()` called before creating new chart |

---

## Correctness Properties

### Property 1: Add Round-Trip
For any valid transaction (non-empty name, positive amount, valid category), calling `addTransaction()` and then reading the in-memory `transactions` array SHALL return a list containing a record with identical field values.

**Validates: Requirements 1.2, 6.1**

### Property 2: Invalid Input Rejection
For any form submission where at least one field is invalid (empty name, non-positive or non-numeric amount, empty category), the `transactions` array SHALL remain unchanged after the rejection.

**Validates: Requirements 1.3, 1.4**

### Property 3: Form Clears After Save
For any valid transaction that is successfully saved, all input fields of the form SHALL be reset to empty/default values.

**Validates: Requirement 1.5**

### Property 4: Delete Removes Record
For any transaction that exists in `transactions`, calling `deleteTransaction(id)` SHALL result in the array NOT containing a record with that id.

**Validates: Requirement 2.2**

### Property 5: Empty State on Last Delete
When the last transaction is deleted, `transactions.length` SHALL equal 0 and `#empty-state` SHALL be visible.

**Validates: Requirement 2.3**

### Property 6: Balance Equals Sum
For any set of transactions, `renderBalance()` SHALL display a value equal to the arithmetic sum of all `transaction.amount` values, formatted to two decimal places. When the array is empty, the displayed value SHALL be `"0.00"`.

**Validates: Requirements 4.2, 4.3**

### Property 7: Chart Segments Match Category Totals
For any set of transactions, the data passed to Chart.js SHALL contain exactly one segment per category that has at least one transaction, and each segment's value SHALL equal the sum of amounts for that category.

**Validates: Requirements 5.1, 5.4**

### Property 8: Sort Does Not Mutate Storage
For any sort order selection, the `transactions` in-memory array and `localStorage` value SHALL remain in insertion order after `renderList()` is called with a sort option active.

**Validates: Requirement 7.2**

### Property 9: Over-Limit Class Applied Correctly
When the total balance exceeds the spending limit (a positive number), `#total-balance` SHALL have the `.over-limit` class. When it does not exceed the limit, the class SHALL NOT be present.

**Validates: Requirement 8.2**

### Property 10: Theme Persistence
After toggling to dark mode and reloading the page, `localStorage.getItem('ebv_theme')` SHALL equal `"dark"` and `<body>` SHALL have the `dark-mode` class applied on load.

**Validates: Requirement 9.2**

### Property 11: localStorage Round-Trip
For any valid `Transaction` object, serialising it via `JSON.stringify` and deserialising via `JSON.parse` SHALL produce an object with all field values equal to the original.

**Validates: Requirement 6.1**
