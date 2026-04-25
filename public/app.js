// ── Config & State ─────────────────────────────────────────────────────────
const API = 'http://localhost:3000';
let token       = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allPets     = [];
let allReminders= [];
let bookings    = JSON.parse(localStorage.getItem('petBookings') || '[]');
let selectedVet = null;

const EMOJI = { Dog:'🐶', Cat:'🐱', Rabbit:'🐰', Bird:'🐦', Fish:'🐟', Other:'🐾' };
const VETS  = [
  {id:1,name:'PetCare Animal Hospital',icon:'🏥',specialty:'General',city:'Delhi',address:'12 MG Road, Connaught Place',phone:'+91-11-2345-6789',rating:4.8,reviews:312,fee:'₹500',distance:'0.8 km',open:true,hours:'9AM–8PM'},
  {id:2,name:'Happy Paws Clinic',icon:'🐾',specialty:'General',city:'Delhi',address:'45 Lajpat Nagar Market',phone:'+91-11-4567-8901',rating:4.6,reviews:198,fee:'₹400',distance:'1.2 km',open:true,hours:'10AM–7PM'},
  {id:3,name:'VetSurge Surgical Centre',icon:'💉',specialty:'Surgery',city:'Delhi',address:'78 Saket District Centre',phone:'+91-11-5678-9012',rating:4.9,reviews:421,fee:'₹800',distance:'2.1 km',open:true,hours:'8AM–9PM'},
  {id:4,name:'SmilePaws Dental Clinic',icon:'🦷',specialty:'Dental',city:'Noida',address:'22 Sector 18, Noida',phone:'+91-120-234-5678',rating:4.7,reviews:156,fee:'₹600',distance:'3.4 km',open:false,hours:'9AM–6PM'},
  {id:5,name:'24x7 Pet Emergency',icon:'🚑',specialty:'Emergency',city:'Delhi',address:'1 Ring Road, Dhaula Kuan',phone:'+91-11-6789-0123',rating:4.5,reviews:289,fee:'₹1000',distance:'1.8 km',open:true,hours:'Open 24hrs'},
  {id:6,name:'Green Leaf Vet Clinic',icon:'🌿',specialty:'General',city:'Gurgaon',address:'33 DLF Phase 2',phone:'+91-124-345-6789',rating:4.4,reviews:134,fee:'₹450',distance:'4.2 km',open:true,hours:'9AM–7PM'},
];

// ── Init ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) showApp();
  else showPage('authPage');
  document.querySelectorAll('.day').forEach(d => d.addEventListener('click', () => d.classList.toggle('active')));
  setGreeting();
});

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('dashGreeting');
  if (el) el.textContent = `${g}! Here's your pet care overview.`;
}

// ── Page / Section Routing ──────────────────────────────────────────────────
function showPage(id) {
  // Force hide ALL pages first
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  // Show only the target
  const target = document.getElementById(id);
  target.classList.add('active');
  target.style.display = id === 'appPage' ? 'flex' : 'block';
}

function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const match = document.querySelector(`.sb-btn[data-section="${id}"]`);
    if (match) match.classList.add('active');
  }
  const titles = {dashboard:'Dashboard',myPets:'My Pets',addPet:'Add Pet',reminders:'Reminders',booking:'Book Vet'};
  const el = document.getElementById('topbarTitle');
  if (el) el.textContent = titles[id] || 'PawCare';
  closeSidebar();
  if (id === 'dashboard') loadDashboard();
  if (id === 'myPets') renderMyPets();
  if (id === 'reminders') { loadReminderPetSelect(); renderRemindersList(); }
  if (id === 'booking') { renderVetGrid(); renderMyBookings(); updateBookingStats(); }
}

