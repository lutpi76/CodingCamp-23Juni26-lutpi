// ── Data Layer ──────────────────────────────────────────────────────────────

// Module-level array: single source of truth for all transactions in memory
let transactions = [];

// ── Storage Helpers (Task 2.1) ───────────────────────────────────────────────

/**
 * Reads and parses transactions from localStorage.
 * Returns [] when the key is missing or the stored value cannot be parsed.
 * @returns {Array} Parsed transactions array or empty array on failure.
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem('ebv_transactions');
    if (raw === null) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Serialises the given list and writes it to localStorage under 'ebv_transactions'.
 * Calls showStorageWarning() if the write fails.
 * @param {Array} list - The transactions array to persist.
 */
function saveTransactions(list) {
  try {
    localStorage.setItem('ebv_transactions', JSON.stringify(list));
  } catch (e) {
    showStorageWarning();
  }
}

/**
 * Renders a visible warning banner informing the user that data cannot be saved.
 * Creates the banner element if it does not already exist.
 */
function showStorageWarning() {
  const BANNER_ID = 'storage-warning';
  if (document.getElementById(BANNER_ID)) return; // already shown

  const banner = document.createElement('p');
  banner.id = BANNER_ID;
  banner.textContent = 'Warning: Data cannot be saved. localStorage may be unavailable or full.';
  banner.style.cssText =
    'color:#fff;background:#c0392b;padding:8px 12px;margin:0;text-align:center;font-weight:bold;';
  document.body.insertAdjacentElement('afterbegin', banner);
}

// ── Transaction CRUD (Task 2.2) ──────────────────────────────────────────────

/**
 * Creates a new transaction object, adds it to the in-memory array,
 * persists it to localStorage, and returns the new transaction.
 *
 * @param {string} name     - The item name for the transaction.
 * @param {number|string} amount   - The transaction amount (will be parsed as float).
 * @param {string} category - The spending category (Food | Transport | Fun).
 * @returns {{ id: number, name: string, amount: number, category: string }}
 */
function addTransaction(name, amount, category) {
  const transaction = {
    id: Date.now(),
    name,
    amount: parseFloat(amount),
    category,
  };
  transactions.push(transaction);
  saveTransactions(transactions);
  return transaction;
}

/**
 * Removes the transaction with the given id from the in-memory array
 * and persists the updated list to localStorage.
 *
 * @param {number|string} id - The id of the transaction to delete.
 */
function deleteTransaction(id) {
  // Compare as strings to handle both numeric and stringified ids safely
  transactions = transactions.filter(
    (t) => String(t.id) !== String(id)
  );
  saveTransactions(transactions);
}

// ── Input Form (Task 4.1) ────────────────────────────────────────────────────

/**
 * Attaches a submit event listener to #transaction-form.
 *
 * Validation rules (Requirements 1.3, 1.4):
 *   - Item name must be non-empty after trimming whitespace
 *   - Amount must parse to a finite positive number
 *   - Category must be non-empty
 *
 * On invalid input: shows a descriptive error in #form-error and returns early.
 * On valid input: clears #form-error, calls addTransaction(), resets the form,
 * then refreshes the balance, list, and chart (Requirements 1.2, 1.5).
 */
function initForm() {
  const form = document.getElementById('transaction-form');
  if (!form) return;

  const formError = document.getElementById('form-error');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameInput     = document.getElementById('item-name');
    const amountInput   = document.getElementById('item-amount');
    const categoryInput = document.getElementById('item-category');

    const name     = nameInput.value.trim();
    const amount   = amountInput.value.trim();
    const category = categoryInput.value.trim();

    // ── Validation ───────────────────────────────────────────────────────────

    if (name === '') {
      formError.textContent = 'Item name is required.';
      return;
    }

    if (amount === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      formError.textContent = 'Please enter a valid positive amount.';
      return;
    }

    if (category === '') {
      formError.textContent = 'Please select a category.';
      return;
    }

    // ── Valid submission ──────────────────────────────────────────────────────

    formError.textContent = '';

    const amountValue = parseFloat(amount);
    addTransaction(name, amountValue, category);

    form.reset();

    renderBalance();
    renderList();
    renderChart();
  });
}

