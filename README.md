# HireHub — Full Stack Job Portal

Production-style monorepo: **React (Vite) + Tailwind** frontend and **Express + MongoDB (Mongoose)** backend with **JWT**, **bcrypt**, **role-based access** (admin, recruiter, job seeker), and **MVC-style** REST APIs.

## Repository layout

```text
hirehub/
├── client/     # React (Vite) + Tailwind + Axios + React Router
├── server/     # Express + Mongoose + JWT
└── README.md
```

---

## 1. Backend

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
| PUT | `/api/applications/:applicationId/status` | Recruiter (bonus: shortlist / reject) |
| GET | `/api/admin/users` | Admin |
| DELETE | `/api/admin/user/:id` | Admin |

---

## 2. Frontend

- **Stack:** React 18, Vite, Tailwind CSS, Axios, React Router v6
- **Auth:** JWT in `localStorage` (`hirehub_token`), user snapshot in `hirehub_user`
- **Protected routes:** `ProtectedRoute` with optional `roles` prop
- **Navbar:** Role-aware links (seeker / recruiter / admin)
- **Pages:** Home (job list), job detail + apply, login/register, seeker applications, recruiter dashboard, admin users table

---

## 3. API integration (frontend ↔ backend)

1. **Base URL**
   - **Local dev:** leave `VITE_API_URL` unset. Vite proxies `/api` to `http://localhost:5000` (see `client/vite.config.js`). Axios uses `baseURL: '/api'`.
   - **Production:** set `VITE_API_URL` to your deployed API root **including** `/api`, e.g. `https://api.example.com/api`.

2. **Auth header**
   - `client/src/api/axios.js` adds `Authorization: Bearer <token>` from `localStorage` on every request.

3. **CORS**
   - Server uses `CLIENT_URL` (default `http://localhost:5173`). For production, set `CLIENT_URL` to your deployed frontend origin.

4. **Flow**
   - Register or login → store token + user → navigate by role (admin → `/admin`, recruiter → `/recruiter`, seeker → home or previous page).
   - Job seeker opens `/jobs/:id`, submits `resumeLink` → `POST /api/applications/:jobId`.
   - Recruiter uses dashboard → `GET/POST/PUT/DELETE /api/jobs` and `GET /api/applications/recruiter`.

---

## 4. Environment variables

### `server/.env` (copy from `server/.env.example`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Optional (default `7d`) |
| `PORT` | API port (default `5000`) |
| `CLIENT_URL` | Frontend origin for CORS |

### `client/.env` (optional; see `client/.env.example`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Full API base including `/api` when not using the Vite proxy |

---

## 5. Setup and run

**Prerequisites:** Node.js 18+, MongoDB running locally or Atlas URI.

### Backend

```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

API: `http://localhost:5000` (health: `GET http://localhost:5000/api/health`)

### Frontend

```bash
cd client
npm install
npm run dev
```

App: `http://localhost:5173`

### Production build (client)

```bash
cd client
npm run build
npm run preview
```

Serve `client/dist` behind your static host and point `VITE_API_URL` at the live API.

### MongoDB not installed?

- **Docker (easiest if you use Docker Desktop):** from the repo root run `docker compose up -d`, then use `MONGODB_URI=mongodb://127.0.0.1:27017/hirehub` in `server/.env`.
- **Or** install [MongoDB Community](https://www.mongodb.com/try/download/community) and start the service.
- **Or** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and paste its connection string into `MONGODB_URI`.

### “Failed to load jobs” on the home page

Usually means **(1)** the API is not running (`npm run dev` in `server/`), **(2)** MongoDB is not running or `MONGODB_URI` is wrong (the server exits or never finishes starting), or **(3)** the API runs on a different port than the Vite proxy expects (`5000`). Check `http://localhost:5000/api/health` in the browser — it should return `{"ok":true}`.

---

## 6. Seed data (testing)

From `server/` after `.env` is configured:

```bash
npm run seed
```

This wipes `users`, `jobs`, and `applications` in the target database and inserts demo data.

**Test accounts** (password for all: `Password123!`):

| Role | Email |
|------|--------|
| Admin | `admin@hirehub.demo` |
| Recruiter | `recruiter@hirehub.demo` |
| Job seeker | `seeker@hirehub.demo` |

**Note:** Public registration only allows `user` or `recruiter`. **Admin** accounts are intended to be created via seed or direct database operations for safety.

---

## 7. Security notes (portfolio / production)

- Passwords hashed with **bcrypt**; `password` is `select: false` on the User model.
- JWT verified on protected routes; role checks use `authorize(...)`.
- Recruiters may only edit/delete **their own** jobs.
- Admins cannot delete **their own** account via the delete-user endpoint (guard in controller).
- Use a strong `JWT_SECRET` and HTTPS in production.

---

## License

MIT — suitable for portfolio and learning use.
