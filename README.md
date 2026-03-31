# KNUST TimeTable Manager

A full-stack academic scheduling system for Kwame Nkrumah University of Science and Technology (KNUST). Lecturers can create and manage class timetables, detect and resolve scheduling clashes, and notify students of changes in real time.

---

## Features

- **Role-based access** — separate dashboards for lecturers and students
- **Timetable management** — create, edit, cancel, and restore class entries
- **Clash detection** — automatic detection of room and lecturer conflicts
- **Notifications** — students are notified when schedules change
- **Dark mode** — persisted per user preference
- **Responsive UI** — works on desktop, tablet, and mobile
- **Sidebar** — collapsible rail on desktop; off-canvas drawer on small screens (hamburger to open, **X** to close when expanded)
- **Profile photo** — upload a picture in Profile (stored in the browser); tap the avatar on the profile page to view it full size

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | HTML / CSS / JavaScript |
| Backend  | Node.js + Express.js |
| Database | Supabase (PostgreSQL) |
| Auth     | JWT (jsonwebtoken) + bcryptjs |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [Supabase](https://supabase.com/) project (free tier works)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ultimatewebproject.git
cd ultimatewebproject
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `backend/.env` and fill in your values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=a_long_random_secret_string
PORT=3000
```

> **Where to find these:**
> - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API
> - `JWT_SECRET` — any long random string (e.g. generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

### 4. Set up the database

Run the following SQL files once in the **Supabase SQL Editor**:

1. `backend/schema.sql` — creates the `enrollments` and `notifications` tables
2. `backend/migrations/add_indices.sql` — adds performance indices

> The core tables (`users`, `departments`, `courses`, `rooms`, `course_offerings`, `timetable_entries`, `clash_reports`) must already exist in your Supabase project. Create them via the Supabase dashboard or your own migration if needed.

### 5. Start the server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

The app will be available at **http://localhost:3000**

On first start the server automatically seeds the database with:
- 3 departments, 6 rooms, 6 courses
- 6 lecturers + 1 student test account
- Sample timetable entries and clash reports

---

## Test Accounts

| Role     | Email                      | Password      |
|----------|----------------------------|---------------|
| Lecturer | asante@knust.edu.gh        | password123   |
| Lecturer | ofori@knust.edu.gh         | password123   |
| Lecturer | boateng@knust.edu.gh       | password123   |
| Lecturer | john@knust.edu.gh          | password123   |
| Student  | alex@knust.edu.gh          | password123   |

---

## Project Structure

```
ultimatewebproject/
├── backend/
│   ├── server.js               # Express app entry point
│   ├── db.js                   # Database seeding
│   ├── logger.js               # Winston logger setup
│   ├── supabase.js             # Supabase client
│   ├── middleware/
│   │   ├── auth.js             # JWT verification & role guard
│   │   └── validate.js         # express-validator helper
│   ├── routes/
│   │   ├── auth.js             # Login, profile, password
│   │   ├── timetable.js        # Timetable CRUD + clash detection
│   │   ├── clashes.js          # Clash reports & resolution
│   │   ├── notifications.js    # User notifications
│   │   ├── users.js
│   │   ├── departments.js
│   │   ├── courses.js
│   │   ├── offerings.js
│   │   └── rooms.js
│   ├── migrations/
│   │   └── add_indices.sql     # Performance indices (run once)
│   ├── schema.sql              # Extra tables (run once)
│   ├── .env.example            # Environment variable template
│   └── package.json
└── frontend/
    ├── index.html              # Single-page app shell
    ├── styles.css
    ├── script.js               # App init & session restore
    ├── modules/
    │   ├── globals.js          # Shared state & utilities
    │   ├── ui.js               # Dark mode, sidebar, toasts, modals, profile photo
    │   ├── auth.js             # Sign in/out, user UI
    │   ├── navigation.js       # Page routing
    │   ├── timetable.js        # Timetable render & event modal
    │   ├── clashes.js          # Clash table & resolve flow
    │   ├── schedule.js         # Add/edit schedule form
    │   ├── dashboard.js        # Stats & today's schedule
    │   ├── notifications.js    # Notification list
    │   └── profile.js          # Profile update
    └── vendor/
        └── supabase.js         # Supabase JS SDK bundle
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/timetable` | List timetable entries |
| POST | `/api/timetable` | Create entry (lecturer) |
| PUT | `/api/timetable/:id` | Update entry (lecturer) |
| PUT | `/api/timetable/:id/cancel` | Cancel class (lecturer) |
| PUT | `/api/timetable/:id/restore` | Restore class (lecturer) |
| DELETE | `/api/timetable/:id` | Delete entry (lecturer) |
| GET | `/api/clashes/detected` | Auto-detect clashes |
| PUT | `/api/clashes/:id/resolve` | Resolve a clash (lecturer) |
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications/read-all` | Mark all as read |
| GET | `/api/health` | Health check |

All endpoints except `/api/auth/login` and `/api/health` require a `Bearer` token in the `Authorization` header.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret) |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `PORT` | Port the server listens on (default: 3000) |
| `LOG_LEVEL` | Winston log level: `error`, `warn`, `info` (default: `info`) |

---

## License

MIT
