# Bind Build ERP — CRM Platform

A full-stack, production-quality **CRM (Customer Relationship Management)** system built for interior design & construction firms. Built with a React + Vite frontend, Node.js/Express API, Prisma ORM, and SQLite.

---

## ✨ Features

| Area | Details |
|---|---|
| **Auth** | JWT access + refresh tokens, role-based access (Principal, Sales, Admin) |
| **Leads Pipeline** | Drag-and-drop Kanban + List view, stage & priority filters, win probability |
| **Lead Detail** | 5 tabs: Timeline · Notes · Meetings · 📎 Files · Proposals |
| **File Uploads** | Drag-and-drop upload (PDF, DWG, Images, XLS) up to 20MB per file |
| **Proposals** | Version tracking, view counts, status workflow (Sent → Viewed → Accepted/Rejected) |
| **Notifications** | Real-time in-app bell, auto-triggered by stage changes & proposal events |
| **Analytics** | Pipeline funnel, win/loss trends, revenue by source, team leaderboard |
| **Global Search** | Instant search across leads, contacts, locations |
| **Team Management** | View members, add new users, change roles (Principal only) |
| **CSV Export** | One-click export of full pipeline with all fields |
| **Settings** | Profile update, password change |
| **Mobile Responsive** | Full breakpoints: 768px (mobile) · 1024px (tablet icon-sidebar) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
git clone <repo-url>
cd bind-build-erp
npm install
```

### 2. Environment Variables

Create `apps/api/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"
PORT=4000
```

### 3. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed with demo data (3 users, 13 leads, meetings, proposals)
npm run db:seed
```

### 4. Run Development Servers

```bash
# Starts both API (port 4000) and Web (port 5173) concurrently
npm run dev
```

Then open **http://localhost:5173**

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| 👑 Principal | principal@bindbuild.com | password123 |
| 💼 Sales | priya@bindbuild.com | password123 |
| 💼 Sales | rahul@bindbuild.com | password123 |

---

## 🏗 Architecture

```
bind-build-erp/
├── apps/
│   ├── api/              # Express + Prisma + TypeScript
│   │   ├── src/
│   │   │   ├── routes/   # auth, leads, proposals, meetings, files, notifications
│   │   │   ├── middleware/  # authenticate, requireRole
│   │   │   └── lib/      # prisma client, jwt helpers
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   └── web/              # React 19 + Vite + TypeScript
│       └── src/
│           ├── components/   # layout, leads, shared UI
│           ├── context/      # AuthContext, ToastContext
│           ├── lib/          # axios instance, utils
│           ├── pages/        # Dashboard, Leads, Analytics, Team, Settings
│           └── test/         # Vitest test suites
└── packages/
    └── shared/           # Shared TypeScript types (Lead, User, etc.)
```

---

## 🧪 Testing & Quality

```bash
# Run tests
npm test

# Run with coverage report
npm run test:coverage

# Lint (oxlint)
npm run lint

# TypeScript type-check both workspaces
npm run typecheck
```

### Test Coverage

- **Utility functions** (`formatBudget`, `stageLabel`, `timeAgo`, `formatDate`, `STAGE_ORDER`, `SOURCE_ICONS`) — 17 tests, 100% function coverage

### Code Quality Status

| Check | Status |
|---|---|
| TypeScript (web) | ✅ 0 errors |
| TypeScript (api) | ✅ 0 errors |
| Lint (oxlint) | ✅ 0 warnings, 0 errors |
| Tests | ✅ 17 passing |
| Security audit | ⚠️ 2 moderate (React Router CVE — SSR-only, N/A for this SPA) |

---

## 🗃 Key API Endpoints

### Auth
- `POST /api/auth/login` — Get access + refresh tokens
- `POST /api/auth/register` — Create new user (Principal only)
- `GET  /api/auth/team` — List all team members
- `PATCH /api/auth/team/:id` — Update member role
- `PATCH /api/auth/profile` — Update own profile
- `PATCH /api/auth/password` — Change password

### Leads
- `GET  /api/leads` — List with filters (stage, priority, search, sort)
- `POST /api/leads` — Create lead
- `GET  /api/leads/:id` — Get full lead detail (includes activities, notes, meetings, files, proposal)
- `PATCH /api/leads/:id` — Update (incl. stage change → triggers notification)
- `DELETE /api/leads/:id` — Archive lead

### Notifications
- `GET  /api/notifications` — Get user notifications + unread count
- `PATCH /api/notifications/:id/read` — Mark as read
- `POST /api/notifications/mark-all-read` — Mark all as read

---

## 📱 Keyboard Shortcuts

| Keys | Action |
|---|---|
| `G D` | Go to Dashboard |
| `G L` | Go to Leads Pipeline |
| `G A` | Go to Analytics |
| `G T` | Go to Team |

---

## 🔒 Security Notes

- Passwords are hashed with `bcryptjs` (cost factor 12)
- JWTs expire in 15min (access) / 7 days (refresh)
- File uploads validated by MIME type and limited to 20MB
- Role-based middleware guards all sensitive endpoints
- The 2 React Router CVEs (CVE-2025-68470) only affect SSR hydration — this app is a pure SPA with no server-side rendering
