# 🐾 PawCare — Virtual Pet Care System

> A full-stack web application that helps pet owners manage their pets' daily care routines with automated SMS & email reminders, vet booking, and MongoDB cloud storage.

![PawCare Banner](https://img.shields.io/badge/PawCare-Virtual%20Pet%20Care-6366f1?style=for-the-badge&logo=data:image/png;base64,)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 📸 Screenshots

| Login Page | Dashboard | Book Vet |
|---|---|---|
| Glassmorphism auth UI | Stats, reminders & vet booking | Search & book nearby vets |

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure register & login with bcrypt password hashing
- 🐾 **Pet Registration** — Add dogs, cats, rabbits, birds, fish with breed & DOB
- ⏰ **Daily Reminders** — Schedule feeding, exercise, medicine, bath, walk & vaccination reminders
- 📧 **Email Notifications** — Automated Gmail SMTP emails sent at reminder time
- 📱 **SMS Notifications** — Real-time SMS via Twilio Messaging Service to registered mobile
- 🏥 **Vet Booking** — Browse & book nearby veterinary hospitals with ratings, distance & availability
- 💬 **Customer Care Chat** — Built-in support chatbot with quick replies
- 🗄️ **MongoDB Storage** — All users, pets & reminders stored in MongoDB (visible in Compass)
- 🌫️ **Glassmorphism UI** — Frosted glass design with animated fog effects & deep shadows
- 📱 **Mobile Responsive** — Fully responsive with sidebar navigation on mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB + Mongoose |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **Email** | Nodemailer (Gmail SMTP) |
| **SMS** | Twilio Messaging Service |
| **Scheduler** | node-cron (fires every minute) |
| **UI Design** | Glassmorphism, Inter font, Font Awesome icons |

---

## 📁 Project Structure

```
virtual-pet-care/
├── server.js              ← Node.js + Express backend
├── package.json
├── .env                   ← Environment variables (not uploaded)
├── .gitignore
├── README.md
└── public/
    ├── index.html         ← Full app UI (Auth + Dashboard)
    ├── style.css          ← Glassmorphism styles + fog effects
    ├── app.js             ← Frontend JavaScript logic
    └── favicon.jpg        ← Dog mascot icon
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Gmail account with App Password
- Twilio account (free trial works)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/virtual-pet-care.git
cd virtual-pet-care
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/virtual_pet_care

# JWT
JWT_SECRET=your_secret_key_here

# Gmail SMTP (use App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password

# Server
PORT=3000
```

### 4. Start MongoDB
```bash
mongod
```
Or use MongoDB Atlas connection string in `.env`.

### 5. Run the server
```bash
npm run dev       # development (auto-restart)
# or
npm start         # production
```

### 6. Open in browser
```
http://localhost:3000
```

---

## ⚙️ Environment Setup

### Gmail App Password
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Generate password → select **Mail** → copy 16-character password
5. Paste into `EMAIL_PASS` in `.env`

### Twilio SMS Setup
1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Get **Account SID** and **Auth Token** from Console homepage
3. Create a Messaging Service → copy the **Messaging Service SID**
4. Add your phone number as a **Verified Caller ID**
5. Paste credentials into `.env`

---

## 🗄️ MongoDB Collections

After registering and adding pets/reminders, you'll see these collections in **MongoDB Compass**:

| Collection | Description |
|---|---|
| `users` | Registered user accounts |
| `pets` | Pet profiles with embedded reminder subdocs |
| `reminders` | Standalone reminder documents (with lastFired timestamp) |

---

## 📱 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | Login user |

### Pets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pets` | Get all pets |
| POST | `/api/pets` | Add new pet |
| DELETE | `/api/pets/:id` | Delete pet |

### Reminders
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reminders` | Get all reminders (MongoDB) |
| POST | `/api/pets/:id/reminders` | Add reminder |
| DELETE | `/api/pets/:id/reminders/:rid` | Delete reminder |
| PUT | `/api/reminders/:rid/toggle` | Enable/disable reminder |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/notify/test` | Send test email & SMS |

---

## 🔔 How Reminders Work

1. User sets a reminder (e.g. "🍖 Feeding Time" at 08:00 every day)
2. Saved to **MongoDB** in both `pets` and `reminders` collections
3. **node-cron** checks every minute for matching reminders
4. At the exact time → sends **Email** via Gmail + **SMS** via Twilio
5. `lastFired` timestamp updated in MongoDB

---

## 👨‍💻 Author

**Dikshit Kumar**
- GitHub: [Dikshit1711](https://github.com/Dikshit1711)
- Email: dikshitsharma1711@gmail.com

---

## 📄 License

This project is licensed under the MIT License.

---

> Made with ❤️ and 🐾 for all pet lovers
