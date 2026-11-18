# UniHelp · AI Chatbot for Student Grievance Redressal

A full-stack MERN application where students describe a problem in plain language to an AI assistant (Google Gemini). The assistant understands it, categorises it, creates a ticket with a unique ID, and the administration handles it through a dashboard with analytics.

**Stack:** React 18 (Vite) · Tailwind CSS · Node.js · Express · MongoDB (Mongoose) · Gemini API · JWT · bcrypt · Recharts

---

## Features

| # | Requirement | Where |
|---|-------------|-------|
| 1 | Student registration, login, dashboard | `pages/Register.jsx`, `Login.jsx`, `student/Dashboard.jsx` |
| 2 | AI chatbot understands complaints | `server/src/services/chatService.js` + `gemini.js`, `student/Chatbot.jsx` |
| 3 | Auto-categorisation (Academic, Exams, Hostel, Fees, Transport, Faculty, Infrastructure) | Gemini output validated by `utils/aiParsing.js`; keyword fallback in `utils/categorizer.js` |
| 4 | Unique ticket IDs (`GRV-2026-00001`) | `services/complaintService.js` (atomic per-year counter) |
| 5 | Status tracking: Pending / In Progress / Resolved / Rejected | Status history timeline on every complaint |
| 6 | Admin: view, assign, manage, resolve | `admin/ManageComplaints.jsx`, `ComplaintDetail.jsx` (management panel) |
| 7 | Admin analytics with charts | `admin/Analytics.jsx`, `GET /api/admin/analytics` |
| 8 | Chat history and notifications | `ChatMessage` + `Notification` models, bell with unread count |
| 9 | Secure auth and role-based access | JWT, bcrypt (12 rounds), `protect` / `restrictTo` middleware |

Extra: an **"Other"** category is used when nothing fits; admins can also recategorise. If Gemini is not configured or fails, the chatbot **automatically falls back** to a keyword classifier so the app never breaks.

---

## Project structure

```
grievance-chatbot/
├── package.json              # root scripts (install:all, dev, seed, test, smoke)
├── server/
│   ├── .env.example
│   ├── scripts/smoke.js      # end-to-end API test (run against a live server)
│   ├── tests/logic.test.js   # unit tests (no DB needed)
│   └── src/
│       ├── app.js, server.js
│       ├── config/           # env validation, DB connection
│       ├── models/           # User, Complaint, ChatMessage, Notification, Counter
│       ├── middleware/       # auth (JWT + roles), validate (zod), errorHandler
│       ├── validators/       # zod schemas
│       ├── controllers/      # auth, chat, complaint, admin, notification
│       ├── routes/
│       ├── services/         # gemini, chatService, complaintService, notificationService
│       ├── utils/            # categorizer, fallbackBot, aiParsing, ticket, AppError
│       └── seed/seed.js      # sample data
└── client/
    ├── .env.example
    └── src/
        ├── api/client.js     # axios + token + 401 handling
        ├── context/AuthContext.jsx
        ├── components/       # Layout (sidebar), ProtectedRoute, ui
        └── pages/            # Login, Register, student/*, admin/*, ComplaintDetail, Notifications
```

---

## Prerequisites

* **Node.js 18+** (22 recommended)
* **MongoDB** running locally (`mongodb://127.0.0.1:27017`) **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI
* *(Optional but recommended)* a **Gemini API key** from <https://aistudio.google.com/apikey>

## Quick start

```bash
# 1. Install everything (root + server + client)
npm install
npm run install:all

# 2. Configure the backend
cp server/.env.example server/.env
#    edit server/.env: set MONGO_URI, JWT_SECRET and GEMINI_API_KEY
#    generate a strong secret:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. (Optional) frontend env - defaults work for local development
cp client/.env.example client/.env

# 4. Load sample data (wipes the DB! development only)
npm run seed

# 5. Run backend (http://localhost:5000) and frontend (http://localhost:5173) together
npm run dev
```