function showApp() {
  showPage('appPage');
  const name = currentUser.name;
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('topbarUser').textContent  = name.split(' ')[0];
  document.getElementById('heroName').textContent    = name.split(' ')[0];
  loadDashboard();
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sbOverlay').classList.add('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sbOverlay').classList.remove('show'); }

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, ms = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

// ── API Helper ───────────────────────────────────────────────────────────────
async function api(method, endpoint, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  };
  if (body) opts.body = JSON.stringify(body);
  let res;
  try { res = await fetch(API + endpoint, opts); }
  catch { throw new Error('Cannot connect to server. Make sure npm run dev is running.'); }
  let data;
  try { data = await res.json(); }
  catch { throw new Error('Server returned an invalid response.'); }
  if (res.status === 401) {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    token = null; currentUser = null;
    showPage('authPage');
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ── Auth Tab ────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.atab').forEach((b, i) => b.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='register')));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

// ── Login ────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  document.getElementById('loginError').textContent = '';
  btn.disabled = true; btn.innerHTML = '<span>Signing in…</span>';
  try {
    const data = await api('POST', '/api/login', { email, password });
    token = data.token; currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    toast('👋 Welcome back, ' + currentUser.name + '!');
  } catch(err) {
    document.getElementById('loginError').textContent = err.message;
  } finally {
    btn.disabled = false; btn.innerHTML = '<span>Sign In</span><i class="fa fa-arrow-right"></i>';
  }
}

// ── Register ─────────────────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const phone    = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  document.getElementById('registerError').textContent = '';
  if (password.length < 6) { document.getElementById('registerError').textContent = 'Password must be at least 6 characters'; return; }
  btn.disabled = true; btn.innerHTML = '<span>Creating…</span>';
  try {
    const data = await api('POST', '/api/register', { name, email, password, phone });
    token = data.token; currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    toast('🎉 Welcome to PawCare, ' + name + '!');
  } catch(err) {
    document.getElementById('registerError').textContent = err.message;
  } finally {
    btn.disabled = false; btn.innerHTML = '<span>Create Account</span><i class="fa fa-arrow-right"></i>';
  }
}

// ── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  token = null; currentUser = null; allPets = []; allReminders = [];
  localStorage.removeItem('token'); localStorage.removeItem('user');
  showPage('authPage');
  toast('👋 Logged out successfully!');
}

// ── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    allPets = await api('GET', '/api/pets');
    document.getElementById('statPets').textContent = allPets.length;
    renderRecentPets();
    renderDashVets();
    updateBookingStats();
    await loadMongoReminders();
  } catch(e) { toast('⚠️ ' + e.message); }
}

function renderRecentPets() {
  const c = document.getElementById('recentPets');
  const n = document.getElementById('recentNoPets');
  if (!c) return;
  c.innerHTML = '';
  if (allPets.length === 0) { n.style.display = 'block'; return; }
  n.style.display = 'none';
  allPets.slice(0, 4).forEach(pet => c.appendChild(buildPetCard(pet, false)));
}

// ── My Pets ──────────────────────────────────────────────────────────────────
function renderMyPets() {
  const list = document.getElementById('petsList');
  const none = document.getElementById('noPets');
  list.innerHTML = '';
  if (allPets.length === 0) { none.classList.remove('hidden'); return; }
  none.classList.add('hidden');
  allPets.forEach(pet => list.appendChild(buildPetCard(pet, true)));
}

function buildPetCard(pet, showDel) {
  const div = document.createElement('div');
  div.className = 'pet-card';
  div.innerHTML = `
    ${showDel ? `<button class="pet-del" onclick="deletePet('${pet._id}')"><i class="fa fa-times"></i></button>` : ''}
    <div class="pet-emoji">${EMOJI[pet.type]||'🐾'}</div>
    <h4>${pet.name}</h4>
    <p>${pet.breed || pet.type}</p>
    <span class="pet-badge">${pet.reminders?.length||0} reminder${pet.reminders?.length!==1?'s':''}</span>
    ${pet.dob ? `<p class="pet-dob">🎂 ${pet.dob}</p>` : ''}`;
  return div;
}

