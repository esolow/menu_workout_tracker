# How to Run the App

## Quick Start

You need to run **two things**:
1. **Backend Server** (handles login and data sync)
2. **Frontend App** (the React app you see in the browser)

---

## Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd server
PORT=4000 JWT_SECRET=your-secret-key-change-in-production npm start
```

You should see: `Server running on port 4000`

**Keep this terminal open** - the server needs to keep running.

---

## Step 2: Start the Frontend App

Open a **new terminal** (keep the backend running) and run:

```bash
npm start
```

This will:
- Start the React development server
- Open your browser to `http://localhost:3000`
- Auto-reload when you make changes

---

## That's it!

- **Backend**: Running on `http://localhost:4000`
- **Frontend**: Running on `http://localhost:3000`

The app will automatically connect to the backend for login and data sync.

---

## For iPhone Access

To access from your iPhone on the same WiFi network:

1. Find your computer's local IP address:
   - Mac: System Settings → Network → Wi-Fi → IP Address
   - Or run: `ipconfig getifaddr en0` in terminal

2. On your iPhone, open Safari and go to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.100:3000`

3. Add to Home Screen for a native app experience!

---

## Stopping the App

- Press `Ctrl+C` in both terminals to stop
- Or close the terminal windows

