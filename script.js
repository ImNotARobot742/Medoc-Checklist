const STORAGE_KEY = 'mobileChecklistState';
const DEFAULT_ROWS = [
  { id: 'task-1', label: 'Row 1: Morning habit', durationHours: 6 },
  { id: 'task-2', label: 'Row 2: Afternoon check', durationHours: 8 },
  { id: 'task-3', label: 'Row 3: Evening reminder', durationHours: 2 },
];
const checklistEl = document.getElementById('checklist');

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse checklist state', error);
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getExpiryDate(timestamp, durationHours) {
  if (!timestamp) return null;
  const saved = new Date(timestamp);
  saved.setHours(saved.getHours() + Number(durationHours));
  return saved;
}

function buildRow(row, state) {
  const rowEl = document.createElement('div');
  rowEl.className = 'row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `${row.id}-checkbox`;
  checkbox.dataset.rowId = row.id;

  const label = document.createElement('label');
  label.htmlFor = checkbox.id;
  label.textContent = row.label;

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
  const savedAt = savedRow.savedAt ? new Date(savedRow.savedAt) : null;
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
    checkbox.checked = false;
    delete state[row.id];
  } else {
    timestampEl.textContent = 'No timestamp';
  }

  checkbox.addEventListener('change', () => {
    const durationValue = Number(durationInput.value) || row.durationHours;
    if (checkbox.checked) {
      const nowDate = new Date();
      state[row.id] = {
        savedAt: nowDate.toISOString(),
        durationHours: durationValue,
      };
      timestampEl.textContent = formatTimestamp(nowDate);
      timestampEl.classList.remove('empty');
    } else {
      delete state[row.id];
      timestampEl.textContent = 'No timestamp';
      timestampEl.classList.add('empty');
    }
    saveState(state);
  });

  durationInput.addEventListener('change', () => {
    const durationValue = Number(durationInput.value) || row.durationHours;
    const existing = state[row.id];
    if (existing && existing.savedAt) {
      state[row.id] = {
        savedAt: existing.savedAt,
        durationHours: durationValue,
      };
      const expiryDate = getExpiryDate(new Date(existing.savedAt), durationValue);
      if (!expiryDate || expiryDate <= new Date()) {
        checkbox.checked = false;
        delete state[row.id];
        timestampEl.textContent = 'No timestamp';
        timestampEl.classList.add('empty');
      }
      saveState(state);
    }
  });

  const leftGroup = document.createElement('div');
  leftGroup.style.display = 'flex';
  leftGroup.style.alignItems = 'center';
  leftGroup.style.gap = '10px';
  leftGroup.append(checkbox, label);

  rowEl.append(leftGroup, durationControl, timestampEl);
  return rowEl;
}

function render() {
  const state = loadState();
  checklistEl.innerHTML = '';
  DEFAULT_ROWS.forEach((row) => {
    checklistEl.append(buildRow(row, state));
  });
  saveState(state);
}

render();
setInterval(render, 30_000);
