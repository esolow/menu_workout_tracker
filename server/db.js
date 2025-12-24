const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
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

  // Add role column to existing users table if it doesn't exist
  db.run(`
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'
  `, (err) => {
    // Ignore error if column already exists
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

  // Add custom_exercises column if it doesn't exist
  db.run(`
    ALTER TABLE user_workout_schedules ADD COLUMN custom_exercises TEXT
  `, (err) => {
    // Ignore error if column already exists
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

  // Add menu_template_id column to users table if it doesn't exist
  db.run(`
    ALTER TABLE users ADD COLUMN menu_template_id INTEGER
  `, (err) => {
    // Ignore error if column already exists
  });
});

module.exports = db;

