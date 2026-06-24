# HireHub — Full Stack AI-Powered Job Portal

Production-style monorepo: **React (Vite) + Tailwind** frontend, **Express + MongoDB** backend, and a **Python FastAPI AI microservice** — with **JWT**, **bcrypt**, **role-based access** (admin, recruiter, job seeker), real-time **Socket.io chat**, and AI-powered features.

## Repository layout

```text
hirehub/
├── client/       # React (Vite) + Tailwind + Axios + React Router
├── server/       # Express + Mongoose + JWT + Socket.io
├── ai-service/   # Python FastAPI — ATS Scanner, Resume Optimizer, Interview Bot
└── README.md
```

---

## Features

### Core
- Role-based auth (admin / recruiter / job seeker) with JWT + bcrypt
- Job posting, applications, and recruiter dashboard
- Admin user management panel
- Real-time Socket.io chat between recruiters and seekers

### AI Features (Python FastAPI microservice)
- **ATS Resume Scanner** — upload PDF resume, get keyword match score against a job description
- **Resume Optimizer** — AI rewrites resume to better match the job description with a split diff view
- **AI Interview Bot** — practice interviews with AI-generated questions and automated evaluation scorecard

### Seeker Profile
- GitHub username sync — fetches and displays public repositories in a grid
- Profile stats and skill showcase

---

## 1. Backend (Node.js / Express)

- **Entry:** `server/server.js`
- **Structure:** `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `utils/`
- **Auth:** Register, login, `protect` + `authorize` middleware
- **Roles:** `admin` | `recruiter` | `user` (job seeker)

### REST API summary

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/jobs` | Public |
| GET | `/api/jobs/:id` | Public |
| POST | `/api/jobs` | Recruiter |
| PUT | `/api/jobs/:id` | Recruiter (own jobs) |
| DELETE | `/api/jobs/:id` | Recruiter (own jobs) |
| POST | `/api/applications/:jobId` | Job seeker |
| GET | `/api/applications/my` | Job seeker |
| GET | `/api/applications/recruiter` | Recruiter |
| PUT | `/api/applications/:applicationId/status` | Recruiter |
| GET | `/api/profile` | Seeker |
| PUT | `/api/profile` | Seeker |
| POST | `/api/interview/start` | Seeker |
| POST | `/api/interview/answer` | Seeker |
| GET | `/api/interview/report/:id` | Seeker |
| GET | `/api/admin/users` | Admin |
| DELETE | `/api/admin/user/:id` | Admin |

---

## 2. AI Service (Python / FastAPI)

- **Entry:** `ai-service/main.py`
- **Port:** `8000`
- **Endpoints:**
  - `POST /ats-check` — ATS resume scan
  - `POST /enhance-resume` — Resume optimizer
  - `POST /generate-question` — Interview question generation
  - `POST /evaluate-answer` — AI answer evaluation

### Setup

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 3. Frontend (React / Vite)

- **Stack:** React 18, Vite, Tailwind CSS, Axios, React Router v6
- **Auth:** JWT in localStorage
- **Protected routes:** ProtectedRoute with optional roles prop
- **Pages:** Home, Job Detail, Login/Register, Seeker Applications, Seeker Profile, Recruiter Dashboard, Admin Panel, ATS Checker, Chat, Interview Lobby, Interview Session, Interview Report

---

## 4. Environment variables

### `server/.env`

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Frontend origin for CORS |

### `ai-service/.env`

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |

---

## 5. Setup and run

**Prerequisites:** Node.js 18+, Python 3.10+, MongoDB.

### Backend
```bash
cd server && npm install && npm run dev
```

### Frontend
```bash
cd client && npm install && npm run dev
```

### AI Service
```bash
cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

---

## 6. Seed data

```bash
cd server && npm run seed
```

Test accounts (password: `Password123!`):

| Role | Email |
|------|-------|
| Admin | admin@hirehub.demo |
| Recruiter | recruiter@hirehub.demo |
| Job seeker | seeker@hirehub.demo |

---

## License

MIT — suitable for portfolio and learning use.
