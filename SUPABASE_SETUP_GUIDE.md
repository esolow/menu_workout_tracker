# Supabase Setup Guide (Free PostgreSQL)

This guide will help you set up a **free** PostgreSQL database using Supabase, avoiding the $5/month cost of DigitalOcean Spaces.

## Why Supabase?

✅ **Free** - No cost for small apps  
✅ **PostgreSQL** - Professional database  
✅ **Automatic backups** - Built-in  
✅ **Easy setup** - 5 minutes  
✅ **No code changes needed** - Your app already supports PostgreSQL!

## Step 1: Create Supabase Account & Project

1. **Go to Supabase**:
   - Navigate to https://supabase.com
   - Click "Start your project" or "Sign up"

2. **Create Account** (if needed):
   - Sign up with GitHub, Google, or email
   - Verify your email if required

3. **Create New Project**:
   - Click "New Project"
   - **Name**: `menu-training-tracker` (or your choice)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your DigitalOcean app (e.g., `US East (North Virginia)`)
   - **Pricing Plan**: Free (default)
   - Click "Create new project"

4. **Wait for Setup** (2-3 minutes):
   - Supabase will set up your database
   - You'll see a loading screen

## Step 2: Get Database Connection String

1. **Go to Project Settings**:
   - In your Supabase project dashboard
   - Click the gear icon (⚙️) in the left sidebar
   - Click "Database"

2. **Find Connection String**:
   - Scroll down to "Connection string"
   - Select "URI" tab
   - Copy the connection string
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

3. **Replace Password**:
   - The connection string has `[YOUR-PASSWORD]` placeholder
   - Replace it with the password you created in Step 1
   - Example: `postgresql://postgres:MySecurePassword123@db.xxxxx.supabase.co:5432/postgres`

4. **Add SSL Parameter**:
   - Add `?sslmode=require` to the end
   - Final string: `postgresql://postgres:MySecurePassword123@db.xxxxx.supabase.co:5432/postgres?sslmode=require`

## Step 3: Set Environment Variable in DigitalOcean

1. **Go to your App** in DigitalOcean Dashboard:
   - Navigate to your app (menu-training-tracker-api)
   - Click "Settings" → "App-Level Environment Variables"

2. **Add DATABASE_URL**:
   - Click "Add Variable"
   - **Key**: `DATABASE_URL`
   - **Value**: (paste the connection string from Step 2, with password and `?sslmode=require`)
   - **Scope**: `RUN_TIME`
   - **Type**: `SECRET` (encrypted) - **IMPORTANT!**
   - Click "Save"

3. **Remove Spaces Variables** (if you added them):
   - You can delete these (not needed with Supabase):
     - `SPACES_ACCESS_KEY_ID`
     - `SPACES_SECRET_ACCESS_KEY`
     - `SPACES_BUCKET`
     - `SPACES_ENDPOINT`
     - `SPACES_REGION`

## Step 4: Deploy

1. **Commit and push** (if you haven't already):
   ```bash
   cd /Users/eitansolow/cursor_projects/menu_training_tracker
   git add .
   git commit -m "Configure for Supabase PostgreSQL"
   git push origin main
   ```

2. **Wait for deployment** (DigitalOcean will auto-deploy)

3. **Check logs** to verify:
   - Look for "PostgreSQL tables initialized successfully"
   - No database connection errors

## Step 5: Test

1. **Create a test user** through the admin panel
2. **Make a small code change and push** (triggers redeploy)
3. **Verify**: After redeploy, the user should still exist! ✅

## How It Works

- **Local Development**: Still uses SQLite (no DATABASE_URL set locally)
- **Production**: Uses Supabase PostgreSQL (when DATABASE_URL is set)
- **Automatic**: Code detects which database to use
- **No code changes**: Everything already works!

## Supabase Free Tier Limits

- **Database Size**: 500MB
- **Bandwidth**: 2GB/month
- **API Requests**: 50,000/month
- **File Storage**: 1GB

For a small app, this is plenty! You can upgrade later if needed.

## Troubleshooting

### Connection fails
- Verify password in connection string is correct
- Make sure `?sslmode=require` is at the end
- Check that DATABASE_URL is set as SECRET type
- Verify Supabase project is active (not paused)

### Tables not created
- Check DigitalOcean logs for errors
- Tables are created automatically on first connection
- Verify connection string format is correct

### Still losing data
- Make sure DATABASE_URL is set correctly
- Verify it's set at App level, not component level
- Check Supabase dashboard to see if data is there

## Cost Comparison

| Solution | Monthly Cost |
|----------|--------------|
| **Supabase (Free)** | **$0** ✅ |
| DigitalOcean Spaces | $5 |
| Managed PostgreSQL | $15 |

## Next Steps

1. ✅ Create Supabase account and project
2. ✅ Get connection string
3. ✅ Set DATABASE_URL in DigitalOcean
4. ✅ Deploy
5. ✅ Test
6. 🎉 Your data will persist across deployments - **for free!**

## Local Development

For local development, the app will continue using SQLite (no DATABASE_URL set locally). The database file will be in `server/data.sqlite`.

To test with Supabase locally:
```bash
cd server
DATABASE_URL="postgresql://..." node index.js
```

## Upgrading Later

If you outgrow the free tier:
- Supabase Pro: $25/month (unlimited database size)
- Or switch to DigitalOcean Managed Database: $15/month

But for now, free tier should be plenty!