// ── Transaction List Rendering (Task 6.1) ────────────────────────────────────

/**
 * Renders the transaction list in the UI.
 *
 * - Clears #transaction-list innerHTML on every call.
 * - If the transactions array is empty: shows #empty-state and hides the list.
 * - If there are transactions: hides #empty-state, shows the list, and creates
 *   one <li> per transaction containing the name, formatted amount, category,
 *   and a delete button with a data-id attribute.
 *
 * Requirements: 2.3, 3.1, 3.2
 */
function renderList() {
  const list = document.getElementById('transaction-list');
  const emptyState = document.getElementById('empty-state');

  // ── Sort logic (Task 11.2) ────────────────────────────────────────────────
  const sortSelect = document.getElementById('sort-select');
  const sortValue = sortSelect ? sortSelect.value : 'default';
  let displayList = transactions.slice(); // sorted copy, never mutate original
  if (sortValue === 'amount-asc') {
    displayList.sort(function (a, b) { return a.amount - b.amount; });
  } else if (sortValue === 'amount-desc') {
    displayList.sort(function (a, b) { return b.amount - a.amount; });
  } else if (sortValue === 'category-az') {
    displayList.sort(function (a, b) { return a.category.localeCompare(b.category); });
  }

  // Clear existing list items
  list.innerHTML = '';

  if (transactions.length === 0) {
    // Show empty-state message, hide the list
    emptyState.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  // Hide empty-state, show the list
  emptyState.classList.add('hidden');
  list.classList.remove('hidden');

  // Render one <li> per transaction
  displayList.forEach(function (transaction) {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('transaction-name');
    nameSpan.textContent = transaction.name;

    const amountSpan = document.createElement('span');
    amountSpan.classList.add('transaction-amount');
    amountSpan.textContent = transaction.amount.toFixed(2);

    const categorySpan = document.createElement('span');
    categorySpan.classList.add('transaction-category');
    // Add per-category pill colour class
    const catClass = 'cat-' + transaction.category.toLowerCase();
    categorySpan.classList.add(catClass);
    categorySpan.textContent = transaction.category;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.id = transaction.id;

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

// ── Total Balance Rendering (Task 5) ─────────────────────────────────────────

/**
 * Sums the `amount` of every transaction in the in-memory array and writes the
 * result to #total-balance formatted to exactly two decimal places.
 * Displays "0.00" when the transactions array is empty.
 *
 * Requirements: 4.1, 4.2, 4.3
 */
function renderBalance() {
  const total = transactions.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  const balanceEl = document.getElementById('total-balance');
  if (balanceEl) {
    balanceEl.textContent = total.toFixed(2);

    // ── Over-limit highlight (Task 12.2) ─────────────────────────────────────
    const limitInput = document.getElementById('spending-limit');
    const limitValue = limitInput ? parseFloat(limitInput.value) : NaN;
    if (!isNaN(limitValue) && limitValue > 0 && total > limitValue) {
      balanceEl.classList.add('over-limit');
      balanceEl.title = '⚠️ Spending limit exceeded!';
    } else {
      balanceEl.classList.remove('over-limit');
      balanceEl.title = '';
    }
  }
}

// ── Delete Listener via Event Delegation (Task 6.2) ──────────────────────────

/**
 * Attaches a single delegated click listener to #transaction-list.
 * When a clicked element carries a `data-id` attribute (i.e. a delete button),
 * the listener removes the matching transaction and re-renders the full UI.
 *
 * Requirements: 2.1, 2.2
 */
function initDeleteListener() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  list.addEventListener('click', function (event) {
    const id = event.target.dataset.id;
    if (id === undefined) return; // click was not on a delete button

    deleteTransaction(id);
    renderList();
    renderBalance();
    renderChart();
  });
}

// ── Pie Chart Rendering (Task 7.1) ───────────────────────────────────────────

// Tracks the active Chart.js instance so it can be destroyed before rebuilding.
let chartInstance = null;

/**
 * Builds (or rebuilds) a Chart.js pie chart from the current transactions.
 *
 * - Computes per-category totals from the in-memory transactions array.
 * - When no transactions exist: destroys any existing chart, shows
 *   #chart-placeholder, and returns early.
 * - Otherwise: hides #chart-placeholder, destroys any existing chart, then
 *   creates a fresh pie chart on #spending-chart.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
function renderChart() {
  // Compute per-category totals
  const totals = {};
  transactions.forEach(function (t) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const placeholder = document.getElementById('chart-placeholder');

  // No transactions — show placeholder and tear down any existing chart
  if (Object.keys(totals).length === 0) {
    if (chartInstance !== null) {
      chartInstance.destroy();
      chartInstance = null;
    }
    if (placeholder) placeholder.style.display = '';
    return;
  }

  // Transactions exist — hide placeholder
  if (placeholder) placeholder.style.display = 'none';

  // Destroy stale chart before creating a new one (avoids canvas-reuse errors)
  if (chartInstance !== null) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = Object.keys(totals);
  const data   = labels.map(function (label) { return totals[label]; });

  const baseColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
  const backgroundColor = labels.map(function (_, i) {
    return baseColors[i % baseColors.length];
  });

  const isDark = document.body.classList.contains('dark-mode');
  const legendColor = isDark ? '#e0e0e0' : '#222';

  chartInstance = new Chart(document.getElementById('spending-chart'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColor,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: legendColor,
          },
        },
      },
    },
  });
}

// ── Page Load Initialisation (Task 8) ────────────────────────────────────────

/**
 * On DOMContentLoaded: restore all transactions from localStorage and
 * render the full UI (balance, list, chart), then attach form and delete
 * event listeners.
 *
 * Requirements: 3.3, 6.2, 1.5, 2.2
 */
document.addEventListener('DOMContentLoaded', function () {
  initTheme();          // Apply saved theme first to avoid flash-of-wrong-theme
  transactions = loadTransactions();
  renderBalance();
  renderList();
  renderChart();
  initForm();
  initDeleteListener();
  initSortListener();
  initSpendingLimitListener();
  initThemeToggle();
});

// ── Sort Listener (Task 11.2) ─────────────────────────────────────────────────

/**
 * Attaches a change listener on #sort-select so that every time the user
 * picks a different sort order the transaction list re-renders immediately.
 * The in-memory array and localStorage are never mutated.
 *
 * Requirements: 7.1, 7.2
 */
function initSortListener() {
  const sortSelect = document.getElementById('sort-select');
  if (!sortSelect) return;
  sortSelect.addEventListener('change', function () {
    renderList();
  });
}

// ── Spending Limit Listener (Task 12.2) ──────────────────────────────────────

/**
 * Attaches an input listener on #spending-limit so that the over-limit
 * highlight updates in real time as the user types a limit value.
 *
 * Requirements: 8.1, 8.2
 */
function initSpendingLimitListener() {
  const limitInput = document.getElementById('spending-limit');
  if (!limitInput) return;
  limitInput.addEventListener('input', function () {
    renderBalance();
  });
}

// ── Theme Initialisation (Task 13.2) ─────────────────────────────────────────

/**
 * Reads the persisted theme preference from localStorage on page load and
 * applies the dark-mode class to <body> if the saved value is "dark".
 *
 * Requirements: 9.1, 9.2
 */
function initTheme() {
  const savedTheme = localStorage.getItem('ebv_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) toggleBtn.textContent = '☀️ Light Mode';
  }
}

/**
 * Attaches a click listener on #theme-toggle.
 * On each click: toggles the dark-mode class on <body> and persists
 * the current theme ("dark" or "light") to localStorage under 'ebv_theme'.
 *
 * Requirements: 9.1, 9.2
 */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  toggleBtn.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('ebv_theme', theme);
    toggleBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    renderChart(); // rebuild chart so legend colour matches the new theme
  });
}
