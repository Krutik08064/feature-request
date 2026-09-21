# ComBot — Feature Request & Public Roadmap Portal

> A production-grade, full-stack feedback and public roadmap portal inspired by Canny and Featurebase. Built with an asynchronous Python FastAPI backend, MongoDB atomic toggle engine, Vite + React frontend styled with genuine `@coss/ui` (Base UI + Tailwind CSS v4), and TanStack Query with optimistic UI updates.

---

## 🌟 Features Overview

- **Public Roadmap Kanban Board (`/roadmap`)**:
  - Zero authentication required for public viewing.
  - 3-column Kanban layout: **Planned**, **In Progress**, and **Completed**.
  - Real-time upvoting directly on cards with instant optimistic feedback.
- **Feature Request Feed (`/`)**:
  - Live search with 300ms debounce across titles and descriptions.
  - Multi-criteria filtering by category (**Feature**, **Bug**, **Improvement**, **Integration**, **Other**) and status.
  - Multi-way sorting: **Most Upvoted**, **Newest**, **Oldest**, and **Most Discussed**.
  - High-performance pagination with Skeleton loading and empty state handling.
- **Atomic MongoDB Voting Engine (`PATCH /api/posts/{id}/vote`)**:
  - Race-condition-free upvote/unvote toggle using MongoDB `$addToSet` and `$pull` with concurrent `$inc`.
  - Non-authenticated users clicking upvote are greeted with a modal auth dialog.
  - Instant optimistic UI update with automatic rollback on server error.
- **Rich Discussions & 1-Level Threaded Comments**:
  - Structured discussion thread on each feature request.
  - Top-level comments with single-level nested replies.
  - Markdown preview support.
  - Soft-deletion preserving thread hierarchy (showing `[This comment has been deleted]`).
- **Role-Based Access Control (RBAC) & Admin Control Panel (`/admin`)**:
  - Dual roles: `user` and `admin`.
  - Strict route guards returning `403 Forbidden` for unauthorized actors.
  - Interactive status transitions (**Under Review** &rarr; **Planned** &rarr; **In Progress** &rarr; **Completed**).
  - High-level overview cards: Total Requests, Total Votes, Total Comments, and Pending Reviews.
- **Enterprise-Grade Authentication & Security**:
  - Dual-token JWT architecture stored securely in **`httpOnly`**, **`SameSite`** cookies.
  - Automatic refresh token rotation with server-side hash verification (`hash_refresh_token`).
  - Simulated email verification via 6-digit OTP codes and dev-tokens debug endpoint (`/api/auth/dev-tokens`).
  - Secure password reset flow with token expiration.

---

## 🏗️ Architecture & Tech Stack

```
                                 ┌───────────────────────────────┐
                                 │      Browser / Client         │
                                 │ React + Vite + coss.com/ui   │
                                 └───────────────┬───────────────┘
                                                 │
                                                 │ HTTP Only Cookies (Access + Refresh)
                                                 │ JSON API / Reverse Proxy (/api)
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │     FastAPI Backend (Async)   │
                                 │  Python 3.12 + Motor Driver   │
                                 └───────────────┬───────────────┘
                                                 │
                                                 │ Async IO / Connection Pool
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │      MongoDB 7.0 Database     │
                                 │  users | posts | comments     │
                                 └───────────────────────────────┘
```

### Technology Stack Decisions & Rationale

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | **Python 3.12 + FastAPI (Async)** | Exceptional throughput, native async/await syntax, built-in OpenAPI `/docs`, and strict type safety via Pydantic v2. |
| **Database** | **MongoDB 7.0 + Motor** | Async non-blocking document store. Atomic operators (`$addToSet`, `$pull`, `$inc`) enable race-condition-free voting engines. |
| **Auth** | **JWT Pair + `httpOnly` Cookies** | Mitigates XSS attack vectors compared to `localStorage`. Refresh token rotation with cryptographic SHA-256 hash tracking prevents token replay. |
| **Frontend UI** | **`coss.com/ui` (Base UI + Tailwind v4)** | Modern design system built on Cal.com's accessible Base UI primitives, styled with Tailwind CSS v4 for zero-runtime styling overhead. |
| **State Management** | **TanStack Query v5** | Server-state caching, automatic background revalidation, optimistic mutation handling with rollback, and query invalidation. |
| **Routing** | **React Router v6** | Client-side SPA routing with protected admin route guards and fallback redirections. |

---

## 📁 Repository Structure

```
Com.bot/
├── docker-compose.yml           # Multi-container orchestration (Mongo, Backend, Frontend)
├── .gitignore                   # Root gitignore excluding build artifacts, envs, and venvs
├── backend/
│   ├── app/
│   │   ├── core/               # App configuration, security helpers, and JWT utilities
│   │   ├── db/                 # Motor async client lifecycle and index bootstrap
│   │   ├── models/             # Pydantic v2 request/response schemas and DB representations
│   │   └── routers/            # Modular FastAPI routers (auth, posts, comments)
│   ├── scripts/
│   │   └── seed.py             # Realistic database seeder script (Admin, users, posts, comments)
│   ├── tests/
│   │   ├── conftest.py         # Pytest async client and database fixtures
│   │   └── test_api.py         # Comprehensive integration test suite (100% pass)
│   ├── Dockerfile              # Production Python 3.12-slim Dockerfile
│   ├── requirements.txt        # Pinned dependencies (including bcrypt==4.0.1)
│   ├── pytest.ini              # Pytest configuration
│   └── main.py                 # FastAPI application root & middleware configuration
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/             # Genuine @coss/ui component library (54 Base UI components)
    │   │   ├── Navbar.tsx      # Global navigation with brand, links, and avatar dropdown
    │   │   ├── PostCard.tsx    # Card with atomic vote button, category badge, and metadata
    │   │   ├── AuthModal.tsx   # Unauthenticated action interception dialog
    │   │   ├── NewPostDialog.tsx # Post creation dialog with live markdown preview
    │   │   └── ThreadedComments.tsx # 1-level nested discussions with soft delete
    │   ├── hooks/              # Custom TanStack Query hooks (usePosts, useComments)
    │   ├── lib/                # Axios/fetch API client with refresh token interceptors & notify
    │   ├── pages/              # FeedPage, RoadmapPage, AdminPage, PostDetailPage, Auth pages
    │   ├── App.tsx             # Main routing shell with TanStack Query provider
    │   └── main.tsx            # DOM bootstrap
    ├── Dockerfile              # Multi-stage production Nginx container build
    ├── nginx.conf              # SPA route rewriting & reverse proxy config
    ├── vercel.json             # Vercel deployment SPA rewrite configuration
    └── package.json            # Frontend scripts and dependencies
```

