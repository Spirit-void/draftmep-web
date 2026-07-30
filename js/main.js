/* MAIN.JS — common utilities (navigation, history, etc.) */

// ========== MOBILE NAV TOGGLE ==========
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }
});

// ========== HISTORY SYSTEM (localStorage) ==========
// Used by calculator page

const HISTORY_KEY = 'mep_hazima_history';

function saveHistory(calcName, inputSummary, resultSummary) {
  const history = getHistory();
  const entry = {
    id: Date.now(),
    calc: calcName,
    input: inputSummary,
    result: resultSummary,
    time: new Date().toLocaleString('en-US')
  };
  history.unshift(entry); // newest first
  // Limit to max 50 items
  if (history.length > 50) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('historyList');
  const sidebar = document.getElementById('historySidebarList');
  if (!container) return;

  const history = getHistory();

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">No history yet.<br>Perform a calculation and the result will save here automatically.</div>';
    if (sidebar) sidebar.innerHTML = '<div class="history-empty">No history yet.</div>';
    return;
  }

  const html = history.map(item => `
    <div class="history-item">
      <strong>${item.calc}</strong>
      <div style="margin: 0.25rem 0; color: var(--text-muted);">${item.input}</div>
      <div style="color: var(--primary-light);">${item.result}</div>
      <div class="time">${item.time}</div>
    </div>
  `).join('');

  container.innerHTML = html;
  if (sidebar) sidebar.innerHTML = html;
}

// Export supaya bisa dipanggil dari calculators.js
window.MEPHistory = {
  save: saveHistory,
  clear: clearHistory,
  render: renderHistory,
  get: getHistory
};

/* THEME TOGGLE (dark / light) */
const THEME_KEY = 'mep_hazima_theme';
function applyTheme(theme) {
  if (theme === 'light') document.body.classList.add('light-theme');
  else document.body.classList.remove('light-theme');
  localStorage.setItem(THEME_KEY, theme);
  updateThemeIcon();
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  applyTheme(isLight ? 'dark' : 'light');
}

function updateThemeIcon() {
  const iconSun = document.getElementById('iconSun');
  const iconMoon = document.getElementById('iconMoon');
  const text = document.getElementById('themeText');
  if (!text) return;
  const isLight = document.body.classList.contains('light-theme');
  if (iconSun && iconMoon) {
    iconSun.classList.toggle('hidden', !isLight);
    iconMoon.classList.toggle('hidden', isLight);
  }
  text.textContent = isLight ? 'Light' : 'Dark';
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.addEventListener('click', toggleTheme);
  updateThemeIcon();
});