# Medoc Checklist

A mobile-friendly checklist web app with dynamic editable rows.

Each row has:
- an **editable label** (click to edit)
- a checkbox to mark as done
- a configurable expiration duration in hours
- a saved timestamp shown when checked
- a delete button (✕) to remove the row

**Add new rows** with the "+ Add row" button at the bottom. The checkbox stays checked until the configured duration expires, then it resets automatically.

## Files
- `index.html` — page markup
- `styles.css` — mobile-friendly styling
- `script.js` — checkbox logic and browser persistence

## Usage
- Open the site on GitHub Pages or serve the static files locally.
- On GitHub Pages the app runs fully client-side and stores data in your browser.

## Storage
All data persists in your **browser's localStorage** and survives page reloads and browser restarts. No server or account is required. Works offline and on GitHub Pages.

## Notifications
Notifications are available via the browser Notification API — enable them using the toggle in the header and grant permission when prompted. Background notifications while the browser is closed require a service worker and push server and are not implemented here.

Enjoy! The app is ready to be hosted on GitHub Pages at `https://<your-username>.github.io/<repo>/`.
