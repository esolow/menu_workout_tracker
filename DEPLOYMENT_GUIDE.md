# Deployment Guide: Switching from ngrok to DigitalOcean

This guide will help you deploy your backend to DigitalOcean App Platform and update your frontend to use it.

## Step 1: Prepare Your Repository

1. **Update the app.yaml file** with your GitHub username:
   - Edit `server/.do/app.yaml`
   - Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username

2. **Generate a secure JWT secret**:
   ```bash
   # Generate a random secret (run this locally)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Save this value - you'll need it for DigitalOcean.

3. **Commit and push your changes**:
   ```bash
   git add server/.do/app.yaml server/index.js
   git commit -m "Add DigitalOcean deployment configuration"
   git push origin main
   ```

## Step 2: Deploy Backend to DigitalOcean

### Option A: Using DigitalOcean Web Interface (Recommended)

1. **Sign up/Login to DigitalOcean**:
   - Go to https://cloud.digitalocean.com
   - Create an account or sign in

2. **Create a New App**:
   - Click "Create" → "Apps"
   - Connect your GitHub account
   - Select your `menu_training_tracker` repository
   - Choose the `main` branch

3. **Configure the App**:
   - **Source Directory**: `server`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: `8080` (or leave default)

4. **Set Environment Variables**:
   - Click "Edit" on your service
   - Go to "Environment Variables"
   - Add:
     - `PORT`: `8080` (or the port DigitalOcean assigns)
     - `JWT_SECRET`: (paste the secret you generated in Step 1)
     - Make sure `JWT_SECRET` is marked as "Encrypted" (SECRET type)

5. **Deploy**:
   - Click "Next" → "Review" → "Create Resources"
   - DigitalOcean will build and deploy your app
   - Wait for deployment to complete (5-10 minutes)

6. **Get Your Backend URL**:
   - Once deployed, you'll see a URL like: `https://your-app-name-xxxxx.ondigitalocean.app`
   - Copy this URL - this is your new backend API URL

### Option B: Using app.yaml (Advanced)

If you prefer using the YAML file:

1. Install DigitalOcean CLI (optional):
   ```bash
   brew install doctl  # macOS
   ```

2. Authenticate:
   ```bash
   doctl auth init
   ```

3. Deploy:
   ```bash
   doctl apps create --spec server/.do/app.yaml
   ```

## Step 3: Update Frontend to Use New Backend

### Update Netlify Environment Variables

1. **Go to Netlify Dashboard**:
   - Navigate to your site
   - Go to "Site settings" → "Environment variables"

2. **Add/Update Environment Variable**:
   - Variable name: `REACT_APP_API_BASE`
   - Value: `https://your-app-name-xxxxx.ondigitalocean.app` (your DigitalOcean URL)
   - Click "Save"

3. **Redeploy**:
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - Or push a new commit to trigger automatic deployment

### Alternative: Update client.js Directly

If you prefer to hardcode it (not recommended for production):

1. Edit `src/api/client.js`:
   ```javascript
   const API_BASE = process.env.REACT_APP_API_BASE || 'https://your-app-name-xxxxx.ondigitalocean.app';
   ```

2. Commit and push:
   ```bash
   git add src/api/client.js
   git commit -m "Update API base URL to DigitalOcean"
   git push origin main
   ```

## Step 4: Test Your Deployment

1. **Test Backend**:
   - Visit: `https://your-app-name-xxxxx.ondigitalocean.app/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Frontend**:
   - Visit your Netlify site
   - Try logging in
   - Verify data syncs correctly

## Step 5: Stop Using ngrok (Optional)

Once everything works:

1. **Stop ngrok** (if running):
   ```bash
   # Find ngrok process
   ps aux | grep ngrok
   # Kill it
   kill <PID>
   ```

2. **Stop local server** (if running):
   ```bash
   # Find node process
   lsof -i :4000
   # Kill it
   kill <PID>
   ```

## Important Notes

### Database Persistence

⚠️ **SQLite Limitation**: Your current setup uses SQLite, which is file-based. On DigitalOcean:
- The database file will persist in the app's filesystem
- However, if you scale to multiple instances, each will have its own database
- For production with multiple users, consider upgrading to:
  - DigitalOcean Managed Database (PostgreSQL)
  - Or use a single instance only

### Environment Variables

Make sure these are set in DigitalOcean:
- `PORT`: Automatically set by DigitalOcean (usually 8080)
- `JWT_SECRET`: **MUST** be a strong, random string (use the generator above)

### CORS

Your server already has CORS enabled, which is good. Make sure your Netlify frontend URL is allowed (DigitalOcean's CORS should allow all origins by default with your current setup).

## Troubleshooting

### Backend not responding
- Check DigitalOcean logs: App → Runtime Logs
- Verify environment variables are set correctly
- Check that PORT matches what DigitalOcean expects

### Frontend can't connect
- Verify `REACT_APP_API_BASE` is set in Netlify
- Check browser console for CORS errors
- Ensure backend URL is correct (no trailing slash)

### Database issues
- SQLite file is created automatically on first run
- Check DigitalOcean logs for database errors
- Verify file permissions (should work automatically)

## Cost Estimate

DigitalOcean App Platform pricing:
- **Basic Plan**: ~$5/month for the smallest instance
- **Pro Plan**: ~$12/month (recommended for production)

You can start with Basic and upgrade later.

## Next Steps

1. ✅ Deploy backend to DigitalOcean
2. ✅ Update Netlify environment variables
3. ✅ Test the full stack
4. ⚠️ Consider migrating to PostgreSQL for better scalability
5. ⚠️ Set up custom domain (optional)

