# Mobile Checklist

A minimal mobile-friendly checklist web app with 3 rows.
Each row has:
- a checkbox
- a configurable duration in hours
- a saved timestamp shown when checked

The checkbox stays checked until the configured duration expires, then it resets. State is stored in browser `localStorage`.

## Files
- `index.html` — page markup
- `styles.css` — mobile-friendly styling
- `script.js` — checkbox logic, timestamp storage, per-row duration
- `Dockerfile` — serves the site with Nginx

## Run locally with Docker
1. Build the image:
   ```powershell
docker build -t mobile-checklist .
```
2. Run the container:
   ```powershell
docker run --rm -p 8080:80 mobile-checklist
```
3. Open `http://localhost:8080`.

> Note: This is a quick-and-dirty static app, ideal for mobile use and simple checkbox tracking.
