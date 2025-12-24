/**
 * Database Backup Utility for DigitalOcean Spaces
 * 
 * This module handles backing up and restoring the SQLite database
 * to/from DigitalOcean Spaces (S3-compatible storage)
 * 
 * Usage:
 *   - Backup: node backup.js backup
 *   - Restore: node backup.js restore
 *   - Auto: Automatically restores on startup if enabled
 */

// Lazy load AWS SDK to avoid build issues if not needed
let S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand;

function loadAWSSDK() {
  if (!S3Client) {
    try {
      const s3 = require('@aws-sdk/client-s3');
      S3Client = s3.S3Client;
      PutObjectCommand = s3.PutObjectCommand;
      GetObjectCommand = s3.GetObjectCommand;
      HeadObjectCommand = s3.HeadObjectCommand;
    } catch (err) {
      throw new Error('AWS SDK not available. Install @aws-sdk/client-s3 if using Spaces backup.');
    }
  }
  return { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand };
}

const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const SPACES_KEY = process.env.SPACES_ACCESS_KEY_ID;
const SPACES_SECRET = process.env.SPACES_SECRET_ACCESS_KEY;
const SPACES_BUCKET = process.env.SPACES_BUCKET;
const SPACES_REGION = process.env.SPACES_REGION || 'nyc3';
const DB_FILE = path.join(__dirname, 'data.sqlite');
const DB_BACKUP_KEY = 'database/data.sqlite';

// Initialize S3 client for DigitalOcean Spaces
let s3Client = null;

function initS3Client() {
  if (!SPACES_KEY || !SPACES_SECRET || !SPACES_BUCKET) {
    console.log('⚠️  Spaces credentials not configured. Skipping backup/restore.');
    return null;
  }

  try {
    const { S3Client: S3 } = loadAWSSDK();
    
    if (!s3Client) {
      s3Client = new S3({
      endpoint: `https://${SPACES_ENDPOINT}`,
      region: SPACES_REGION,
      credentials: {
        accessKeyId: SPACES_KEY,
        secretAccessKey: SPACES_SECRET,
      },
      forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style
      });
    }

    return s3Client;
  } catch (err) {
    console.error('Failed to initialize S3 client:', err.message);
    return null;
  }
}

/**
 * Backup database to Spaces
 */
async function backupDatabase() {
  const client = initS3Client();
  if (!client) {
    console.log('❌ Cannot backup: Spaces not configured');
    return false;
  }

  if (!fs.existsSync(DB_FILE)) {
    console.log('⚠️  Database file does not exist. Nothing to backup.');
    return false;
  }

  try {
    const fileContent = fs.readFileSync(DB_FILE);
    const fileStats = fs.statSync(DB_FILE);
    
    console.log(`📤 Uploading database backup (${(fileStats.size / 1024).toFixed(2)} KB)...`);

    const { PutObjectCommand: PutCmd } = loadAWSSDK();
    const command = new PutCmd({
      Bucket: SPACES_BUCKET,
      Key: DB_BACKUP_KEY,
      Body: fileContent,
      ContentType: 'application/x-sqlite3',
      Metadata: {
        'backup-timestamp': new Date().toISOString(),
        'file-size': fileStats.size.toString(),
      },
    });

    await client.send(command);
    console.log('✅ Database backed up successfully to Spaces');
    return true;
  } catch (error) {
    console.error('❌ Failed to backup database:', error.message);
    return false;
  }
}

/**
 * Restore database from Spaces
 */
async function restoreDatabase() {
  const client = initS3Client();
  if (!client) {
    console.log('⚠️  Spaces not configured. Skipping restore.');
    return false;
  }

  try {
    // Check if backup exists
    const { HeadObjectCommand: HeadCmd } = loadAWSSDK();
    const headCommand = new HeadCmd({
      Bucket: SPACES_BUCKET,
      Key: DB_BACKUP_KEY,
    });

    try {
      await client.send(headCommand);
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log('ℹ️  No backup found in Spaces. Starting with fresh database.');
        return false;
      }
      throw error;
    }

    console.log('📥 Downloading database backup from Spaces...');

    const { GetObjectCommand: GetCmd } = loadAWSSDK();
    const getCommand = new GetCmd({
      Bucket: SPACES_BUCKET,
      Key: DB_BACKUP_KEY,
    });

    const response = await client.send(getCommand);
    const chunks = [];
    
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    const fileContent = Buffer.concat(chunks);
    
    // Write to local file
    fs.writeFileSync(DB_FILE, fileContent);
    
    const fileStats = fs.statSync(DB_FILE);
    console.log(`✅ Database restored successfully (${(fileStats.size / 1024).toFixed(2)} KB)`);
    return true;
  } catch (error) {
    console.error('❌ Failed to restore database:', error.message);
    return false;
  }
}

/**
 * Check if backup exists in Spaces
 */
async function backupExists() {
  const client = initS3Client();
  if (!client) return false;

  try {
    const { HeadObjectCommand: HeadCmd } = loadAWSSDK();
    const headCommand = new HeadCmd({
      Bucket: SPACES_BUCKET,
      Key: DB_BACKUP_KEY,
    });
    await client.send(headCommand);
    return true;
  } catch (error) {
    return false;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'backup') {
    backupDatabase()
      .then(success => process.exit(success ? 0 : 1))
      .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
  } else if (command === 'restore') {
    restoreDatabase()
      .then(success => process.exit(success ? 0 : 1))
      .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
      });
  } else {
    console.log('Usage: node backup.js [backup|restore]');
    process.exit(1);
  }
}

module.exports = {
  backupDatabase,
  restoreDatabase,
  backupExists,
};

