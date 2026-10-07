const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile('main.html', { root: __dirname });
});

// MySQL Database Connection Configuration
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: Number(process.env.DB_PORT || 3306),
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'food_ordering'
});

db.connect(err => {
  if (err) console.error('Database connection failed:', err);
  else console.log('Connected to MySQL Database!');
});

// GET: Fetch all orders from MySQL
app.get('/api/orders', (req, res) => {
  db.query('SELECT * FROM orders ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch orders' });
    res.json(results);
  });
});

// POST: Save new order into MySQL
app.post('/api/orders', (req, res) => {
  const { no, customer, food, qty, total, payment, stage } = req.body;
  const sql = 'INSERT INTO orders (no, customer, food, qty, total, payment, stage) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  db.query(sql, [no, customer, food, qty, total, payment, stage], (err, result) => {
    if (err) {
      console.error(' SQL Error on POST:', err.message); 
      return res.status(500).json({ error: 'Failed to save order', details: err.message });
    }
    res.status(201).json({ message: 'Order created', id: result.insertId });
  });
});

// PUT: Update order payment or stage in MySQL
app.put('/api/orders/:no', (req, res) => {
  const { payment, stage } = req.body;
  const sql = 'UPDATE orders SET payment = ?, stage = ? WHERE no = ?';
  
  db.query(sql, [payment, stage, req.params.no], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to update order' });
    res.json({ message: 'Order updated' });
  });
});

// DELETE: Clear all orders from MySQL
app.delete('/api/orders', (req, res) => {
  db.query('TRUNCATE TABLE orders', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to clear orders' });
    res.json({ message: 'Orders cleared' });
  });
});

  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));