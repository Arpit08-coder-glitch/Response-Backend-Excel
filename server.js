const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
const pool = new Pool({
  user: 'user_it',
  host: '45.251.14.68',
  database: 'DEV-BETA',
  password: 'Qawsed*&^%',
  port: 5432,
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  console.log('Received:', { name, email, phone, message });
  try {
    // Check if email is in spam
    const spamCheck = await pool.query('SELECT 1 FROM response."Spam" WHERE "Email" = $1', [email]);
    if (spamCheck.rowCount > 0) {
      return res.status(200).json({ success: true });
    }
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
    // Check if email is in spam
    const spamCheck = await pool.query('SELECT 1 FROM response."Spam" WHERE "Email" = $1', [email]);
    if (spamCheck.rowCount > 0) {
      return res.status(200).json({ success: true });
    }
    await pool.query(
      'INSERT INTO response."GetInTouch" ("Name", "Email", "Phone Number", "Services Interested In", "Message") VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone, services.join(', '), message]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/api/faq-question', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ success: false, error: 'Question is required' });
  }
  try {
    await pool.query(
      'INSERT INTO response."FAQQuestions" (question) VALUES ($1)',
      [question]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/api/track-visit', async (req, res) => {
  const { user_id, page } = req.body;
  if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
  if (!page || typeof page !== 'string' || page.trim() === '') {
    return res.status(400).json({ success: false, error: 'page required' });
  }
  try {
    // Upsert user record
    const result = await pool.query(
      `INSERT INTO response."QuantaCoins" (user_id, total_visits, coins, last_visit)
       VALUES ($1, 1, 1, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         total_visits = response."QuantaCoins".total_visits + 1,
         coins = response."QuantaCoins".coins + 1,
         last_visit = NOW()
       RETURNING total_visits, coins;`,
      [user_id]
    );
    // Insert into history
    await pool.query(
      `INSERT INTO response."QuantaCoinHistory" (user_id, source, page)
       VALUES ($1, 'page_visit', $2)`,
      [user_id, page]
    );
    res.json({ success: true, ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/coin-balance/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT total_visits, coins FROM response."QuantaCoins" WHERE user_id = $1',
      [user_id]
    );
    const breakdownResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE source = 'page_visit') AS page_visits,
         COUNT(*) FILTER (WHERE source = 'form_submission') AS form_submissions,
         COUNT(*) FILTER (WHERE source = 'faq_question') AS faq_questions,
         COUNT(*) FILTER (WHERE source = 'faq_bonus') AS faq_bonus
       FROM response."QuantaCoinHistory"
       WHERE user_id = $1`,
      [user_id]
    );
    if (result.rows.length === 0) {
      return res.json({
        total_visits: 0,
        coins: 0,
        breakdown: {
          page_visits: 0,
          form_submissions: 0,
          faq_questions: 0,
          faq_bonus: 0
        }
      });
    }
    res.json({
      ...result.rows[0],
      breakdown: breakdownResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/api/award-coins', async (req, res) => {
  const { user_id, coins, source } = req.body;
  if (!user_id || !coins) return res.status(400).json({ success: false, error: 'user_id and coins required' });
  try {
    await pool.query(
      `INSERT INTO response."QuantaCoins" (user_id, total_visits, coins, last_visit)
       VALUES ($1, 0, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET coins = response."QuantaCoins".coins + $2, last_visit = NOW()`,
      [user_id, coins]
    );
    // Insert into history (one row per coin)
    for (let i = 0; i < coins; i++) {
      await pool.query(
        `INSERT INTO response."QuantaCoinHistory" (user_id, source)
         VALUES ($1, $2)`,
        [user_id, source || 'form_submission']
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/api/cookie-accept', async (req, res) => {
  const { user_id, timestamp, latitude, longitude } = req.body;

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  try {
    await pool.query(
      `INSERT INTO response."CookieConsent" (user_id, ip_address, accepted_at, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, ip, timestamp || new Date(), latitude, longitude]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Cookie accept error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5005, () => {
  console.log('Server is running on http://localhost:5005');
}); 