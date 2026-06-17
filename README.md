# Medoc Checklist

A mobile-friendly checklist web app with dynamic editable rows.
Each row has:
- an **editable label** (click to edit)
- a checkbox to mark as done
- a configurable expiration duration in hours
- a saved timestamp shown when checked
- a delete button (✕) to remove the row

**Add new rows** with the "+ Add row" button at the bottom. The checkbox stays checked until the configured duration expires, then it resets automatically. All rows, labels, timestamps, and state persist on the server and are stored in JSON files.

## Files
- `index.html` — page markup
- `styles.css` — mobile-friendly styling
- `script.js` — checkbox logic and server-backed persistence
- `server.js` — simple Express server and storage API
- `package.json` — Node app dependencies and start script

## Run locally
1. Install dependencies:
   ```powershell
npm install
```
2. Start the server:
   ```powershell
npm start
```
3. Open `http://localhost:8080`.

## Storage
Data persists in your **browser's localStorage** and survives page reloads and browser restarts. No account needed. Works offline and on GitHub Pages!

Rows, labels, timestamps, and all state are stored locally in your browser.

> Note: The server saves each checked timestamp and selected expiration duration.
