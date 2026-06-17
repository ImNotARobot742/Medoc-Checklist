const DEFAULT_ROWS = [
  { id: 'task-1', label: 'Morning habit', durationHours: 6 },
  { id: 'task-2', label: 'Afternoon check', durationHours: 8 },
  { id: 'task-3', label: 'Evening reminder', durationHours: 2 },
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

function getExpiryDate(timestamp, durationHours) {
  if (!timestamp) return null;
  const saved = new Date(timestamp);
  saved.setHours(saved.getHours() + Number(durationHours));
  return saved;
}

async function loadState() {
  try {
    const response = await fetch('/api/state');
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.warn('Failed to load state from server', error);
    return {};
  }
}

async function updateRowState(rowId, savedAt, durationHours) {
  try {
    const body = { id: rowId };
    if (savedAt) {
      body.savedAt = savedAt;
      body.durationHours = durationHours;
    }
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.warn('Failed to update row state on server', error);
  }
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
    }
  });

  const leftGroup = document.createElement('div');
  leftGroup.className = 'checkbox-wrap';
  leftGroup.append(checkbox, label);

  rowEl.append(leftGroup, durationControl, timestampEl);
  return rowEl;
}

async function render() {
  const state = await loadState();
  checklistEl.innerHTML = '';
  DEFAULT_ROWS.forEach((row) => {
    checklistEl.append(buildRow(row, state));
  });
}

render();
setInterval(render, 30_000);
