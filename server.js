const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname);

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

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
