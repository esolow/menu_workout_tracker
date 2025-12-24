const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// Helper to get user from token
const authenticateToken = (req, res, next) => {
  console.log(`[authenticateToken] ${req.method} ${req.path}`);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log(`[authenticateToken] No token provided for ${req.path}`);
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log(`[authenticateToken] Invalid token for ${req.path}:`, err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    console.log(`[authenticateToken] Token verified for ${req.path}, user:`, user);
    req.user = user;
    next();
  });
};

// Helper to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'user'],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const token = jwt.sign({ userId: this.lastID, email, role: 'user' }, JWT_SECRET);
        res.json({ token, user: { id: this.lastID, email, role: 'user' } });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const role = user.role || 'user';
      const token = jwt.sign({ userId: user.id, email: user.email, role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, role } });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync routes - Menu
app.get('/sync/menu', authenticateToken, (req, res) => {
  db.all(
    'SELECT day_key, data, updated_at FROM menu_entries WHERE user_id = ?',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch menu' });
      }
      const entries = rows.map(row => ({
        dayKey: row.day_key,
        data: JSON.parse(row.data),
        updatedAt: row.updated_at,
      }));
      res.json({ entries });
    }
  );
});

app.post('/sync/menu', authenticateToken, (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries must be an array' });
  }

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO menu_entries (user_id, day_key, data, updated_at) VALUES (?, ?, ?, ?)'
  );

  entries.forEach(entry => {
    stmt.run(
      [req.user.userId, entry.dayKey, JSON.stringify(entry.data), entry.updatedAt || new Date().toISOString()],
      (err) => {
        if (err) console.error('Error saving menu entry:', err);
      }
    );
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save menu' });
    }
    res.json({ success: true });
  });
});

// Get menu template (available foods) for the user
app.get('/sync/menu-template', authenticateToken, (req, res) => {
  // First, get the user's selected menu template ID
  db.get(
    'SELECT menu_template_id FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch user' });
      }
      
      const templateId = user?.menu_template_id;
      
      if (templateId) {
        // User has a custom template selected, fetch it
        db.get(
          'SELECT name, protein, carbs, fat FROM menu_templates WHERE id = ?',
          [templateId],
          (err, template) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to fetch menu template' });
            }
            if (!template) {
              // Template not found, return default
              return res.json({ 
                template: { 
                  protein: [], 
                  carbs: [], 
                  fat: [] 
                } 
              });
            }
            res.json({ 
              template: {
                protein: JSON.parse(template.protein || '[]'),
                carbs: JSON.parse(template.carbs || '[]'),
                fat: JSON.parse(template.fat || '[]')
              }
            });
          }
        );
      } else {
        // No template selected, return empty (will use defaults in frontend)
        return res.json({ 
          template: { 
            protein: [], 
            carbs: [], 
            fat: [] 
          } 
        });
      }
    }
  );
});

// Admin routes - Menu Templates
app.get('/admin/menu-templates', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    'SELECT id, name, created_at, updated_at FROM menu_templates ORDER BY name',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching menu templates:', err);
        // If table doesn't exist, return empty array
        if (err.message && err.message.includes('no such table')) {
          return res.json({ templates: [] });
        }
        return res.status(500).json({ error: 'Failed to fetch menu templates' });
      }
      res.json({ templates: rows || [] });
    }
  );
});

app.get('/admin/menu-templates/:id', authenticateToken, requireAdmin, (req, res) => {
  const templateId = parseInt(req.params.id);
  db.get(
    'SELECT id, name, protein, carbs, fat FROM menu_templates WHERE id = ?',
    [templateId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch menu template' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Menu template not found' });
      }
      res.json({
        template: {
          id: row.id,
          name: row.name,
          protein: JSON.parse(row.protein || '[]'),
          carbs: JSON.parse(row.carbs || '[]'),
          fat: JSON.parse(row.fat || '[]')
        }
      });
    }
  );
});

