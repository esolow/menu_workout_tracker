# SQLite Backup/Restore Guide (Free Alternative)

This guide shows you how to use DigitalOcean Spaces to backup your SQLite database, avoiding the cost of a managed database.

## Cost Comparison

- **Managed PostgreSQL**: ~$15/month
- **DigitalOcean Spaces**: ~$5/month for 250GB (plenty for database backups)
- **Savings**: $10/month ($120/year)

## How It Works

1. **On Startup**: App automatically downloads database from Spaces (if backup exists)
2. **Periodic Backups**: App automatically backs up every 6 hours
3. **On Shutdown**: App backs up before shutting down (during deployments)
4. **Manual Backup**: You can trigger backups manually

## Step 1: Create DigitalOcean Spaces Bucket

1. **Go to DigitalOcean Dashboard**:
   - Navigate to https://cloud.digitalocean.com/spaces
   - Click "Create a Space"

2. **Configure Space**:
   - **Name**: `menu-tracker-backups` (or your choice)
   - **Region**: Same as your app (nyc3)
   - **File Listing**: Private (recommended for database backups)
   - Click "Create a Space"

3. **Get Access Keys**:
   - Go to https://cloud.digitalocean.com/account/api/spaces
   - Click "Generate New Key"
   - **Name**: `menu-tracker-backup-key`
   - **Save both**:
     - **Access Key** (starts with something like `DO...`)
     - **Secret Key** (long random string)
   - ⚠️ **Important**: Copy these NOW - you won't see the secret key again!

## Step 2: Set Environment Variables in DigitalOcean

1. **Go to your App** in DigitalOcean Dashboard:
   - Navigate to your app (menu-training-tracker-api)
   - Click "Settings" → "App-Level Environment Variables"

2. **Add Spaces Credentials**:
   
   Add these variables (click "Add Variable" for each):
   
   - **Key**: `SPACES_ACCESS_KEY_ID`
     - **Value**: (paste the Access Key from Step 1)
     - **Scope**: `RUN_TIME`
     - **Type**: `SECRET`
   
   - **Key**: `SPACES_SECRET_ACCESS_KEY`
     - **Value**: (paste the Secret Key from Step 1)
     - **Scope**: `RUN_TIME`
     - **Type**: `SECRET`
   
   - **Key**: `SPACES_BUCKET`
     - **Value**: `menu-tracker-backups` (or your bucket name)
     - **Scope**: `RUN_TIME`
     - **Type**: `GENERAL`
   
   - **Key**: `SPACES_ENDPOINT`
     - **Value**: `nyc3.digitaloceanspaces.com`
     - **Scope**: `RUN_TIME`
     - **Type**: `GENERAL`
     - (Change if your app is in a different region)
   
   - **Key**: `SPACES_REGION`
     - **Value**: `nyc3`
     - **Scope**: `RUN_TIME`
     - **Type**: `GENERAL`
     - (Change if your app is in a different region)

3. **Make sure DATABASE_URL is NOT set**:
   - If `DATABASE_URL` is set, the app will use PostgreSQL instead
   - For this backup solution, leave `DATABASE_URL` unset

## Step 3: Deploy

1. **Commit and push** your changes:
   ```bash
   git add server/package.json server/backup.js server/db.js server/index.js server/.do/app.yaml
   git commit -m "Add SQLite backup/restore with DigitalOcean Spaces"
   git push origin main
   ```

2. **Wait for deployment** (DigitalOcean will auto-deploy)

3. **Check logs** to verify:
   - Look for "📥 Downloading database backup from Spaces..." on first startup
   - Or "ℹ️  No backup found in Spaces. Starting with fresh database." if first time
   - Look for "📦 Automatic database backup enabled" message

## Step 4: Test

1. **Create a test user** through the admin panel
2. **Wait a few minutes** for automatic backup (or trigger manual backup)
3. **Make a small code change and push** (triggers redeploy)
4. **Verify**: After redeploy, the user should still exist! ✅

## Manual Backup/Restore

You can also trigger backups manually:

### Backup
```bash
# On your local machine (if you have Spaces credentials)
cd server
SPACES_ACCESS_KEY_ID=... SPACES_SECRET_ACCESS_KEY=... SPACES_BUCKET=... node backup.js backup
```

### Restore
```bash
# On your local machine
cd server
SPACES_ACCESS_KEY_ID=... SPACES_SECRET_ACCESS_KEY=... SPACES_BUCKET=... node backup.js restore
```

## How It Works Automatically

1. **On App Startup**:
   - Checks if backup exists in Spaces
   - If yes: Downloads and restores database
   - If no: Starts with fresh database

2. **Periodic Backups**:
   - Every 6 hours, automatically backs up database
   - Runs in background, doesn't affect app performance

3. **On Deployment/Shutdown**:
   - When app receives SIGTERM or SIGINT (during deployments)
   - Automatically backs up database before shutting down

## Troubleshooting

### Database not restoring on startup
- Check DigitalOcean logs for error messages
- Verify all Spaces environment variables are set correctly
- Check that bucket name matches exactly
- Verify access keys have proper permissions

### Backups not working
- Check that `SPACES_BUCKET` is set
- Verify access keys are correct
- Check DigitalOcean logs for error messages
- Make sure bucket exists and is accessible

### Still losing data
- Verify `DATABASE_URL` is NOT set (if set, it uses PostgreSQL instead)
- Check that `SPACES_BUCKET` IS set
- Look for backup success messages in logs
- Try manual backup to test: `node backup.js backup`

## Advantages

✅ **Cost**: Only $5/month vs $15/month for managed database  
✅ **Simple**: Automatic backups, no manual intervention  
✅ **Reliable**: Backs up every 6 hours + on shutdown  
✅ **Flexible**: Can restore to any instance  

## Disadvantages

⚠️ **Not Real-Time**: Small window (up to 6 hours) where data could be lost  
⚠️ **Single Instance**: Works best with one app instance (multiple instances = conflicts)  
⚠️ **Manual Recovery**: If app crashes, need to wait for next backup cycle  

## When to Upgrade to Managed Database

Consider upgrading to PostgreSQL ($15/month) if:
- You have multiple app instances (scaling)
- You need real-time data consistency
- You have many concurrent users
- You need better performance

## Cost Summary

- **Spaces**: $5/month (250GB storage - plenty for backups)
- **Total Savings**: $10/month vs managed database
- **Your App**: Already running (no additional cost)

## Next Steps

1. ✅ Create Spaces bucket
2. ✅ Get access keys
3. ✅ Set environment variables
4. ✅ Deploy
5. ✅ Test backup/restore
6. 🎉 Your data will now persist across deployments!

