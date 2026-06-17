const checklistEl = document.getElementById('checklist');
let rows = [];

const ROWS_STORAGE_KEY = 'medocChecklistRows';
const STATE_STORAGE_KEY = 'medocChecklistState';
const DEFAULT_ROWS = [
  { id: 'task-1', label: 'Morning habit', durationHours: 6 },
  { id: 'task-2', label: 'Afternoon check', durationHours: 8 },
  { id: 'task-3', label: 'Evening reminder', durationHours: 2 },
];

// Notification preference key
const NOTIF_PREF_KEY = 'medocChecklistNotificationsEnabled';
const INSTALLED_KEY = 'medocChecklistInstalled';

function loadNotifPref() {
  try {
    return localStorage.getItem(NOTIF_PREF_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function saveNotifPref(enabled) {
  try {
    localStorage.setItem(NOTIF_PREF_KEY, enabled ? 'true' : 'false');
  } catch (e) {}
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (e) {
    return false;
  }
}

function showNotification(title, body) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    // Prefer service worker registration for notifications (better background behavior)
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
      try {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, { body });
            if (navigator.vibrate) navigator.vibrate(200);
            return;
          }
          // fallback
          new Notification(title, { body });
          if (navigator.vibrate) navigator.vibrate(200);
        }).catch(() => {
          new Notification(title, { body });
          if (navigator.vibrate) navigator.vibrate(200);
        });
        return;
      } catch (e) {
        // fall through to page notification
      }
    }
    new Notification(title, { body });
    if (navigator.vibrate) navigator.vibrate(200);
  } catch (e) {
    console.warn('Notification failed', e);
  }
}

function loadInstalledFlag() {
  try { return localStorage.getItem(INSTALLED_KEY) === 'true'; } catch (e) { return false; }
}
function saveInstalledFlag(v) { try { localStorage.setItem(INSTALLED_KEY, v ? 'true' : 'false'); } catch (e) {} }

// PWA install prompt handling
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn && !loadInstalledFlag()) {
    btn.style.display = 'inline-block';
  }
});

window.addEventListener('appinstalled', () => {
  saveInstalledFlag(true);
  const btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    if (loadInstalledFlag()) installBtn.style.display = 'none';
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          saveInstalledFlag(true);
          installBtn.style.display = 'none';
        }
      } catch (e) {
        console.warn('Install prompt failed', e);
      }
      deferredInstallPrompt = null;
    });
  }
});

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getExpiryDate(timestamp, durationHours) {
  if (!timestamp) return null;
  const saved = new Date(timestamp);
  saved.setHours(saved.getHours() + Number(durationHours));
  return saved;
}

// Local storage functions
function loadRowsFromStorage() {
  try {
    const raw = localStorage.getItem(ROWS_STORAGE_KEY);
    if (!raw) return DEFAULT_ROWS;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to load rows from localStorage', error);
    return DEFAULT_ROWS;
  }
}

function saveRowsToStorage(rows) {
  localStorage.setItem(ROWS_STORAGE_KEY, JSON.stringify(rows));
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.warn('Failed to load state from localStorage', error);
    return {};
  }
}

function saveStateToStorage(state) {
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
}

// Primary load functions using localStorage
async function loadRows() {
  return loadRowsFromStorage();
}

async function loadState() {
  return loadStateFromStorage();
}

async function addNewRow() {
  const rows = loadRowsFromStorage();
  const newRow = {
    id: `task-${Date.now()}`,
    label: 'New task',
    durationHours: 6,
  };
  rows.push(newRow);
  saveRowsToStorage(rows);
  render();
}

async function updateRowLabel(rowId, newLabel) {
  const rows = loadRowsFromStorage();
  const row = rows.find((r) => r.id === rowId);
  if (row) {
    row.label = newLabel;
    saveRowsToStorage(rows);
  }
}

async function updateRowDuration(rowId, durationHours) {
  const rows = loadRowsFromStorage();
  const row = rows.find((r) => r.id === rowId);
  if (row) {
    row.durationHours = durationHours;
    saveRowsToStorage(rows);
  }
}

async function deleteRow(rowId) {
  const rows = loadRowsFromStorage();
  const index = rows.findIndex((r) => r.id === rowId);
  if (index !== -1) {
    rows.splice(index, 1);
    saveRowsToStorage(rows);
  }
}

async function updateRowState(rowId, savedAt, durationHours) {
  const state = loadStateFromStorage();
  if (savedAt) {
    // reset notified flag when a row is (re)checked
    state[rowId] = { savedAt, durationHours, notified: false };
  } else {
    delete state[rowId];
  }
  saveStateToStorage(state);
}