app.post('/admin/menu-templates', authenticateToken, requireAdmin, (req, res) => {
  const { name, protein, carbs, fat } = req.body;
  
  if (!name || !Array.isArray(protein) || !Array.isArray(carbs) || !Array.isArray(fat)) {
    return res.status(400).json({ error: 'Name and food arrays required' });
  }

  db.run(
    'INSERT INTO menu_templates (name, protein, carbs, fat, updated_at) VALUES (?, ?, ?, ?, ?)',
    [name, JSON.stringify(protein), JSON.stringify(carbs), JSON.stringify(fat), new Date().toISOString()],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Template name already exists' });
        }
        return res.status(500).json({ error: 'Failed to create menu template' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put('/admin/menu-templates/:id', authenticateToken, requireAdmin, (req, res) => {
  const templateId = parseInt(req.params.id);
  const { name, protein, carbs, fat } = req.body;
  
  if (!name || !Array.isArray(protein) || !Array.isArray(carbs) || !Array.isArray(fat)) {
    return res.status(400).json({ error: 'Name and food arrays required' });
  }

  db.run(
    'UPDATE menu_templates SET name = ?, protein = ?, carbs = ?, fat = ?, updated_at = ? WHERE id = ?',
    [name, JSON.stringify(protein), JSON.stringify(carbs), JSON.stringify(fat), new Date().toISOString(), templateId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update menu template' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Menu template not found' });
      }
      res.json({ success: true });
    }
  );
});

app.delete('/admin/menu-templates/:id', authenticateToken, requireAdmin, (req, res) => {
  const templateId = parseInt(req.params.id);
  
  db.run(
    'DELETE FROM menu_templates WHERE id = ?',
    [templateId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete menu template' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Menu template not found' });
      }
      // Also clear menu_template_id from users who were using this template
      db.run(
        'UPDATE users SET menu_template_id = NULL WHERE menu_template_id = ?',
        [templateId]
      );
      res.json({ success: true });
    }
  );
});

// Set user's menu template
app.post('/admin/users/:id/menu-template', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { templateId } = req.body; // null for default, or template ID
  
  if (templateId === null || templateId === undefined) {
    // Set to default (null)
    db.run(
      'UPDATE users SET menu_template_id = NULL WHERE id = ?',
      [userId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update user menu template' });
        }
        res.json({ success: true });
      }
    );
  } else {
    // Verify template exists
    db.get(
      'SELECT id FROM menu_templates WHERE id = ?',
      [templateId],
      (err, template) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to verify template' });
        }
        if (!template) {
          return res.status(404).json({ error: 'Menu template not found' });
        }
        db.run(
          'UPDATE users SET menu_template_id = ? WHERE id = ?',
          [templateId, userId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update user menu template' });
            }
            res.json({ success: true });
          }
        );
      }
    );
  }
});

app.get('/admin/users/:id/menu-template', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  db.get(
    'SELECT menu_template_id FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error fetching user menu template:', err);
        // If column doesn't exist, return null (default)
        if (err.message && err.message.includes('no such column')) {
          return res.json({ templateId: null });
        }
        return res.status(500).json({ error: 'Failed to fetch user' });
      }
      res.json({ templateId: user?.menu_template_id || null });
    }
  );
});

// Sync routes - Workouts
app.get('/sync/workouts', authenticateToken, (req, res) => {
  db.all(
    'SELECT day_key, data, updated_at FROM workout_entries WHERE user_id = ?',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workouts' });
      }
      const entries = rows.map(row => ({
        dayKey: row.day_key,
        data: JSON.parse(row.data),
        updatedAt: row.updated_at,
      }));
      res.json({ entries });
    }
  );
});

app.post('/sync/workouts', authenticateToken, (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries must be an array' });
  }

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO workout_entries (user_id, day_key, data, updated_at) VALUES (?, ?, ?, ?)'
  );

  entries.forEach(entry => {
    stmt.run(
      [req.user.userId, entry.dayKey, JSON.stringify(entry.data), entry.updatedAt || new Date().toISOString()],
      (err) => {
        if (err) console.error('Error saving workout entry:', err);
      }
    );
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save workouts' });
    }
    res.json({ success: true });
  });
});