Open **http://localhost:5173**.

Run them separately if you prefer:

```bash
cd server && npm run dev      # API on :5000
cd client && npm run dev      # UI on :5173 (proxies /api to :5000)
```

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@university.edu` | `Admin@123` |
| Admin (exam cell) | `exams@university.edu` | `Admin@123` |
| Admin (hostel) | `hostel@university.edu` | `Admin@123` |
| Student | `aarav@student.edu` | `Student@123` |
| Students | `priya@`, `rohan@`, `ananya@`, `karan@`, `sneha@` `student.edu` | `Student@123` |

> These are demo credentials. **Never run the seed script or keep these accounts in production.** Public registration only ever creates `student` accounts; admins are created by the seed script or directly in the database.

---

## Environment variables

`server/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign tokens (32+ chars) |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `GEMINI_API_KEY` | no | Enables AI understanding. Empty = keyword fallback |
| `GEMINI_MODEL` | no | Default `gemini-2.5-flash`. Change it if Google retires the model |
| `PORT` | no | Default `5000` |
| `CLIENT_ORIGIN` | no | Allowed CORS origin(s), comma separated. Default `http://localhost:5173` |
| `NODE_ENV` | no | `development` / `production` |

`client/.env` (both optional): `VITE_API_URL`, `VITE_PROXY_TARGET`.

The Gemini key lives **only** on the server. The browser never sees it; all AI calls go through `POST /api/chat/message`.

---

## How the chatbot works

1. The student sends a message. It is saved to chat history.
2. If it contains a ticket ID (e.g. `GRV-2026-00012`) the bot replies with that ticket's status directly (only for the student's own tickets).
3. Otherwise the messages since the last filed ticket are sent to Gemini with a system prompt. Gemini returns JSON: `ask_more` (one clarifying question), `create_complaint` (title, description, category, priority) or `answer`.
4. The server **never trusts the model output blindly**: category and priority are validated against the allowed lists (and repaired by the keyword classifier if invalid), the ticket is always created for the *authenticated* user, and at most two follow-up questions are asked.
5. A ticket is created, the student and all admins are notified, and the reply includes a ticket card.
6. If Gemini is not configured, times out (20 s) or returns something unusable, the rule-based fallback takes over and the UI shows a "Basic mode" notice.

## API overview

All routes are under `/api`. Everything except register/login/health needs `Authorization: Bearer <token>`.

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| POST | `/auth/register` | public | Create student account |
| POST | `/auth/login` | public | Login, returns JWT |
| GET | `/auth/me` | any | Current user |
| POST | `/chat/message` | student | Talk to the assistant |
| GET / DELETE | `/chat/history` | student | Load / clear chat history |
| GET | `/complaints` | student | Own complaints (filter, search, paginate) |
| POST | `/complaints` | student | File a complaint without the chatbot |
| GET | `/complaints/stats/summary` | student | Dashboard counts |
| GET | `/complaints/:id` | owner or admin | Detail (by `_id` or ticket ID) |
| GET | `/admin/complaints` | admin | All complaints with filters |
| PATCH | `/admin/complaints/:id` | admin | Assign / change status, priority, category / add remark |
| GET | `/admin/staff` | admin | Assignable staff |
| GET | `/admin/analytics` | admin | Stats + chart data |
| GET | `/notifications` | any | List + unread count |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | any | Mark read |
| GET | `/health` | public | Status and AI mode |

Business rules: assigning a *Pending* complaint moves it to *In Progress*; **Resolved** and **Rejected** require a remark; every change is recorded in the status history and the student is notified.

---

## Testing

```bash
npm test          # 29 unit tests: categoriser, ticket IDs, Gemini-output parsing, fallback bot (no DB needed)
npm run smoke     # end-to-end API test, needs the server running and `npm run seed` done
```

The smoke test (`server/scripts/smoke.js`) registers a new student, checks validation and role enforcement, chats until a ticket is created, checks status lookup, then logs in as admin, assigns, resolves (including the "remark required" rule), verifies notifications and analytics.

