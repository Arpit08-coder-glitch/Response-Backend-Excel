const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'excel_data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

function loadSheet(file, sheetName) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) return [];

  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[sheetName || wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws);
}

function saveSheet(file, data, sheetName = 'Sheet1') {
  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  xlsx.writeFile(wb, path.join(dataDir, file));
}

app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  const spamList = loadSheet('Spam.xlsx');
  if (spamList.some(e => e.Email === email)) return res.json({ success: true });

  const feedbacks = loadSheet('Feedback.xlsx');
  feedbacks.push({ Name: name, Email: email, 'Phone Number': phone, Message: message });
  saveSheet('Feedback.xlsx', feedbacks);
  res.json({ success: true });
});

app.post('/api/get-in-touch', (req, res) => {
  let { name, email, phone, services, message } = req.body;
  services = Array.isArray(services) ? services.join(', ') : services;

  const spamList = loadSheet('Spam.xlsx');
  if (spamList.some(e => e.Email === email)) return res.json({ success: true });

  const entries = loadSheet('GetInTouch.xlsx');
  entries.push({
    Name: name,
    Email: email,
    'Phone Number': phone,
    'Services Interested In': services,
    Message: message
  });
  saveSheet('GetInTouch.xlsx', entries);
  res.json({ success: true });
});

app.post('/api/faq-question', (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ success: false, error: 'Question is required' });

  const questions = loadSheet('FAQQuestions.xlsx');
  questions.push({ question });
  saveSheet('FAQQuestions.xlsx', questions);
  res.json({ success: true });
});

app.post('/api/track-visit', (req, res) => {
  console.log('Received full request body:', JSON.stringify(req.body, null, 2));
  const { user_id, page } = req.body;
  if (!user_id || !page) return res.status(400).json({ success: false, error: 'Invalid input' });

  const coinsData = loadSheet('QuantaCoins.xlsx');
  const history = loadSheet('QuantaCoinHistory.xlsx');

  let user = coinsData.find(r => r.user_id === user_id);
  if (user) {
    user.total_visits++;
    user.coins++;
    user.last_visit = new Date().toISOString();
  } else {
    user = { user_id, total_visits: 1, coins: 1, last_visit: new Date().toISOString() };
    coinsData.push(user);
  }
  history.push({ user_id, source: 'page_visit', page });

  saveSheet('QuantaCoins.xlsx', coinsData);
  saveSheet('QuantaCoinHistory.xlsx', history);

  res.json({ success: true, total_visits: user.total_visits, coins: user.coins });
});

app.get('/api/coin-balance/:user_id', (req, res) => {
  const { user_id } = req.params;
  const coinsData = loadSheet('QuantaCoins.xlsx');
  const history = loadSheet('QuantaCoinHistory.xlsx').filter(r => r.user_id === user_id);

  const user = coinsData.find(r => r.user_id === user_id);
  if (!user) {
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

  const breakdown = {
    page_visits: history.filter(r => r.source === 'page_visit').length,
    form_submissions: history.filter(r => r.source === 'form_submission').length,
    faq_questions: history.filter(r => r.source === 'faq_question').length,
    faq_bonus: history.filter(r => r.source === 'faq_bonus').length,
  };

  res.json({ total_visits: user.total_visits, coins: user.coins, breakdown });
});

app.post('/api/award-coins', (req, res) => {
  const { user_id, coins, source } = req.body;
  if (!user_id || !coins) return res.status(400).json({ success: false, error: 'user_id and coins required' });

  const coinsData = loadSheet('QuantaCoins.xlsx');
  const history = loadSheet('QuantaCoinHistory.xlsx');
  const now = new Date().toISOString();

  let user = coinsData.find(r => r.user_id === user_id);
  if (user) {
    user.coins += coins;
    user.last_visit = now;
  } else {
    user = { user_id, total_visits: 0, coins, last_visit: now };
    coinsData.push(user);
  }

  for (let i = 0; i < coins; i++) {
    history.push({ user_id, source: source || 'form_submission' });
  }

  saveSheet('QuantaCoins.xlsx', coinsData);
  saveSheet('QuantaCoinHistory.xlsx', history);
  res.json({ success: true });
});

app.post('/api/cookie-accept', (req, res) => {
  const { user_id, timestamp, latitude, longitude } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const data = loadSheet('CookieConsent.xlsx');

  data.push({
    user_id,
    ip_address: ip,
    accepted_at: timestamp || new Date().toISOString(),
    latitude,
    longitude
  });

  saveSheet('CookieConsent.xlsx', data);
  res.json({ success: true });
});

app.listen(5005, () => {
  console.log('Server is running at http://localhost:5005');
});