// Sync routes - Favorites
app.get('/sync/favorites', authenticateToken, (req, res) => {
  db.all(
    'SELECT category, item_id, item_data, updated_at FROM favorites WHERE user_id = ?',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch favorites' });
      }
      const favorites = rows.map(row => ({
        category: row.category,
        itemId: row.item_id,
        item: JSON.parse(row.item_data),
        updatedAt: row.updated_at,
      }));
      res.json({ favorites });
    }
  );
});

app.post('/sync/favorites', authenticateToken, (req, res) => {
  const { favorites } = req.body;
  if (!Array.isArray(favorites)) {
    return res.status(400).json({ error: 'Favorites must be an array' });
  }

  // Delete all existing favorites for this user
  db.run('DELETE FROM favorites WHERE user_id = ?', [req.user.userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update favorites' });
    }

    // Insert new favorites
    const stmt = db.prepare(
      'INSERT INTO favorites (user_id, category, item_id, item_data, updated_at) VALUES (?, ?, ?, ?, ?)'
    );

    favorites.forEach(fav => {
      stmt.run(
        [req.user.userId, fav.category, fav.itemId, JSON.stringify(fav.item), fav.updatedAt || new Date().toISOString()],
        (err) => {
          if (err) console.error('Error saving favorite:', err);
        }
      );
    });

    stmt.finalize((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save favorites' });
      }
      res.json({ success: true });
    });
  });
});

// Admin routes - User Management
app.get('/admin/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json({ users: rows });
  });
});

app.post('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'user';

    db.run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, hashedPassword, userRole],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create user' });
        }
        res.json({ user: { id: this.lastID, email, role: userRole } });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
  });
});

// Admin routes - Edit User Menu
app.get('/admin/users/:id/menu', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  db.all(
    'SELECT day_key, data, updated_at FROM menu_entries WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch menu' });
      }
      const entries = rows.map(row => ({
        dayKey: row.day_key,
        data: JSON.parse(row.data),
        updatedAt: row.updated_at,
      }));
      res.json({ entries });
    }
  );
});

app.post('/admin/users/:id/menu', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { entries } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries must be an array' });
  }

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO menu_entries (user_id, day_key, data, updated_at) VALUES (?, ?, ?, ?)'
  );

  entries.forEach(entry => {
    stmt.run(
      [userId, entry.dayKey, JSON.stringify(entry.data), entry.updatedAt || new Date().toISOString()],
      (err) => {
        if (err) console.error('Error saving menu entry:', err);
      }
    );
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save menu' });
    }
    res.json({ success: true });
  });
});

// Admin routes - Edit User Workouts
app.get('/admin/users/:id/workouts', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  db.all(
    'SELECT day_key, data, updated_at FROM workout_entries WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workouts' });
      }
      const entries = rows.map(row => ({
        dayKey: row.day_key,
        data: JSON.parse(row.data),
        updatedAt: row.updated_at,
      }));
      res.json({ entries });
    }
  );
});

app.post('/admin/users/:id/workouts', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { entries } = req.body;
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries must be an array' });
  }

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO workout_entries (user_id, day_key, data, updated_at) VALUES (?, ?, ?, ?)'
  );

  entries.forEach(entry => {
    stmt.run(
      [userId, entry.dayKey, JSON.stringify(entry.data), entry.updatedAt || new Date().toISOString()],
      (err) => {
        if (err) console.error('Error saving workout entry:', err);
      }
    );
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save workouts' });
    }
    res.json({ success: true });
  });
});