Manual UI checklist: register → chat a complaint → see the ticket card → *My Complaints* → log in as admin → *Manage Complaints* → assign and resolve → back as the student to see the notification and timeline → admin *Analytics*.

## Security notes

* Passwords hashed with bcrypt (12 rounds); never returned by the API.
* JWT verified on every request and the user is re-loaded from the DB, so deleted users lose access immediately.
* Role checks are enforced on the server (`restrictTo`); the React route guards are only UX.
* Input validated with zod (types are strict, so NoSQL-injection objects such as `{"$ne": ""}` are rejected); regex search input is escaped.
* `helmet`, CORS allow-list, request size limit, rate limits (global, auth endpoints, and per-user on the chatbot to protect your Gemini quota).
* Registration cannot create admins; login errors do not reveal whether an email exists.
* Secrets only come from environment variables. `.env` is git-ignored.
* The JWT is kept in `localStorage` for simplicity. For a hardened production deployment consider httpOnly cookies and a CSRF strategy, and serve everything over HTTPS.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing required environment variables` | Create `server/.env` from `.env.example` |
| `Could not connect to MongoDB` | Start `mongod`, or use an Atlas URI in `MONGO_URI` |
| UI shows "Cannot reach the server" | Backend not running on port 5000, or `VITE_PROXY_TARGET` is wrong |
| Chat shows "Basic mode" | `GEMINI_API_KEY` is empty, invalid or the model name is retired. The server log prints `[chat] Gemini failed (...)` with the reason |
| `bcrypt` install error | Needs a build toolchain on unusual platforms. As a drop-in alternative install `bcryptjs` and change the `require` in `models/User.js` |
| Login rejected after changing `JWT_SECRET` | Old tokens become invalid. Log in again |

## Possible next steps

Email/SMS notifications, file attachments on complaints, SLA reminders, escalation rules, department-scoped admin roles, and WebSocket push for real-time notifications (currently polled every 30 s).



---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------




# Grievance Chatbot

An AI-powered Grievance Management System that allows students to submit complaints, track complaint status, and receive updates. Admins can manage, assign, resolve, and analyse complaints.

## 🚀 Steps to Run the Project

### 1. Install Prerequisites

Before running the project, install the following:

- **Node.js 18 or newer:** https://nodejs.org/
- **MongoDB:** Install MongoDB Community Server or create a free MongoDB Atlas cluster: https://www.mongodb.com/
- **Gemini API Key (Optional):** Generate an API key from https://aistudio.google.com/apikey

**Note:** The Gemini API key is optional. Without it, the chatbot uses a basic keyword-based response mode.

### 2. Download and Extract the Project

1. Download the Grievance Chatbot ZIP file.
2. Extract the ZIP file.
3. Open the extracted `grievance-chatbot` folder in VS Code.
4. Open the VS Code terminal.

Navigate to the project directory:

```bash
cd grievance-chatbot
```

**Note:** If your terminal is already inside the `grievance-chatbot` folder, do not run this command again.

### 3. Install Dependencies

Run the following commands in the project root directory:

```bash
npm install
npm run install:all
```

These commands install the main project dependencies and dependencies for the frontend and backend.

### 4. Configure Environment Variables

Create a `.env` file inside the `server` folder.

**For Windows (PowerShell):**

```powershell
copy server\.env.example server\.env
```

**For macOS/Linux:**

```bash
cp server/.env.example server/.env
```

Open `server/.env` and configure the following variables:

```env
MONGO_URI=mongodb://127.0.0.1:27017/grievance_db
JWT_SECRET=your_long_random_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

- `MONGO_URI`: MongoDB connection URL.
- `JWT_SECRET`: Secret key used for authentication.
- `GEMINI_API_KEY`: Your Gemini API key (optional).

