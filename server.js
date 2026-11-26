require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  // replace with real check (e.g. array/DB lookup)
  if (email && password && password.length >= 6) return res.json({ token: 'demo-token', name: 'Gretta Miller' });
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, contents } = req.body;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] } }) });
    const data = await r.json();
    res.json({ reply: data?.candidates?.[0]?.content?.parts?.[0]?.text || '' });
  } catch (e) { res.status(500).json({ error: 'AI service failed' }); }
});

app.listen(3000);