// User route - Get own allowances
app.get('/sync/allowances', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.get(
    'SELECT protein, carbs, fat, free_calories FROM user_allowances WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch allowances' });
      }
      if (!row) {
        // Return defaults if no allowances set
        return res.json({
          allowances: {
            protein: 5,
            carbs: 5,
            fat: 1,
            freeCalories: 200,
          },
        });
      }
      res.json({
        allowances: {
          protein: row.protein,
          carbs: row.carbs,
          fat: row.fat,
          freeCalories: row.free_calories,
        },
      });
    }
  );
});

// Admin routes - User Allowances (Daily Menu Limits)
app.get('/admin/users/:id/allowances', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  db.get(
    'SELECT protein, carbs, fat, free_calories FROM user_allowances WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch allowances' });
      }
      if (!row) {
        // Return defaults if no allowances set
        return res.json({
          allowances: {
            protein: 5,
            carbs: 5,
            fat: 1,
            freeCalories: 200,
          },
        });
      }
      res.json({
        allowances: {
          protein: row.protein,
          carbs: row.carbs,
          fat: row.fat,
          freeCalories: row.free_calories,
        },
      });
    }
  );
});

app.post('/admin/users/:id/allowances', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { protein, carbs, fat, freeCalories } = req.body;

  if (
    protein === undefined ||
    carbs === undefined ||
    fat === undefined ||
    freeCalories === undefined
  ) {
    return res.status(400).json({ error: 'All allowance values required' });
  }

  db.run(
    `INSERT INTO user_allowances (user_id, protein, carbs, fat, free_calories, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       protein = excluded.protein,
       carbs = excluded.carbs,
       fat = excluded.fat,
       free_calories = excluded.free_calories,
       updated_at = excluded.updated_at`,
    [userId, protein, carbs, fat, freeCalories, new Date().toISOString()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save allowances' });
      }
      res.json({ success: true });
    }
  );
});

// Admin routes - User Workout Schedule
app.get('/admin/users/:id/workout-schedule', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  db.get(
    'SELECT weekly_muscle, weekly_cardio, workout_routine, custom_exercises FROM user_workout_schedules WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch workout schedule' });
      }
      if (!row) {
        // Return defaults if no schedule set
        const defaultRoutine = {
          1: { name: 'Workout 1', exercises: {} },
        };
        return res.json({
          schedule: {
            weeklyMuscle: 4,
            weeklyCardio: 3,
            workoutRoutine: defaultRoutine,
            customExercises: {},
          },
        });
      }
      const workoutRoutine = JSON.parse(row.workout_routine);
      const weeklyMuscle = row.weekly_muscle || 4;
      
      // Ensure all workouts from 1 to weeklyMuscle exist
      for (let i = 1; i <= weeklyMuscle; i++) {
        if (!workoutRoutine[i]) {
          workoutRoutine[i] = { name: `Workout ${i}`, exercises: {} };
        } else {
          // Ensure workout has name and exercises
          if (!workoutRoutine[i].name) {
            workoutRoutine[i].name = `Workout ${i}`;
          }
          if (!workoutRoutine[i].exercises) {
            workoutRoutine[i].exercises = {};
          }
        }
      }
      
      res.json({
        schedule: {
          weeklyMuscle: row.weekly_muscle,
          weeklyCardio: row.weekly_cardio,
          workoutRoutine: workoutRoutine,
          customExercises: row.custom_exercises ? JSON.parse(row.custom_exercises) : {},
        },
      });
    }
  );
});

app.post('/admin/users/:id/workout-schedule', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { weeklyMuscle, weeklyCardio, workoutRoutine, customExercises } = req.body;

  if (
    weeklyMuscle === undefined ||
    weeklyCardio === undefined ||
    !workoutRoutine
  ) {
    return res.status(400).json({ error: 'All schedule values required' });
  }

  db.run(
    `INSERT INTO user_workout_schedules (user_id, weekly_muscle, weekly_cardio, workout_routine, custom_exercises, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       weekly_muscle = excluded.weekly_muscle,
       weekly_cardio = excluded.weekly_cardio,
       workout_routine = excluded.workout_routine,
       custom_exercises = excluded.custom_exercises,
       updated_at = excluded.updated_at`,
    [userId, weeklyMuscle, weeklyCardio, JSON.stringify(workoutRoutine), JSON.stringify(customExercises || {}), new Date().toISOString()],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save workout schedule' });
      }
      res.json({ success: true });
    }
  );
});