To generate a secure JWT secret, run:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`.

**For MongoDB Atlas:** Replace the local MongoDB URI with your Atlas connection string.

### 5. Start MongoDB

If you are using MongoDB locally, make sure the MongoDB service is running before starting the application.

If you are using MongoDB Atlas, ensure your connection string and network access settings are configured correctly.

### 6. Load Sample Database Data

Run the following command from the project root:

```bash
npm run seed
```

This command clears the existing database data and inserts sample records:

- 3 Admin accounts
- 6 Student accounts
- 30 Sample complaints

**Warning:** Running the seed command again will wipe the existing database data.

### 7. Run the Application

Start the frontend and backend together:

```bash
npm run dev
```

Once the application starts, open your browser:

**Frontend:** http://localhost:5173

**Backend API:** http://localhost:5000

### 8. Demo Login Credentials

Use the following credentials to log in and test the application.

| Role | Email | Password |
|---|---|---|
| Admin | admin@university.edu | Admin@123 |
| Student | aarav@student.edu | Student@123 |

You can also register a new student account through the login page.

### 9. Test the Application

**Student Module:**

1. Log in using the student credentials.
2. Open the AI Assistant.
3. Enter a grievance, for example:

   "The hostel mess food is unhygienic and the warden ignores us."

4. The chatbot processes the grievance and creates a complaint ticket.
5. View the complaint status and notifications.

**Admin Module:**

1. Log in using the admin credentials.
2. Open Manage Complaints.
3. View submitted complaints.
4. Assign complaints to the appropriate department.
5. Resolve or reject complaints by adding a required remark.
6. Open Analytics to view complaint statistics and charts.

**Student Tracking:**

1. Log back in as a student.
2. Open the complaints section.
3. Check the updated complaint status.
4. View notifications and the complaint status timeline.

### 10. Run Automated Tests

Run unit tests:

```bash
npm test
```

This runs 29 unit tests without requiring a database.

Run API smoke tests:

```bash
npm run smoke
```

**Important:** Keep the application running in another terminal before executing the smoke tests. These tests perform 31 end-to-end API checks.

## 🛠️ Troubleshooting

### Problem 1: Could not connect to MongoDB

**Solution:**
- Make sure MongoDB is installed and running.
- Verify the `MONGO_URI` value in `server/.env`.
- If using Atlas, check your connection string and network access settings.

### Problem 2: Chatbot shows Basic Mode

**Solution:**
- Check whether your Gemini API key is valid.
- Make sure `GEMINI_API_KEY` is correctly configured.
- Check the server terminal for errors.
- If the configured model is unavailable, update `GEMINI_MODEL` in `server/.env` to a supported Gemini model.

Restart the backend after changing environment variables.

### Problem 3: bcrypt installation error

**Solution:**

If the `bcrypt` package fails to install, you can use `bcryptjs` instead:

```bash
npm install bcryptjs --prefix server
```

Update the relevant import in `server/src/models/User.js`:

```javascript
const bcrypt = require('bcryptjs');
```

### Problem 4: npm command not recognized

**Solution:**
- Install Node.js 18 or newer.
- Restart VS Code after installation.
- Check Node.js and npm versions:

```bash
node -v
npm -v
```

## 📌 Important Commands

| Command | Description |
|---|---|
| `npm install` | Install root dependencies |
| `npm run install:all` | Install frontend and backend dependencies |
| `npm run seed` | Load sample database data |
| `npm run dev` | Start frontend and backend |
| `npm test` | Run unit tests |
| `npm run smoke` | Run API smoke tests |

## 📂 Project Features

- Student Registration and Login
- Admin Authentication
- AI-Powered Grievance Assistant
- Automatic Complaint Categorization
- Complaint Submission and Tracking
- Complaint Assignment and Resolution
- Student Notifications
- Complaint Status Timeline
- Admin Dashboard and Analytics
- Automated Unit and API Testing

## 👨‍💻 Project

**Project Name:** Grievance Chatbot  
**Purpose:** AI-Based Student Grievance Management System

---

**Happy Coding! 🚀**