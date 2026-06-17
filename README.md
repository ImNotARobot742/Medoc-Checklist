# Mobile Checklist

A minimal mobile-friendly checklist web app with 3 rows.
Each row has:
- a checkbox
- a configurable duration in hours
- a saved timestamp shown when checked

The checkbox stays checked until the configured duration expires, then it resets. State is stored on the server and saved in `data.json`.

## Files
- `index.html` — page markup
- `styles.css` — mobile-friendly styling
- `script.js` — checkbox logic and server-backed persistence
- `server.js` — simple Express server and storage API
- `package.json` — Node app dependencies and start script
- `Dockerfile` — builds and runs the Node server

## Run locally with Docker
1. Build the image:
   ```powershell
docker build -t medoc-checklist .
```
2. Run the container:
   ```powershell
docker run --rm -p 8080:80 medoc-checklist
```
3. Open `http://localhost:8080`.

## Run locally without Docker
1. Install dependencies:
   ```powershell
npm install
```
2. Start the server:
   ```powershell
npm start
```
3. Open `http://localhost:8080`.

> Note: The server saves each checked timestamp and selected expiration duration.
