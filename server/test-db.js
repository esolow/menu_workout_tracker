/**
 * Test script for database adapter
 * Tests both SQLite (local) and PostgreSQL (if DATABASE_URL is set)
 * 
 * Usage:
 *   node test-db.js              # Test SQLite
 *   DATABASE_URL=... node test-db.js  # Test PostgreSQL
 */

const db = require('./db');

console.log('='.repeat(60));
console.log('Database Adapter Test');
console.log('='.repeat(60));

const usePostgres = !!process.env.DATABASE_URL;
console.log(`\nDatabase Type: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
if (usePostgres) {
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
}
console.log('');

let testsPassed = 0;
let testsFailed = 0;

function test(name, testFn) {
  return new Promise((resolve) => {
    console.log(`Testing: ${name}...`);
    try {
      testFn((err, result) => {
        if (err) {
          console.log(`  ❌ FAILED: ${err.message}`);
          testsFailed++;
        } else {
          console.log(`  ✅ PASSED`);
          testsPassed++;
        }
        resolve();
      });
    } catch (err) {
      console.log(`  ❌ FAILED: ${err.message}`);
      testsFailed++;
      resolve();
    }
  });
}

async function runTests() {
  // Test 1: Database connection
  await test('Database connection', (callback) => {
    db.serialize(() => {
      callback(null, true);
    });
  });

  // Test 2: Create test user
  await test('INSERT user', (callback) => {
    const testEmail = `test-${Date.now()}@example.com`;
    db.run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [testEmail, 'hashed_password', 'user'],
      function(err) {
        if (err) {
          return callback(err);
        }
        // Check this.lastID (SQLite3 pattern)
        if (!this.lastID) {
          return callback(new Error('No lastID returned'));
        }
        callback(null, { id: this.lastID, email: testEmail });
      }
    );
  });

  // Test 3: SELECT user
  await test('SELECT user by email', (callback) => {
    db.get(
      'SELECT id, email, role FROM users WHERE email LIKE ?',
      ['test-%@example.com'],
      (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(new Error('User not found'));
        callback(null, row);
      }
    );
  });

  // Test 4: SELECT all users
  await test('SELECT all users', (callback) => {
    db.all(
      'SELECT id, email, role FROM users LIMIT 10',
      [],
      (err, rows) => {
        if (err) return callback(err);
        if (!Array.isArray(rows)) return callback(new Error('Result is not an array'));
        callback(null, rows);
      }
    );
  });

  // Test 5: INSERT OR REPLACE (menu_entries)
  await test('INSERT OR REPLACE (menu_entries)', (callback) => {
    db.run(
      'INSERT OR REPLACE INTO menu_entries (user_id, day_key, data, updated_at) VALUES (?, ?, ?, ?)',
      [1, '2024-01-01', JSON.stringify({ protein: [], carbs: [] }), new Date().toISOString()],
      function(err) {
        if (err) return callback(err);
        callback(null, { changes: this.changes });
      }
    );
  });

  // Test 6: ON CONFLICT syntax (user_allowances)
  await test('ON CONFLICT syntax (user_allowances)', (callback) => {
    db.run(
      `INSERT INTO user_allowances (user_id, protein, carbs, fat, free_calories, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         protein = excluded.protein,
         carbs = excluded.carbs,
         fat = excluded.fat,
         free_calories = excluded.free_calories,
         updated_at = excluded.updated_at`,
      [1, 5, 5, 1, 200, new Date().toISOString()],
      function(err) {
        if (err) return callback(err);
        callback(null, { changes: this.changes });
      }
    );
  });

  // Test 7: Prepared statement
  await test('Prepared statement (batch insert)', (callback) => {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO menu_entries (user_id, day_key, data, updated_at) VALUES (?, ?, ?, ?)'
    );
    
    let completed = 0;
    const total = 3;
    
    for (let i = 0; i < total; i++) {
      stmt.run(
        [1, `2024-01-0${i + 1}`, JSON.stringify({ test: i }), new Date().toISOString()],
        (err) => {
          if (err) {
            stmt.finalize(() => callback(err));
            return;
          }
          completed++;
          if (completed === total) {
            stmt.finalize((err) => {
              if (err) return callback(err);
              callback(null, { completed });
            });
          }
        }
      );
    }
  });

  // Test 8: Complex query with JOIN
  await test('Complex query (user with menu entries)', (callback) => {
    db.all(
      `SELECT u.id, u.email, COUNT(me.id) as entry_count
       FROM users u
       LEFT JOIN menu_entries me ON u.id = me.user_id
       WHERE u.email LIKE ?
       GROUP BY u.id, u.email
       LIMIT 5`,
      ['test-%@example.com'],
      (err, rows) => {
        if (err) return callback(err);
        callback(null, rows);
      }
    );
  });

  // Test 9: UPDATE query
  await test('UPDATE query', (callback) => {
    db.run(
      'UPDATE users SET role = ? WHERE email LIKE ?',
      ['admin', 'test-%@example.com'],
      function(err) {
        if (err) return callback(err);
        callback(null, { changes: this.changes });
      }
    );
  });

  // Test 10: DELETE query
  await test('DELETE query (cleanup test data)', (callback) => {
    db.run(
      'DELETE FROM menu_entries WHERE user_id = ?',
      [1],
      function(err) {
        if (err) return callback(err);
        db.run(
          'DELETE FROM user_allowances WHERE user_id = ?',
          [1],
          function(err2) {
            if (err2) return callback(err2);
            callback(null, { cleaned: true });
          }
        );
      }
    );
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