// ── Add Pet ───────────────────────────────────────────────────────────────────
async function handleAddPet(e) {
  e.preventDefault();
  const btn = document.getElementById('addPetBtn');
  const name  = document.getElementById('petName').value.trim();
  const type  = document.getElementById('petType').value;
  const breed = document.getElementById('petBreed').value.trim();
  const dob   = document.getElementById('petDob').value;
  document.getElementById('petError').textContent = '';
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';
  try {
    const pet = await api('POST', '/api/pets', { name, type, breed, dob });
    allPets.unshift(pet);
    e.target.reset();
    toast('🎉 ' + name + ' has been registered!');
    showSection('myPets', null);
    renderMyPets();
  } catch(err) {
    document.getElementById('petError').textContent = err.message;
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-heart"></i> Register Pet';
  }
}

async function deletePet(id) {
  if (!confirm('Remove this pet and all its reminders?')) return;
  try {
    await api('DELETE', `/api/pets/${id}`);
    allPets = allPets.filter(p => p._id !== id);
    allReminders = allReminders.filter(r => r.petId !== id);
    renderMyPets(); loadDashboard();
    toast('🗑️ Pet removed.');
  } catch(e) { toast('⚠️ ' + e.message); }
}

// ── Reminders ─────────────────────────────────────────────────────────────────
function loadReminderPetSelect() {
  const sel = document.getElementById('reminderPet');
  sel.innerHTML = '<option value="">Select your pet</option>';
  allPets.forEach(p => {
    const o = document.createElement('option');
    o.value = p._id; o.textContent = `${p.name} (${p.type})`; sel.appendChild(o);
  });
}

async function handleAddReminder(e) {
  e.preventDefault();
  const btn   = document.getElementById('addReminderBtn');
  const petId = document.getElementById('reminderPet').value;
  const label = document.getElementById('reminderLabel').value;
  const time  = document.getElementById('reminderTime').value;
  const days  = [...document.querySelectorAll('.day.active')].map(d => d.dataset.day);
  document.getElementById('reminderError').textContent = '';
  if (!petId) { document.getElementById('reminderError').textContent = 'Please select a pet'; return; }
  if (!days.length) { document.getElementById('reminderError').textContent = 'Select at least one day'; return; }
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';
  try {
    const updated = await api('POST', `/api/pets/${petId}/reminders`, { label, time, days });
    const idx = allPets.findIndex(p => p._id === petId);
    if (idx > -1) allPets[idx] = updated;
    e.target.reset();
    document.querySelectorAll('.day').forEach(d => d.classList.add('active'));
    toast('⏰ Reminder saved to MongoDB! ' + label + ' at ' + time);
    await loadMongoReminders();
    renderRemindersList();
    loadDashboard();
  } catch(err) {
    document.getElementById('reminderError').textContent = err.message;
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-bell"></i> Save Reminder';
  }
}

function renderRemindersList() {
  const list = document.getElementById('remindersList');
  const none = document.getElementById('noReminders');
  if (!list) return;
  list.innerHTML = '';
  let total = 0;
  allPets.forEach(pet => {
    (pet.reminders || []).forEach(r => {
      total++;
      const div = document.createElement('div');
      div.className = 'rem-item';
      div.innerHTML = `
        <div class="rem-info"><h4>${r.label}</h4><p>${EMOJI[pet.type]||'🐾'} ${pet.name} · ${r.days?.join(', ')||'Daily'}</p></div>
        <span class="rem-time">${r.time}</span>
        <button class="rem-del" onclick="deleteReminder('${pet._id}','${r._id}','${r.label}')"><i class="fa fa-trash"></i></button>`;
      list.appendChild(div);
    });
  });
  if (none) none.classList.toggle('hidden', total > 0);
}

