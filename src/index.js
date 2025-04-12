require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3001;

const JWT_SECRET = 'your_jwt_secret_key';


// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(process.env.DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');


    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tasks TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // db.run('DROP TABLE IF EXISTS users')
    // db.run('DROP TABLE IF EXISTS tasks')
  }
});

// Test API route

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});


app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    console.log('db exists');

    res.json(rows);
  });
});

// app.post('/api/users', (req, res) => {
//   const { name, email, phone, address, password } = req.body;

//   // Validate required fields
//   if (!name || !email || !phone || !address) {
//     return res.status(400).json({ error: 'All fields (name, email, phone, address) are required' });
//   }


//   // Validate email format
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(email)) {
//     return res.status(400).json({ error: 'Invalid email format' });
//   }

//   const sql = `INSERT INTO users (name, email, phone, address) VALUES (?, ?, ?, ?)`;
//   db.run(sql, [name, email, phone, address], function (err) {
//     if (err) {
//       if (err.code === 'SQLITE_CONSTRAINT') {
//         return res.status(400).json({ error: 'Email already exists' });
//       }
//       return res.status(500).json({ error: err.message });
//     }
//     res.status(201).json({
//       id: this.lastID,
//       name,
//       email,
//       phone,
//       address,
//       message: 'User created successfully'
//     });
//   });
// });

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const sql = `SELECT * FROM users WHERE email = ?`;
  db.get(sql, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    // Check if user exists
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // Debugging step: Log the user object to check the password field
    console.log('Fetched user:', user);

    try {
      // Check if user.password exists before comparing
      if (!user.password) {
        return res.status(400).json({ error: 'No password found for this user' });
      }

      // Compare the entered password with the hashed password stored in the database
      const match = await bcrypt.compare(password, user.password);

      // If the password doesn't match, send an error response
      if (!match) return res.status(401).json({ error: 'Invalid email or password' });

      // Generate JWT token if password matches
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '1d', // Token expires in 1 day
      });

      // Respond with the token and a success message
      res.json({ token, user, message: 'Login successful' });
    } catch (error) {
      // Catch any error during password comparison or token generation
      console.error('Error during login process:', error);
      res.status(500).json({ error: 'Something went wrong during login' });
    }
  });
});

app.post('/api/users', async (req, res) => {
  const { name, email, phone, address, password } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !address || !password) {
    return res.status(400).json({ error: 'All fields (name, email, phone, address, password) are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const sql = `INSERT INTO users (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [name, email, phone, address, hashedPassword], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        name,
        password,
        email,
        phone,
        address,
        message: 'User created successfully',
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to hash password' });
  }
});

app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// POST /api/users/google-auth
app.post('/api/users/google-auth', (req, res) => {
  const { uid, name, email } = req.body;

  const checkByUID = `SELECT * FROM users WHERE uid = ?`;
  db.get(checkByUID, [uid], (err, rowByUID) => {
    if (err) return res.status(500).json({ error: err.message });

    if (rowByUID) {
      // User with UID exists – update info
      const updateQuery = `UPDATE users SET name = ?, email = ? WHERE uid = ?`;
      db.run(updateQuery, [name, email, uid], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const token = jwt.sign({ id: rowByUID.id, email: rowByUID.email }, JWT_SECRET, {
          expiresIn: '1d',
        });

        res.json({
          message: 'Login successful',
          token,
          user: { id: rowByUID.id, uid: rowByUID.uid, name, email },
        });
      });
    } else {
      // No UID found, check by email
      const checkByEmail = `SELECT * FROM users WHERE email = ?`;
      db.get(checkByEmail, [email], (err, rowByEmail) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rowByEmail) {
          // Email exists – update UID
          const updateUIDQuery = `UPDATE users SET uid = ?, name = ? WHERE email = ?`;
          db.run(updateUIDQuery, [uid, name, email], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const token = jwt.sign({ id: rowByEmail.id, email }, JWT_SECRET, {
              expiresIn: '1d',
            });

            res.json({
              message: 'Login successful',
              token,
              user: { id: rowByEmail.id, uid, name, email },
            });
          });
        } else {
          // New user – insert
          const insertQuery = `INSERT INTO users (uid, name, email) VALUES (?, ?, ?)`;
          db.run(insertQuery, [uid, name, email], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const insertedId = this.lastID;

            const token = jwt.sign({ id: insertedId, email }, JWT_SECRET, {
              expiresIn: '1d',
            });

            res.json({
              message: 'Login successful',
              token,
              user: { id: insertedId, uid, name, email },
            });
          });
        }
      });
    }
  });
});



app.post('/api/tasks', (req, res) => {
  const { user_id, tasks, status } = req.body;

  // Validate required fields
  if (!user_id || !tasks || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if user exists
  const checkUserSql = `SELECT id FROM users WHERE id = ?`;
  db.get(checkUserSql, [user_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error while checking user' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    // User exists, proceed to insert task
    const insertTaskSql = `INSERT INTO tasks (user_id, tasks, status) VALUES (?, ?, ?)`;
    db.run(insertTaskSql, [user_id, tasks, status], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Task constraint error' });
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        user_id,
        tasks,
        status,
        message: 'Task created successfully'
      });
    });
  });
});

app.get('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }
    res.json(row);
  });
});

app.get('/api/tasks/users/:id', (req, res) => {
  const id = req.params.id;
  db.all('SELECT * FROM tasks WHERE user_id = ?', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (rows.length === 0) {
      res.status(404).json({ error: 'No tasks found for this user' });
      return;
    }
    res.json(rows); // Return an array of tasks
  });
});


// delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM tasks WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  });
});

app.patch('/api/tasks/:id/complete', (req, res) => {
  const { id } = req.params;

  const sql = `UPDATE tasks SET status = 'completed' WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found or already completed' });
    }

    res.status(200).json({ message: 'Task marked as completed' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 