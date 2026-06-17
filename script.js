const checklistEl = document.getElementById('checklist');
let rows = [];

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

async function loadRows() {
  try {
    const response = await fetch('/api/rows');
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn('Failed to load rows from server', error);
    return [];
  }
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

async function addNewRow() {
  try {
    const response = await fetch('/api/rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'New task', durationHours: 6 }),
    });
    if (response.ok) {
      render();
    }
  } catch (error) {
    console.warn('Failed to add new row', error);
  }
}

async function updateRowLabel(rowId, newLabel) {
  try {
    await fetch(`/api/rows/${rowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel }),
    });
  } catch (error) {
    console.warn('Failed to update row label', error);
  }
}

async function deleteRow(rowId) {
  try {
    await fetch(`/api/rows/${rowId}`, { method: 'DELETE' });
    render();
  } catch (error) {
    console.warn('Failed to delete row', error);
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
}

render();
setInterval(render, 30_000);