async function deleteReminder(petId, rid, label) {
  try {
    const updated = await api('DELETE', `/api/pets/${petId}/reminders/${rid}`, { label });
    const idx = allPets.findIndex(p => p._id === petId);
    if (idx > -1) allPets[idx] = updated;
    await loadMongoReminders();
    renderRemindersList(); loadDashboard();
    toast('🗑️ Reminder removed.');
  } catch(e) { toast('⚠️ ' + e.message); }
}

// ── MongoDB Reminders Dashboard Table ─────────────────────────────────────────
async function loadMongoReminders() {
  try {
    allReminders = await api('GET', '/api/reminders');
    renderReminderTable();
    document.getElementById('statReminders').textContent = allReminders.length;
  } catch(e) { console.log('Reminders load:', e.message); }
}

function renderReminderTable() {
  const rows  = document.getElementById('dashReminderRows');
  const empty = document.getElementById('dashReminderEmpty');
  const count = document.getElementById('reminderMongoCount');
  if (!rows) return;
  if (count) count.textContent = allReminders.length;
  if (allReminders.length === 0) { rows.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');
  rows.innerHTML = allReminders.map(r => {
    const days  = r.days?.length === 7 ? 'Every day' : r.days?.join(', ') || '—';
    const fired = r.lastFired ? new Date(r.lastFired).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not yet';
    return `<div class="rmt-row">
      <div class="rmt-pet"><span>${EMOJI[r.petType]||'🐾'}</span>${r.petName}</div>
      <div class="rmt-label">${r.label}</div>
      <div><span class="rmt-time">${r.time}</span></div>
      <div class="rmt-days">${days}</div>
      <div class="rmt-fired">${fired}</div>
      <div class="tog-wrap">
        <label class="tog"><input type="checkbox" ${r.enabled?'checked':''} onchange="toggleReminder('${r._id}',this)"/><span class="tog-sl"></span></label>
        <span class="${r.enabled?'s-on':'s-off'}" id="st-${r._id}">${r.enabled?'On':'Off'}</span>
      </div>
    </div>`;
  }).join('');
}

async function toggleReminder(rid, cb) {
  try {
    const updated = await api('PUT', `/api/reminders/${rid}/toggle`);
    const idx = allReminders.findIndex(r => r._id === rid);
    if (idx > -1) allReminders[idx] = updated;
    const lbl = document.getElementById('st-' + rid);
    if (lbl) { lbl.textContent = updated.enabled ? 'On' : 'Off'; lbl.className = updated.enabled ? 's-on' : 's-off'; }
    toast(updated.enabled ? '🔔 Reminder enabled' : '🔕 Reminder disabled');
  } catch(e) { cb.checked = !cb.checked; toast('⚠️ ' + e.message); }
}

// ── Test Notification ─────────────────────────────────────────────────────────
async function testNotification() {
  toast('📤 Sending test notification…');
  try {
    const data = await api('POST', '/api/notify/test');
    toast('✅ ' + data.message);
  } catch(e) { toast('⚠️ ' + e.message); }
}

// ── VET BOOKING ───────────────────────────────────────────────────────────────
function renderVetGrid(list = VETS) {
  const grid = document.getElementById('vetGrid');
  if (!grid) return;
  grid.innerHTML = list.length === 0
    ? '<p class="empty-sm">No hospitals found.</p>'
    : list.map(v => `
      <div class="vet-card">
        <span class="${v.open?'open-tag':'open-tag closed-tag'}">${v.open?'● Open':'● Closed'}</span>
        <div class="vet-card-top">
          <div class="vet-icon">${v.icon}</div>
          <div class="vet-info"><h4>${v.name}</h4><span class="vet-spec">${v.specialty}</span>
            <div class="vet-rating">⭐ ${v.rating} <span style="color:#9ca3af;font-weight:400">(${v.reviews})</span></div>
          </div>
        </div>
        <p class="vet-detail"><i class="fa fa-map-marker-alt"></i>${v.address}</p>
        <p class="vet-detail"><i class="fa fa-route"></i>${v.distance} away</p>
        <p class="vet-detail"><i class="fa fa-clock"></i>${v.hours}</p>
        <p class="vet-detail"><i class="fa fa-phone"></i>${v.phone}</p>
        <div class="vet-footer">
          <span class="vet-fee">From ${v.fee}</span>
          <button class="btn-book" onclick="openBookingModal(${v.id})" ${!v.open?'disabled':''}>
            <i class="fa fa-calendar-plus"></i> Book Now
          </button>
        </div>
      </div>`).join('');
}

function filterVets() {
  const q = document.getElementById('vetSearchInput').value.toLowerCase();
  const s = document.getElementById('vetSpecialty').value;
  renderVetGrid(VETS.filter(v => (!q || v.name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q)) && (!s || v.specialty === s)));
}

