const path = require('path');

// Check if DATABASE_URL is set (PostgreSQL), otherwise use SQLite
const usePostgres = !!process.env.DATABASE_URL;

let db;

// Helper to convert SQLite placeholders (?) to PostgreSQL ($1, $2, ...)
function convertPlaceholders(query, params) {
  if (!params || params.length === 0) return { query, params: [] };
  
  let pgQuery = query;
  const pgParams = [];
  let paramIndex = 1;
  
  // Replace ? with $1, $2, etc.
  pgQuery = pgQuery.replace(/\?/g, () => {
    pgParams.push(params[paramIndex - 1]);
    return `$${paramIndex++}`;
  });
  
  return { query: pgQuery, params: pgParams };
}

// Helper to convert INSERT OR REPLACE to PostgreSQL syntax
function convertInsertOrReplace(query, params) {
  // Map of tables to their unique constraint columns
  const uniqueConstraints = {
    'menu_entries': ['user_id', 'day_key'],
    'workout_entries': ['user_id', 'day_key'],
    'favorites': ['user_id', 'category', 'item_id'],
    'user_allowances': ['user_id'],
    'user_workout_schedules': ['user_id']
  };
  
  if (!query.includes('INSERT OR REPLACE')) {
    return convertPlaceholders(query, params);
  }
  
  // Extract table name
  const tableMatch = query.match(/INTO\s+(\w+)\s*\(/i);
  if (!tableMatch) {
    return convertPlaceholders(query, params);
  }
  
  const table = tableMatch[1];
  const uniqueCols = uniqueConstraints[table];
  
  if (!uniqueCols) {
    // Fallback: use first column
    const columnsMatch = query.match(/\(([^)]+)\)/);
    if (columnsMatch) {
      const columns = columnsMatch[1].split(',').map(c => c.trim());
      const uniqueCol = columns[0];
      return convertInsertOrReplaceWithColumn(query, params, uniqueCol);
    }
    return convertPlaceholders(query, params);
  }
  
  // Convert to INSERT ... ON CONFLICT
  let pgQuery = query.replace(/INSERT\s+OR\s+REPLACE/i, 'INSERT');
  const { query: convertedQuery, params: pgParams } = convertPlaceholders(pgQuery, params);
  
  // Add ON CONFLICT clause
  const conflictCols = uniqueCols.join(', ');
  const columnsMatch = query.match(/\(([^)]+)\)/);
  if (columnsMatch) {
    const allColumns = columnsMatch[1].split(',').map(c => c.trim());
    const updateColumns = allColumns.filter(col => !uniqueCols.includes(col));
    const updates = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
    
    if (updates) {
      pgQuery = convertedQuery + ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`;
    } else {
      // If no columns to update (all are unique), just ignore
      pgQuery = convertedQuery + ` ON CONFLICT (${conflictCols}) DO NOTHING`;
    }
  }
  
  return { query: pgQuery, params: pgParams };
}

function convertInsertOrReplaceWithColumn(query, params, uniqueColumn) {
  let pgQuery = query.replace(/INSERT\s+OR\s+REPLACE/i, 'INSERT');
  const { query: convertedQuery, params: pgParams } = convertPlaceholders(pgQuery, params);
  
  const columnsMatch = query.match(/\(([^)]+)\)/);
  if (columnsMatch) {
    const allColumns = columnsMatch[1].split(',').map(c => c.trim());
    const updateColumns = allColumns.filter(col => col !== uniqueColumn);
    const updates = updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
    
    if (updates) {
      pgQuery = convertedQuery + ` ON CONFLICT (${uniqueColumn}) DO UPDATE SET ${updates}`;
    } else {
      pgQuery = convertedQuery + ` ON CONFLICT (${uniqueColumn}) DO NOTHING`;
    }
  }
  
  return { query: pgQuery, params: pgParams };
}

if (usePostgres) {
  // PostgreSQL setup
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') 
      ? { rejectUnauthorized: false } 
      : false
  });

  // Create a SQLite-compatible interface for PostgreSQL
  db = {
    serialize: (callback) => {
      if (callback) callback();
    },
    
    run: (query, params, callback) => {
      let pgQuery, pgParams;
      
      if (query.includes('INSERT OR REPLACE')) {
        const converted = convertInsertOrReplace(query, params);
        pgQuery = converted.query;
        pgParams = converted.params;
      } else if (query.includes('ON CONFLICT')) {
        // Already PostgreSQL syntax, just convert placeholders
        const converted = convertPlaceholders(query, params);
        pgQuery = converted.query;
        pgParams = converted.params;
      } else if (query.includes('INSERT INTO') && !query.includes('RETURNING')) {
        // For INSERT queries, add RETURNING id to get lastID
        const converted = convertPlaceholders(query, params);
        pgQuery = converted.query;
        pgParams = converted.params;
        
        // Add RETURNING id if it's an INSERT
        if (query.match(/INSERT\s+INTO/i) && !pgQuery.includes('RETURNING')) {
          pgQuery += ' RETURNING id';
        }
      } else {
        const converted = convertPlaceholders(query, params);
        pgQuery = converted.query;
        pgParams = converted.params;
      }
      
      pool.query(pgQuery, pgParams)
        .then(result => {
          const mockThis = {
            lastID: result.rows[0]?.id || null,
            changes: result.rowCount || 0
          };
          if (callback) {
            callback(null, mockThis);
          }
        })
        .catch(err => {
          if (callback) {
            callback(err, null);
          }
        });
    },
    
    get: (query, params, callback) => {
      const { query: pgQuery, params: pgParams } = convertPlaceholders(query, params);
      
      pool.query(pgQuery, pgParams)
        .then(result => {
          if (callback) {
            callback(null, result.rows[0] || null);
          }
        })
        .catch(err => {
          if (callback) {
            callback(err, null);
          }
        });
    },
    
    all: (query, params, callback) => {
      const { query: pgQuery, params: pgParams } = convertPlaceholders(query, params);
      
      pool.query(pgQuery, pgParams)
        .then(result => {
          if (callback) {
            callback(null, result.rows || []);
          }
        })
        .catch(err => {
          if (callback) {
            callback(err, null);
          }
        });
    },
    
    prepare: (query) => {
      let pgQuery;
      let pgParams = [];
      
      if (query.includes('INSERT OR REPLACE')) {
        // We'll convert when run is called with actual params
        pgQuery = query;
      } else {
        // Pre-convert placeholders (will be replaced when run is called)
        pgQuery = query;
      }
      
      const stmt = {
        run: (params, callback) => {
          let finalQuery, finalParams;
          
          if (pgQuery.includes('INSERT OR REPLACE')) {
            const converted = convertInsertOrReplace(pgQuery, params);
            finalQuery = converted.query;
            finalParams = converted.params;
          } else {
            const converted = convertPlaceholders(pgQuery, params);
            finalQuery = converted.query;
            finalParams = converted.params;
          }
          
          pool.query(finalQuery, finalParams)
            .then(() => {
              if (callback) callback(null);
            })
            .catch(err => {
              if (callback) callback(err);
              else console.error('Error in prepared statement:', err);
            });
        },
        finalize: (callback) => {
          if (callback) callback(null);
        }
      };
      
      return stmt;
    }
  };
  
  // Initialize database tables
  db.serialize(() => {
    initPostgresTables(pool);
  });
  
} else {
  // SQLite setup (for local development or production with backup/restore)
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'data.sqlite');
  
  // Restore database from backup on startup (if in production and backup exists)
  // Note: This runs asynchronously, so database might be restored after first connection
  // That's okay - first connection will create empty DB, then restore will overwrite it
  if (process.env.NODE_ENV === 'production' || process.env.SPACES_BUCKET) {
    // Load backup module lazily to avoid build issues if @aws-sdk isn't needed
    setImmediate(() => {
      try {
        const { restoreDatabase } = require('./backup');
        restoreDatabase().catch(err => {
          console.error('Failed to restore database on startup:', err);
          // Continue with fresh database if restore fails
        });
      } catch (err) {
        // If backup module fails to load (e.g., missing dependencies), continue without it
        console.warn('Backup module not available:', err.message);
      }
    });
  }
  
  const sqliteDb = new sqlite3.Database(dbPath);
  
  // Wrap SQLite db to handle ON CONFLICT syntax (convert to INSERT OR REPLACE)
  db = {
    serialize: (callback) => {
      sqliteDb.serialize(callback);
    },
    run: (query, params, callback) => {
      // Convert PostgreSQL ON CONFLICT to SQLite INSERT OR REPLACE
      let sqliteQuery = query;
      if (query.includes('ON CONFLICT') && query.includes('INSERT INTO')) {
        // Extract the conflict column from ON CONFLICT(column)
        const conflictMatch = query.match(/ON\s+CONFLICT\s*\(([^)]+)\)/i);
        if (conflictMatch) {
          // For SQLite, we use INSERT OR REPLACE
          // Remove the ON CONFLICT clause
          sqliteQuery = query.replace(/\s+ON\s+CONFLICT[^;]*/i, '');
          sqliteQuery = sqliteQuery.replace(/INSERT\s+INTO/i, 'INSERT OR REPLACE INTO');
        }
      }
      
      // Use direct run for better lastID support
      // Preserve 'this' context for callback (SQLite3 pattern)
      sqliteDb.run(sqliteQuery, params, function(err) {
        if (callback) {
          // Call callback with 'this' bound to the statement object
          callback.call(this, err);
        }
      });
    },
    get: (query, params, callback) => {
      sqliteDb.get(query, params, callback);
    },
    all: (query, params, callback) => {
      sqliteDb.all(query, params, callback);
    },
    prepare: (query) => {
      // Convert ON CONFLICT for prepared statements too
      let sqliteQuery = query;
      if (query.includes('ON CONFLICT') && query.includes('INSERT INTO')) {
        const conflictMatch = query.match(/ON\s+CONFLICT\s*\(([^)]+)\)/i);
        if (conflictMatch) {
          sqliteQuery = query.replace(/\s+ON\s+CONFLICT[^;]*/i, '');
          sqliteQuery = sqliteQuery.replace(/INSERT\s+INTO/i, 'INSERT OR REPLACE INTO');
        }
      }
      return sqliteDb.prepare(sqliteQuery);
    }
  };
  
  // Initialize database tables
  db.serialize(() => {
    initSqliteTables(db);
  });
}

// Initialize PostgreSQL tables
async function initPostgresTables(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        menu_template_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Menu entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        day_key TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, day_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Workout entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        day_key TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, day_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Favorites table
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        item_data TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category, item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // User allowances table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_allowances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        protein INTEGER DEFAULT 5,
        carbs INTEGER DEFAULT 5,
        fat INTEGER DEFAULT 1,
        free_calories INTEGER DEFAULT 200,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // User workout schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_workout_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        weekly_muscle INTEGER DEFAULT 4,
        weekly_cardio INTEGER DEFAULT 3,
        workout_routine TEXT NOT NULL,
        custom_exercises TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Menu templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_templates (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        protein TEXT NOT NULL,
        carbs TEXT NOT NULL,
        fat TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add columns if they don't exist (for existing databases)
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`);
    } catch (e) {
      // Column might already exist, ignore
    }
    
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS menu_template_id INTEGER`);
    } catch (e) {
      // Column might already exist, ignore
    }
    
    try {
      await client.query(`ALTER TABLE user_workout_schedules ADD COLUMN IF NOT EXISTS custom_exercises TEXT`);
    } catch (e) {
      // Column might already exist, ignore
    }
    
    await client.query('COMMIT');
    console.log('PostgreSQL tables initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing PostgreSQL tables:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Initialize SQLite tables
function initSqliteTables(db) {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add role column to existing users table if it doesn't exist (for legacy databases)
  // Note: This will fail silently if column already exists, which is fine
  db.run(`
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'
  `, (err) => {
    // Ignore error if column already exists (expected for new databases)
  });

  // Menu entries table
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day_key TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, day_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Workout entries table
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      day_key TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, day_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Favorites table
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      item_data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User allowances table (daily menu limits)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_allowances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      protein INTEGER DEFAULT 5,
      carbs INTEGER DEFAULT 5,
      fat INTEGER DEFAULT 1,
      free_calories INTEGER DEFAULT 200,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User workout schedules table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_workout_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      weekly_muscle INTEGER DEFAULT 4,
      weekly_cardio INTEGER DEFAULT 3,
      workout_routine TEXT NOT NULL,
      custom_exercises TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User workout schedules table already includes custom_exercises in CREATE TABLE
  // But add it for legacy databases that don't have it
  db.run(`
    ALTER TABLE user_workout_schedules ADD COLUMN custom_exercises TEXT
  `, (err) => {
    // Ignore error if column already exists (expected for new databases)
  });

  // Menu templates table (shared templates that can be assigned to users)
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      protein TEXT NOT NULL,
      carbs TEXT NOT NULL,
      fat TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add menu_template_id column to users table if it doesn't exist (for legacy databases)
  db.run(`
    ALTER TABLE users ADD COLUMN menu_template_id INTEGER
  `, (err) => {
    // Ignore error if column already exists (expected for new databases)
  });
}

module.exports = db;
