require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = process.env.PORT || 3001;



// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(process.env.DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');

    // Create customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);



    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);


    // Create loans table
    db.run(`CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      gold_items TEXT NOT NULL,
      amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
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


    // Create payments table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_type TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    )`);
  }
});

// Test API route

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Customer APIs

app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
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


app.get('/api/customers/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(row);
  });
});


app.post('/api/customers', (req, res) => {
  const { name, email, phone, address } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !address) {
    return res.status(400).json({ error: 'All fields (name, email, phone, address) are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const sql = `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`;
  db.run(sql, [name, email, phone, address], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      email,
      phone,
      address,
      message: 'Customer created successfully'
    });
  });
});

app.post('/api/users', (req, res) => {
  const { name, email, phone, address } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !address) {
    return res.status(400).json({ error: 'All fields (name, email, phone, address) are required' });
  }

  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const sql = `INSERT INTO users (name, email, phone, address) VALUES (?, ?, ?, ?)`;
  db.run(sql, [name, email, phone, address], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      email,
      phone,
      address,
      message: 'User created successfully'
    });
  });
});

// Loan APIs

app.get('/api/loans', (req, res) => {
  db.all('SELECT * FROM loans', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
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

app.post('/api/loans', (req, res) => {
  const { customer_id, gold_items, amount, interest_rate, status } = req.body;

  // Validate required fields
  if (!customer_id || !gold_items || !amount || !interest_rate || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const sql = `INSERT INTO loans (customer_id, gold_items, amount, interest_rate, status) VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [customer_id, gold_items, amount, interest_rate, status], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Loan already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      customer_id,
      gold_items,
      amount,
      interest_rate,
      status,
      message: 'Loan created successfully'
    });
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

app.get('/api/loans/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM loans WHERE id = ?', [id], (err, row) => {
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



// Payment APIs
app.get('/api/payments', (req, res) => {
  db.all('SELECT * FROM payments', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});


app.get('/api/payments/loan/:loanId', (req, res) => {
  const loanId = req.params.loanId;
  db.all('SELECT * FROM payments WHERE loan_id = ?', [loanId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
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