function renderDashVets() {
  const el = document.getElementById('dashVetList');
  if (!el) return;
  el.innerHTML = VETS.slice(0, 3).map(v => `
    <div class="dv-item" onclick="showSection('booking',null)">
      <span class="dv-icon">${v.icon}</span>
      <div class="dv-info"><h5>${v.name}</h5><p>${v.distance} · ${v.hours}</p></div>
      <span class="dv-rating">⭐ ${v.rating}</span>
    </div>`).join('');
}

function openBookingModal(vetId) {
  selectedVet = VETS.find(v => v.id === vetId);
  if (!selectedVet) return;
  document.getElementById('modalVetName').textContent    = selectedVet.name;
  document.getElementById('modalVetAddress').textContent = selectedVet.address;
  document.getElementById('modalVetEmoji').textContent   = selectedVet.icon;
  document.getElementById('bookingDate').min = new Date().toISOString().split('T')[0];
  const sel = document.getElementById('bookingPet');
  sel.innerHTML = '<option value="">Choose your pet</option>';
  allPets.forEach(p => { const o = document.createElement('option'); o.value = p._id; o.textContent = `${p.name} (${p.type})`; sel.appendChild(o); });
  document.getElementById('bookingModal').classList.remove('hidden');
}

function closeBookingModal() { document.getElementById('bookingModal').classList.add('hidden'); selectedVet = null; }

function confirmBooking(e) {
  e.preventDefault();
  const petId  = document.getElementById('bookingPet').value;
  const date   = document.getElementById('bookingDate').value;
  const time   = document.getElementById('bookingTime').value;
  const reason = document.getElementById('bookingReason').value;
  const notes  = document.getElementById('bookingNotes').value;
  const pet    = allPets.find(p => p._id === petId);
  bookings.unshift({ id: Date.now(), vetId: selectedVet.id, vetName: selectedVet.name, vetIcon: selectedVet.icon, petName: pet?.name || 'Unknown', petId, date, time, reason, notes });
  localStorage.setItem('petBookings', JSON.stringify(bookings));
  closeBookingModal();
  renderMyBookings(); updateBookingStats();
  toast(`✅ Booked ${reason} at ${selectedVet.name}!`);
  e.target.reset();
}

function renderMyBookings() {
  const list = document.getElementById('myBookingsList');
  const none = document.getElementById('noBookings');
  const cnt  = document.getElementById('bookingCount');
  if (!list) return;
  if (cnt) cnt.textContent = bookings.length;
  if (bookings.length === 0) { none.style.display = 'block'; list.innerHTML = ''; return; }
  none.style.display = 'none';
  list.innerHTML = bookings.map(b => `
    <div class="booking-card">
      <button class="bk-del" onclick="cancelBooking(${b.id})"><i class="fa fa-times"></i></button>
      <h4>${b.vetIcon} ${b.vetName}</h4>
      <p>${b.petName} · ${b.reason}</p>
      <div class="bk-meta">
        <span class="bk-tag"><i class="fa fa-calendar"></i> ${b.date}</span>
        <span class="bk-tag gray">${b.time}</span>
        ${b.notes ? `<span class="bk-tag gray">${b.notes}</span>` : ''}
      </div>
    </div>`).join('');
}

