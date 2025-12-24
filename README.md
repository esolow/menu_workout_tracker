# Menu & Workout Tracker

A Progressive Web App (PWA) for tracking your daily menu and weekly workout routine on iPhone.

## Features

### Daily Menu Tracking
- Track 5 protein servings
- Track 5 carbohydrate servings  
- Track 1 fat serving
- Track 200 free calories
- Browse food database with Hebrew and English names
- View daily progress and remaining servings
- Select any date to view/edit past or future days

### Weekly Workout Tracking
- Track 4 muscle workouts per week
- Track 3 cardio workouts per week
- Visual calendar view of the week
- Weekly progress statistics
- Navigate between weeks

## Installation on iPhone

1. **Create App Icons (Optional but Recommended):**
   - Create two PNG images: `icon-192x192.png` and `icon-512x512.png`
   - Place them in the `public/` folder
   - You can use any image editor or online tool to create these
   - The app will work without icons, but won't have a custom icon when installed

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **For Development:**
   ```bash
   npm start
   ```
   - The app will open at `http://localhost:3000`
   - On your iPhone, make sure your phone and computer are on the same WiFi network
   - Find your computer's local IP address (e.g., `192.168.1.100`)
   - Open Safari on iPhone and go to `http://YOUR_IP:3000`

4. **For Production:**
   ```bash
   npm run build
   ```
   - This creates a `build/` folder with optimized files
   - Deploy the `build/` folder to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)
   - Or serve it locally using `npx serve -s build`

5. **Install on iPhone:**
   - Open Safari on your iPhone
   - Navigate to the app URL (development or production)
   - Tap the Share button (square with arrow pointing up)
   - Scroll down and tap "Add to Home Screen"
   - Customize the name if desired
   - Tap "Add"
   - The app will appear as an icon on your home screen and work like a native app

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Data Storage

All data is stored locally in your browser's localStorage. Your data stays on your device and is not synced to any server.

## Requirements

- Node.js 14+ and npm
- Modern web browser (Safari on iOS recommended for best PWA experience)

