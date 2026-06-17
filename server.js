const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const ROWS_FILE = path.join(__dirname, 'rows.json');
const PUBLIC_DIR = path.join(__dirname);

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const DEFAULT_ROWS = [
  { id: 'task-1', label: 'Morning habit', durationHours: 6 },
  { id: 'task-2', label: 'Afternoon check', durationHours: 8 },
  { id: 'task-3', label: 'Evening reminder', durationHours: 2 },
];

function loadState() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function loadRows() {
  try {
    const raw = fs.readFileSync(ROWS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    return DEFAULT_ROWS;
  }
}

function saveRows(rows) {
  fs.writeFileSync(ROWS_FILE, JSON.stringify(rows, null, 2));
}

app.get('/api/rows', (req, res) => {
  res.json(loadRows());
});

app.post('/api/rows', (req, res) => {
  const { label, durationHours } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'label is required' });
  }
  const rows = loadRows();
  const newRow = {
    id: `task-${Date.now()}`,
    label,
    durationHours: durationHours || 6,
  };
  rows.push(newRow);
  saveRows(rows);
  res.json(newRow);
});

app.put('/api/rows/:id', (req, res) => {
  const { label, durationHours } = req.body;
  const rows = loadRows();
  const row = rows.find((r) => r.id === req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'row not found' });
  }
  if (label !== undefined) row.label = label;
  if (durationHours !== undefined) row.durationHours = durationHours;
  saveRows(rows);
  res.json(row);
});

app.delete('/api/rows/:id', (req, res) => {
  const rows = loadRows();
  const index = rows.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'row not found' });
  }
  rows.splice(index, 1);
  saveRows(rows);
  res.json({ success: true });
});

app.get('/api/state', (req, res) => {
  res.json(loadState());
});

app.post('/api/state', (req, res) => {
  const { id, savedAt, durationHours } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const state = loadState();
  if (savedAt) {
    state[id] = { savedAt, durationHours };
  } else {
    delete state[id];
  }
  saveState(state);
  res.json(state[id] || null);
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
