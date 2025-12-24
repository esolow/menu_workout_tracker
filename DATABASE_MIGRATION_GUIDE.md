# Database Migration Guide: Fixing Data Loss on Deployment

## ✅ Migration Complete!

The code has been updated to support both SQLite (local development) and PostgreSQL (production). You just need to set up the database and configure it.

## Problem
Your users were being erased every time you deployed because DigitalOcean App Platform uses an **ephemeral filesystem** - all files are deleted when the app redeploys.

## Solution Options

### Option 1: Supabase (Free PostgreSQL) ⭐ RECOMMENDED
- **Cost**: $0/month
- **Setup**: 5 minutes
- **See**: `SUPABASE_SETUP_GUIDE.md` for step-by-step instructions

### Option 2: DigitalOcean Managed Database (PostgreSQL)

### Step 1: Create a Managed Database

1. **Go to DigitalOcean Dashboard**:
   - Navigate to https://cloud.digitalocean.com/databases
   - Click "Create Database"

2. **Configure Database**:
   - **Database Engine**: PostgreSQL
   - **Version**: Latest stable (PostgreSQL 15 or 16)
   - **Datacenter Region**: Same as your app (nyc)
   - **Plan**: Basic ($15/month) - sufficient for most apps
   - **Database Name**: `menu_training_tracker` (or your choice)

3. **Wait for Creation** (5-10 minutes)

4. **Get Connection Details**:
   - Click on your database
   - Go to "Connection Details" tab
   - Copy the connection string (looks like: `postgresql://user:password@host:port/dbname?sslmode=require`)
   - **Important**: Save this - you'll need it in the next step!

### Step 2: Set Environment Variable in DigitalOcean

1. **Go to your App** in DigitalOcean Dashboard:
   - Navigate to your app (menu-training-tracker-api)
   - Click "Settings" → "App-Level Environment Variables"

2. **Add Database URL**:
   - Click "Edit" or "Add Variable"
   - **Key**: `DATABASE_URL`
   - **Value**: (paste the connection string from Step 1)
   - **Scope**: `RUN_TIME`
   - **Type**: `SECRET` (encrypted) - **IMPORTANT!**
   - Click "Save"

### Step 3: Deploy and Test

1. **The code is already updated!** The following has been done:
   - ✅ `pg` package added to `package.json`
   - ✅ `db.js` updated to support both SQLite and PostgreSQL
   - ✅ All SQL queries are compatible with both databases
   - ✅ `app.yaml` updated with DATABASE_URL placeholder

2. **Commit and push** (if you haven't already):
   ```bash
   git add server/package.json server/db.js server/.do/app.yaml
   git commit -m "Add PostgreSQL support for persistent database"
   git push origin main
   ```

3. **Wait for deployment** (DigitalOcean will auto-deploy)

4. **Test**:
   - Create a user through the admin panel
   - Make a small code change and push (triggers redeploy)
   - Verify the user still exists after redeploy! ✅

## How It Works

- **Local Development**: Uses SQLite (no DATABASE_URL set)
- **Production**: Uses PostgreSQL (when DATABASE_URL is set)
- **Automatic**: The code detects which database to use automatically
- **Compatible**: All queries work with both databases

## Cost

- **PostgreSQL Basic Plan**: ~$15/month (1GB RAM, 10GB storage)
- **PostgreSQL Professional Plan**: ~$60/month (better performance)

For a small app, Basic should be sufficient.

## Troubleshooting

### Database connection fails
- Verify `DATABASE_URL` is set correctly in DigitalOcean
- Check that the connection string includes `?sslmode=require`
- Verify the database is in the same region as your app

### Tables not created
- Check DigitalOcean logs for errors
- The tables are created automatically on first connection
- Verify the database user has CREATE TABLE permissions

### Still losing data
- Make sure `DATABASE_URL` is set as a **SECRET** type
- Verify the environment variable is set at the **App level**, not component level
- Check that the database is actually being used (check logs)

## Next Steps

1. ✅ Create managed database
2. ✅ Set DATABASE_URL environment variable
3. ✅ Deploy and test
4. 🎉 Your data will now persist across deployments!

## Local Development

For local development, the app will continue using SQLite (no changes needed). The database file will be in `server/data.sqlite`.

To test with PostgreSQL locally:
1. Install PostgreSQL locally or use Docker
2. Set `DATABASE_URL` environment variable locally
3. Run the app - it will use PostgreSQL instead of SQLite