function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  bookings = bookings.filter(b => b.id !== id);
  localStorage.setItem('petBookings', JSON.stringify(bookings));
  renderMyBookings(); updateBookingStats();
  toast('🗑️ Booking cancelled.');
}

function updateBookingStats() {
  const el   = document.getElementById('statBookings');
  const mini = document.getElementById('dashBookings');
  const none = document.getElementById('dashNoBookings');
  if (el) el.textContent = bookings.length;
  if (!mini) return;
  if (bookings.length === 0) { mini.innerHTML = ''; none.style.display = 'block'; return; }
  none.style.display = 'none';
  mini.innerHTML = bookings.slice(0, 3).map(b => `
    <div style="background:var(--bg);border-radius:10px;padding:8px 12px;margin-bottom:6px">
      <p style="font-weight:700;font-size:.84rem">${b.vetIcon} ${b.vetName}</p>
      <p style="font-size:.76rem;color:var(--muted)">${b.petName} · ${b.date} at ${b.time}</p>
    </div>`).join('');
}

document.addEventListener('click', e => { if (e.target.id === 'bookingModal') closeBookingModal(); });

// ── CUSTOMER CARE CHAT ────────────────────────────────────────────────────────
const BOT = {
  'how do i add a pet?':    '🐾 Go to <b>Add Pet</b> in the sidebar, fill in your pet\'s name, type & breed, then click Register!',
  'how do reminders work?': '⏰ Go to <b>Reminders</b>, select your pet, pick an activity & time. We\'ll SMS & email you at that exact time every day! All saved to MongoDB.',
  'how to book a vet?':     '🏥 Click <b>Book Vet</b> in the sidebar, browse hospitals, click Book Now, choose your pet & time slot!',
  'i need urgent help':     '🚨 For emergencies, call your nearest vet. Find 24x7 emergency clinics in the <b>Book Vet</b> section!',
  'hello':'👋 Hello! How can I help with your pet care today?',
  'hi':'👋 Hi there! What can I help you with?',
  'thank you':'😊 You\'re welcome! Your pets are lucky to have such a caring owner! 🐾',
  'thanks':'😊 Happy to help! Let me know if you need anything else.',
};

function toggleChat() {
  const win = document.getElementById('ccWindow');
  const badge = document.getElementById('ccBadge');
  const icon  = document.getElementById('ccIcon');
  win.classList.toggle('hidden');
  if (!win.classList.contains('hidden')) { badge.classList.add('hidden'); icon.className = 'fa fa-times'; document.getElementById('ccInput').focus(); }
  else icon.className = 'fa fa-comments';
}

function addMsg(text, sender) {
  const box = document.getElementById('ccMessages');
  const now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const div = document.createElement('div');
  div.className = `cc-msg ${sender}`;
  div.innerHTML = `<div class="cc-bubble">${text}</div><span class="cc-time">${now}</span>`;
  box.appendChild(div); box.scrollTop = box.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('ccInput');
  const msg   = input.value.trim();
  if (!msg) return;
  document.getElementById('ccQuickReplies').style.display = 'none';
  addMsg(msg, 'user'); input.value = '';
  const key   = msg.toLowerCase().replace(/[?!.,]/g,'');
  const reply = BOT[key] || Object.entries(BOT).find(([k]) => key.includes(k.replace(/[?]/g,'')))?.[1]
    || '🤔 I\'m not sure about that. Email us at <b>support@pawcare.com</b> or call <b>+91-800-PAW-CARE</b>';
  setTimeout(() => addMsg(reply, 'bot'), 600);
}

function quickReply(text) { document.getElementById('ccInput').value = text; sendChat(); }
