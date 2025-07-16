const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json()); // Only accept JSON
// app.use(express.urlencoded({ extended: true })); // Remove this to only accept JSON

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'arpit',
  port: 5432,
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  console.log('Received:', { name, email, phone, message });
  try {
    await pool.query(
      'INSERT INTO "Test" ("Name", "Email", "Phone Number", "Message") VALUES ($1, $2, $3, $4)',
      [name, email, phone, message]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/get-in-touch', async (req, res) => {
  let { name, email, phone, services, message } = req.body;
  console.log('Received:', { name, email, phone, services, message });
  // Ensure all are arrays for Postgres array columns
  if (!Array.isArray(services)) services = services ? [services] : [];
  try {
    await pool.query(
      'INSERT INTO "GetInTouch" ("Name", "Email", "Phone Number", "Services Interested In", "Message") VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone, services.join(', '), message]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
}); 