// Check for expired timers and notify if needed
function checkNotifications(state, rows) {
  const enabled = loadNotifPref();
  if (!enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  rows.forEach((row) => {
    const s = state[row.id];
    if (!s || !s.savedAt) return;
    if (s.notified) return;
    const expiry = getExpiryDate(new Date(s.savedAt), s.durationHours ?? row.durationHours);
    if (expiry && expiry <= now) {
      showNotification('Timer expired', `${row.label} timer ended`);
      s.notified = true;
    }
  });
  saveStateToStorage(state);
}

function buildRow(row, state) {
  const rowEl = document.createElement('div');
  rowEl.className = 'row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `${row.id}-checkbox`;
  checkbox.dataset.rowId = row.id;

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = row.label;
  label.contentEditable = true;
  label.spellcheck = false;
  label.addEventListener('blur', async () => {
    const newLabel = label.textContent.trim() || row.label;
    if (newLabel !== row.label) {
      label.textContent = newLabel;
      await updateRowLabel(row.id, newLabel);
    }
  });
  label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      label.blur();
    }
  });

  const durationControl = document.createElement('div');
  durationControl.className = 'duration-control';
  const durationInput = document.createElement('input');
  durationInput.type = 'number';
  durationInput.min = '1';
  durationInput.step = '1';
  durationInput.value = row.durationHours;
  durationInput.dataset.rowId = row.id;
  durationInput.title = 'Expiration duration in hours';

  const durationHint = document.createElement('small');
  durationHint.textContent = 'expires after hours';
  durationControl.append(durationInput, durationHint);

  const timestampEl = document.createElement('div');
  timestampEl.className = 'timestamp empty';
  timestampEl.dataset.rowId = row.id;

  const savedRow = state[row.id] || {};
  let currentSavedAt = savedRow.savedAt || null;
  const savedAt = currentSavedAt ? new Date(currentSavedAt) : null;
  const durationHours = savedRow.durationHours ?? row.durationHours;

  const expiry = getExpiryDate(savedAt, durationHours);
  const now = new Date();
  const active = expiry && expiry > now;

  if (active) {
    checkbox.checked = true;
    timestampEl.textContent = formatTimestamp(savedAt);
    timestampEl.classList.remove('empty');
  } else if (savedAt) {
    timestampEl.textContent = formatTimestamp(savedAt);
    timestampEl.classList.remove('empty');
  } else {
    timestampEl.textContent = 'No timestamp';
  }

  checkbox.addEventListener('change', async () => {
    const durationValue = Number(durationInput.value) || row.durationHours;
    if (checkbox.checked) {
      const nowDate = new Date();
      currentSavedAt = nowDate.toISOString();
      timestampEl.textContent = formatTimestamp(nowDate);
      timestampEl.classList.remove('empty');
      await updateRowState(row.id, currentSavedAt, durationValue);
    } else {
      currentSavedAt = null;
      timestampEl.textContent = 'No timestamp';
      timestampEl.classList.add('empty');
      await updateRowState(row.id, null);
    }
  });

  durationInput.addEventListener('change', async () => {
    const durationValue = Number(durationInput.value) || row.durationHours;
    if (currentSavedAt) {
      const expiryDate = getExpiryDate(new Date(currentSavedAt), durationValue);
      if (!expiryDate || expiryDate <= new Date()) {
        checkbox.checked = false;
        currentSavedAt = null;
        timestampEl.textContent = 'No timestamp';
        timestampEl.classList.add('empty');
        await updateRowState(row.id, null);
      } else {
        await updateRowState(row.id, currentSavedAt, durationValue);
      }
    } else {
      await updateRowDuration(row.id, durationValue);
    }
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Delete row';
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this row?')) {
      await deleteRow(row.id);
    }
  });

  const leftGroup = document.createElement('div');
  leftGroup.className = 'checkbox-wrap';
  leftGroup.append(checkbox, label, deleteBtn);

  rowEl.append(leftGroup, durationControl, timestampEl);
  return rowEl;
}

async function render() {
  rows = await loadRows();
  const state = await loadState();
  checklistEl.innerHTML = '';
  rows.forEach((row) => {
    checklistEl.append(buildRow(row, state));
  });

  const addRowBtn = document.createElement('button');
  addRowBtn.className = 'add-row-btn';
  addRowBtn.textContent = '+ Add row';
  addRowBtn.addEventListener('click', addNewRow);
  checklistEl.append(addRowBtn);

  // initialize notification toggle UI and behavior
  const notifCheckbox = document.getElementById('notif-toggle-checkbox');
  if (notifCheckbox) {
    notifCheckbox.checked = loadNotifPref();
    notifCheckbox.onchange = async () => {
      const enabled = notifCheckbox.checked;
      saveNotifPref(enabled);
      if (enabled) {
        const ok = await requestNotificationPermission();
        if (!ok) {
          // user denied; reflect in UI
          notifCheckbox.checked = false;
          saveNotifPref(false);
        }
      }
    };
  }

  // Check notifications after render
  try {
    checkNotifications(state, rows);
  } catch (e) {}
}

render();
setInterval(render, 30_000);

// Register service worker for PWA (offline caching & notification support)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then((reg) => {
    // registration successful
  }).catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
