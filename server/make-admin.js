const db = require('./db');

// Usage: node make-admin.js <email>
const email = process.argv[2];

if (!email) {
  console.error('Usage: node make-admin.js <email>');
  process.exit(1);
}

db.run(
  'UPDATE users SET role = ? WHERE email = ?',
  ['admin', email],
  function(err) {
    if (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
    if (this.changes === 0) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }
    console.log(`✓ User "${email}" is now an admin.`);
    process.exit(0);
  }
);