// User route - Get own workout schedule
app.get('/sync/workout-schedule', authenticateToken, (req, res) => {
  // Ensure we always send JSON
  res.setHeader('Content-Type', 'application/json');
  
  try {
    console.log('[GET /sync/workout-schedule] Request received, user:', req.user);
    const userId = req.user.userId || req.user.id;
    console.log('[GET /sync/workout-schedule] Using userId:', userId);
    db.get(
    'SELECT weekly_muscle, weekly_cardio, workout_routine, custom_exercises FROM user_workout_schedules WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        console.error('[GET /sync/workout-schedule] Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch workout schedule' });
      }
      if (!row) {
        // Return defaults if no schedule set
        console.log('[GET /sync/workout-schedule] No schedule found, returning defaults');
        const defaultRoutine = {};
        const weeklyMuscle = 4;
        for (let i = 1; i <= weeklyMuscle; i++) {
          defaultRoutine[i] = { name: `Workout ${i}`, exercises: {} };
        }
        const response = {
          schedule: {
            weeklyMuscle: 4,
            weeklyCardio: 3,
            workoutRoutine: defaultRoutine,
            customExercises: {},
          },
        };
        console.log('[GET /sync/workout-schedule] Sending response:', JSON.stringify(response));
        res.setHeader('Content-Type', 'application/json');
        return res.json(response);
      }
      let workoutRoutine;
      try {
        workoutRoutine = JSON.parse(row.workout_routine);
      } catch (parseErr) {
        console.error('[GET /sync/workout-schedule] Error parsing workout_routine:', parseErr);
        workoutRoutine = {};
      }
      const weeklyMuscle = row.weekly_muscle || 4;
      
      // Ensure all workouts from 1 to weeklyMuscle exist
      for (let i = 1; i <= weeklyMuscle; i++) {
        if (!workoutRoutine[i]) {
          workoutRoutine[i] = { name: `Workout ${i}`, exercises: {} };
        } else {
          // Ensure workout has name and exercises
          if (!workoutRoutine[i].name) {
            workoutRoutine[i].name = `Workout ${i}`;
          }
          if (!workoutRoutine[i].exercises) {
            workoutRoutine[i].exercises = {};
          }
        }
      }
      
      let customExercises = {};
      try {
        customExercises = row.custom_exercises ? JSON.parse(row.custom_exercises) : {};
      } catch (parseErr) {
        console.error('[GET /sync/workout-schedule] Error parsing custom_exercises:', parseErr);
        customExercises = {};
      }
      
      const response = {
        schedule: {
          weeklyMuscle: row.weekly_muscle,
          weeklyCardio: row.weekly_cardio,
          workoutRoutine: workoutRoutine,
          customExercises: customExercises,
        },
      };
      console.log('[GET /sync/workout-schedule] Sending response:', JSON.stringify(response));
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    }
  );
  } catch (err) {
    console.error('[GET /sync/workout-schedule] Unhandled error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Test route to verify server is working
app.get('/test-workout-schedule-route', (req, res) => {
  console.log('[TEST] /test-workout-schedule-route called');
  res.json({ message: 'Test route works!', path: '/sync/workout-schedule exists' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Menu template routes registered:');
  console.log('  GET /admin/menu-templates');
  console.log('  GET /admin/menu-templates/:id');
  console.log('  POST /admin/menu-templates');
  console.log('  PUT /admin/menu-templates/:id');
  console.log('  DELETE /admin/menu-templates/:id');
  console.log('  GET /admin/users/:id/menu-template');
  console.log('  POST /admin/users/:id/menu-template');
  console.log('Workout schedule routes registered:');
  console.log('  GET /sync/workout-schedule');
  console.log('  POST /sync/workout-schedule');
});

