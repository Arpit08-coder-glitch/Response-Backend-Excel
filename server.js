const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json()); // Only accept JSON
// app.use(express.urlencoded({ extended: true })); // Remove this to only accept JSON

const pool = new Pool({
  user: 'user_it',
  host: '192.168.1.91',
  database: 'DEV-BETA',
  password: 'Qawsed*&^%',
  port: 5432,
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  console.log('Received:', { name, email, phone, message });
  try {
    await pool.query(
      'INSERT INTO response."Feedback" ("Name", "Email", "Phone Number", "Message") VALUES ($1, $2, $3, $4)',
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
      'INSERT INTO response."GetInTouch" ("Name", "Email", "Phone Number", "Services Interested In", "Message") VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone, services.join(', '), message]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5005, () => {
  console.log('Server run on http://localhost:5005');
}); 