---

## 🚀 Quickstart & Local Installation

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 18+ or 20+
- **MongoDB**: Local MongoDB community service running on port 27017 (or MongoDB Atlas URI)

---

### Step 1: Backend Setup

1. Open a terminal in the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install pinned dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local `.env` configuration:
   ```bash
   cp .env.example .env
   ```

5. Seed the database with realistic demo data (users, feature requests, votes, comments):
   ```bash
   python scripts/seed.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   Backend interactive Swagger docs are available at **`http://localhost:8000/docs`**.

---

### Step 2: Frontend Setup

1. Open another terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Configure your local `.env`:
   ```bash
   cp .env.example .env
   ```
   *(For local development, `VITE_API_URL` can remain empty to let Vite proxy requests to `http://localhost:8000`)*

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Access the web app at **`http://localhost:5173`**.

---

## 🔑 Demo Accounts & Credentials

The seed script (`python scripts/seed.py`) populates the database with pre-configured accounts:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **Admin** | `admin@combot.dev` | `Admin123!` | Full admin privileges, status transitions, comment moderation, dashboard statistics. |
| **Regular User** | `alex@combot.dev` | `User123!` | Post submission, atomic upvoting, comment discussions, profile viewing. |
| **Regular User** | `jordan@combot.dev` | `User123!` | Voting, replies, post creation. |

> **Email Verification in Development**: During signup, verification OTP codes are logged directly to the FastAPI server console and are also accessible via `GET /api/auth/dev-tokens` for automated testing.

---

## 🧪 Automated Testing

The backend includes a comprehensive pytest suite covering:
- Authentication, cookies, token rotation, and invalidation on logout.
- Race-condition-free atomic voting toggles (`$addToSet` / `$pull` + `$inc`).
- Non-admin `403 Forbidden` protection on admin status transitions.
- Threaded discussions, reply nesting, and soft-deletion preserving tree continuity.
- Public roadmap filtering by status.

Run the test suite:
```bash
cd backend
pytest -v
```

---

## 🐳 Docker Deployment (`docker-compose`)

ComBot is completely containerized. You can run MongoDB, the FastAPI backend, and the Vite+Nginx frontend with a single command:

```bash
docker-compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **MongoDB**: localhost:27017

---

## ☁️ Production Cloud Deployment Guide

ComBot is engineered to deploy seamlessly to cloud platforms (e.g., **Vercel** for Frontend and **Render** / **Railway** for Backend with **MongoDB Atlas**).

### 1. MongoDB Atlas (Database)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow your backend IP (or `0.0.0.0/0`).
3. Retrieve your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Backend Deployment (Render / Railway / Docker)
1. Deploy the `backend/` directory using the provided `backend/Dockerfile` or native Python environment.
2. Set Environment Variables:
   - `ENVIRONMENT=production`
   - `MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`
   - `MONGODB_DB_NAME=combot_db`
   - `JWT_SECRET_KEY=<generate-a-64-character-hex-string>`
   - `CORS_ORIGINS=https://your-combot-app.vercel.app`
   - `COOKIE_SECURE=true`
   - `COOKIE_SAMESITE=none`
   - `ENABLE_DEV_TOKENS=false`

### 3. Frontend Deployment (Vercel)
1. Connect your repository to [Vercel](https://vercel.com) and set the Root Directory to `frontend`.
2. Framework Preset: **Vite**.
3. Set Environment Variables:
   - `VITE_API_URL=https://your-backend-service.onrender.com`
4. The included `frontend/vercel.json` automatically handles SPA routing:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## 🛡️ Security & Design Considerations

1. **HttpOnly Cookie Pair vs. LocalStorage**: Storing both Access and Refresh tokens in `httpOnly` cookies ensures JavaScript running in the browser cannot read raw token secrets, neutralizing XSS credential theft.
2. **Refresh Token Rotation**: Refresh tokens are single-use. Each refresh generates a new pair and updates the stored SHA-256 hash in MongoDB. If an invalidated refresh token is reused, all active sessions for that user can be revoked.
3. **Optimistic UI with Rollback**: When a user clicks upvote, TanStack Query immediately adjusts the count and state in cache. If the server fails (network drop or 500 error), the UI gracefully snaps back to its previous state and triggers a toast.
4. **Soft-Delete Comments**: Deleting a parent comment flags `is_deleted = true` and masks the body text rather than deleting the document, guaranteeing that child replies are not orphaned.

---

## 📜 License
MIT License. Built for the Technical Assessment.
