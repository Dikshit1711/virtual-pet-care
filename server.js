require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const nodemailer= require('nodemailer');
const cron     = require('node-cron');
const path     = require('path');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual_pet_care')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(e  => console.error('❌ MongoDB:', e.message));

// ─── Schemas ───────────────────────────────────────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  phone:     { type: String, default: '' },
  createdAt: { type: Date,   default: Date.now }
}));

const Pet = mongoose.model('Pet', new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  type:    { type: String, required: true },
  breed:   { type: String, default: '' },
  dob:     { type: String, default: '' },
  reminders: [{
    label: String, time: String,
    days: [String], enabled: { type: Boolean, default: true }
  }],
  createdAt: { type: Date, default: Date.now }
}));

// ─── Standalone Reminder collection (visible in MongoDB Compass) ───────────────
const Reminder = mongoose.model('Reminder', new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  petId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Pet',  required: true },
  petName:   { type: String, required: true },
  petType:   { type: String, default: '' },
  label:     { type: String, required: true },
  time:      { type: String, required: true },
  days:      { type: [String], default: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  enabled:   { type: Boolean, default: true },
  lastFired: { type: Date,    default: null },
  createdAt: { type: Date,    default: Date.now }
}));

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'petsecret'); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// ─── Email (non-blocking) ─────────────────────────────────────────────────────
function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
    return console.log(`📧 [SKIPPED] ${subject}`);
  nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  }).sendMail({ from: `PawCare 🐾 <${process.env.EMAIL_USER}>`, to, subject, html })
    .then(() => console.log(`📧 Email → ${to}`))
    .catch(e => console.log(`📧 Email failed: ${e.message}`));
}

// ─── SMS via Twilio Messaging Service (non-blocking) ─────────────────────────
function sendSMS(phone, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !phone)
    return console.log(`📱 [SKIPPED] ${message}`);
  const params = process.env.TWILIO_MESSAGING_SERVICE_SID
    ? { body: message, messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, to: phone }
    : { body: message, from: process.env.TWILIO_PHONE_NUMBER, to: phone };
  try {
    require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      .messages.create(params)
      .then(() => console.log(`📱 SMS → ${phone}`))
      .catch(e => console.log(`📱 SMS failed: ${e.message}`));
  } catch(e) { console.log(`📱 Twilio error: ${e.message}`); }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, phone: phone || '' });
    const token = jwt.sign({ id: user._id, name, email }, process.env.JWT_SECRET || 'petsecret', { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name, email, phone: user.phone } });
    sendEmail(email, '🐾 Welcome to PawCare!', `<div style="font-family:sans-serif;padding:24px;background:#fff8f0;border-radius:12px"><h2 style="color:#6366f1">Hi ${name}! 🐾</h2><p>Your PawCare account is ready. Register your pets and set daily reminders.</p></div>`);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id, name: user.name, email }, process.env.JWT_SECRET || 'petsecret', { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, email, phone: user.phone } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── PETS ─────────────────────────────────────────────────────────────────────
app.get('/api/pets', auth, async (req, res) => {
  try { res.json(await Pet.find({ userId: req.user.id }).sort({ createdAt: -1 })); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pets', auth, async (req, res) => {
  try {
    const { name, type, breed, dob } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type required' });
    const pet = await Pet.create({ userId: req.user.id, name, type, breed: breed||'', dob: dob||'', reminders: [] });
    res.json(pet);
    const user = await User.findById(req.user.id);
    sendEmail(user.email, `🐾 ${name} registered!`, `<div style="font-family:sans-serif;padding:24px;background:#fff8f0;border-radius:12px"><h2 style="color:#6366f1">${name} is registered! 🎉</h2><p>Type: ${type} | Breed: ${breed||'N/A'}</p></div>`);
    sendSMS(user.phone, `🐾 PawCare: ${name} (${type}) has been registered!`);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pets/:id', auth, async (req, res) => {
  try {
    await Pet.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    await Reminder.deleteMany({ petId: req.params.id, userId: req.user.id });
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── REMINDERS (saves to BOTH Pet subdoc AND standalone Reminder collection) ──
app.get('/api/reminders', auth, async (req, res) => {
  try { res.json(await Reminder.find({ userId: req.user.id }).sort({ createdAt: -1 })); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pets/:id/reminders', auth, async (req, res) => {
  try {
    const { label, time, days } = req.body;
    const reminderDays = days || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const pet = await Pet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    // 1️⃣ Save inside Pet subdoc (existing)
    pet.reminders.push({ label, time, days: reminderDays, enabled: true });
    await pet.save();
    // 2️⃣ Save as standalone document in Reminder collection (shows in Compass)
    await Reminder.create({
      userId: req.user.id, petId: pet._id,
      petName: pet.name, petType: pet.type,
      label, time, days: reminderDays, enabled: true
    });
    console.log(`✅ Reminder saved to MongoDB: ${pet.name} - ${label} at ${time}`);
    res.json(pet);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pets/:id/reminders/:rid', auth, async (req, res) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    pet.reminders = pet.reminders.filter(r => r._id.toString() !== req.params.rid);
    await pet.save();
    await Reminder.deleteOne({ _id: req.params.rid });
    await Reminder.deleteOne({ petId: req.params.id, label: req.body.label });
    res.json(pet);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reminders/:rid/toggle', auth, async (req, res) => {
  try {
    const r = await Reminder.findOne({ _id: req.params.rid, userId: req.user.id });
    if (!r) return res.status(404).json({ error: 'Reminder not found' });
    r.enabled = !r.enabled;
    await r.save();
    res.json(r);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── TEST NOTIFICATION ────────────────────────────────────────────────────────
app.post('/api/notify/test', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Test notification sent to your email & phone!' });
    sendEmail(user.email, '🔔 PawCare Test Notification', `<div style="font-family:sans-serif;padding:24px;background:#fff8f0;border-radius:12px"><h3 style="color:#6366f1">✅ Notifications working!</h3><p>Hi ${user.name}, your PawCare reminders will be sent at the scheduled times.</p></div>`);
    sendSMS(user.phone, `🐾 PawCare: Hi ${user.name}! Your notifications are working perfectly.`);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── CRON: Fire reminders every minute ────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const day  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
  try {
    const reminders = await Reminder.find({ enabled: true, time });
    for (const r of reminders) {
      if (!r.days?.includes(day)) continue;
      const user = await User.findById(r.userId);
      if (!user) continue;
      const msg = `🐾 PawCare Reminder for ${r.petName}: "${r.label}" at ${r.time}`;
      sendEmail(user.email, `⏰ ${r.label} — ${r.petName}`, `<div style="font-family:sans-serif;padding:24px;background:#fff8f0;border-radius:12px"><h2 style="color:#6366f1">⏰ ${r.label}</h2><p>Time to take care of <b>${r.petName}</b> (${r.petType})!</p><p style="color:#888">Scheduled: ${r.time} every ${r.days.join(', ')}</p></div>`);
      sendSMS(user.phone, msg);
      await Reminder.updateOne({ _id: r._id }, { lastFired: new Date() });
      console.log(`🔔 Reminder fired: ${r.petName} - ${r.label}`);
    }
  } catch(e) { console.log('Cron error:', e.message); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
