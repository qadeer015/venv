# venv — Environment Variable Manager

A self-hosted web application for managing environment variables across your projects, with support for multiple environments (development, staging, production) and team collaboration through granular access control and invitations.

Built with **Node.js**, **Express**, **EJS**, and **MySQL** (TiDB Cloud compatible), and designed to run on **Vercel** as a serverless application.

---

## ✨ Features

### 🔐 Authentication & Onboarding
- Register, login, and logout with **JWT-based** authentication (httpOnly cookies)
- Passwords hashed with **bcrypt** (12 rounds)
- Onboarding flow to set your name, unique username, and organization
- Session-based flash messages for user feedback

### 📦 Project Management
- Create, edit, view, and delete projects
- Each project has a name, GitHub URL, domain, and description
- Auto-generated URL slugs (`/username/project-slug`)
- Personal dashboard showing your owned and shared projects

### 🔑 Environment Variables
- Store key-value pairs per project
- Support for **three environments**: `development`, `staging`, `production`
- Add, update, and delete variables individually
- **Bulk upsert** for importing many variables at once
- Optional notes on each variable
- Key validation (uppercase letters, numbers, underscores — e.g., `DATABASE_URL`)
- Filter variables by environment on the project page

### 👥 Team Collaboration & Access Control
- **Request access** to another user's project
- **Invite users** by username or email (invitations expire after **7 days**)
- **Grant direct access** to a user by email
- **Approve / reject** pending access requests
- **Revoke access** at any time
- Granular permissions: `view` or `edit`
- Live **user search** for inviting teammates
- Dashboard shows pending requests and invitations

### 🛡️ Security
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, and more
- **Rate limiting** for general API, auth, uploads, and user actions
- Burst protection against rapid-fire requests
- JWT verification with account status checks
- Centralized error handling with friendly HTML pages and JSON API responses

### 🚀 Deployment-Ready
- **Vercel-ready** configuration (`vercel.json`)
- **Serverless-safe** database pool with hard query timeouts
- **TiDB Cloud** support with SSL (self-signed certs in dev, verified in production)
- Database **migration runner** with interactive and CLI modes

---

## 🧰 Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Runtime    | Node.js                                       |
| Framework  | Express 5                                     |
| Templating | EJS + express-ejs-layouts                     |
| Database   | MySQL 8+ / TiDB Cloud (mysql2)                |
| Auth       | JWT (jsonwebtoken) + bcryptjs                 |
| Sessions   | express-session                               |
| Rate Limit | express-rate-limit, rate-limiter-flexible     |
| Uploads    | multer                                        |
| Media      | cloudinary                                    |
| Other      | slugify, method-override, morgan, cookie-parser, cors |

---

## 📁 Project Structure

```
venv/
├── config/
│   ├── app.js              # Express app setup, middleware, security headers
│   └── db.js               # MySQL/TiDB connection pool (serverless-safe)
├── controllers/
│   ├── accessController.js # Access requests, invitations, grants, revokes
│   ├── authController.js   # Register, login, logout
│   ├── environmentController.js # Env var CRUD + bulk upsert
│   ├── onboardingController.js  # Profile completion
│   └── projectController.js     # Project CRUD + dashboard
├── db_schema/
│   ├── schema.sql          # Base database schema
│   └── migrations/         # Versioned SQL migrations + runner
├── middlewares/
│   ├── authenticate.js     # JWT auth (required + optional)
│   ├── authorize.js        # Role-based access control
│   ├── rateLimiter.js      # Rate limiting strategies
│   └── validate.js         # Request validation
├── models/
│   ├── Environment.js      # Env var queries
│   ├── Project.js          # Project queries
│   ├── ProjectAccess.js    # Access/invitation queries
│   └── User.js             # User queries
├── public/
│   └── js/                 # Client-side scripts
├── routes/
│   └── web.js              # All web routes
├── utils/
│   ├── AppError.js         # Error class with factories
│   └── errorHandler.js     # Global error + 404 handlers
├── views/                  # EJS templates
│   ├── auth/               # Login, register
│   ├── dashboard/          # Dashboard, invitations
│   ├── layouts/            # Application layout
│   ├── onboarding/         # Profile setup
│   └── projects/           # Create, edit, settings, show
├── .gitignore
├── LICENSE
├── package.json
├── server.js               # Entry point
└── vercel.json             # Vercel deployment config
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **MySQL 8+** or a **TiDB Cloud** database
- npm

### 1. Clone & Install

```bash
git clone git@github.com:qadeer015/venv.git
cd venv
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (MySQL / TiDB Cloud)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=venv_manager
DB_PORT=4000

# Auth
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret

# Optional: Redis for distributed rate limiting
# REDIS_URL=redis://localhost:6379
```

> **Note:** `DB_PORT` defaults to `4000` (TiDB Cloud default). For local MySQL, use `3306`.

### 3. Set Up the Database

Create the database and tables:

```bash
npm run db:create
```

Run pending migrations:

```bash
npm run db:migrate -- --all
```

The migration runner also supports:
```bash
npm run db:migrate              # Interactive mode
npm run db:migrate -- --list    # Show migration status
npm run db:migrate -- 001 003   # Run specific migrations
```

### 4. Start the Server

```bash
npm run dev     # Development (nodemon)
# or
npm start       # Production
```

Visit **http://localhost:3000** — you'll be redirected to the login page.

---

## 🧭 Usage Guide

### First-Time Setup
1. **Register** an account (email + password, min 8 chars)
2. Complete the **onboarding** form (name, unique username, organization)
3. You'll land on your **dashboard**

### Managing Projects
- Click **Create Project** and fill in name, GitHub URL, domain, and description
- Your project is accessible at `/{username}/{project-slug}`
- Use **Edit** and **Settings** (owner only) to manage project details and access

### Managing Environment Variables
- On a project page, select an environment tab: `development`, `staging`, or `production`
- Add variables one at a time, or use **bulk import** for many at once
- Keys must be uppercase with underscores (e.g., `API_KEY`, `DATABASE_URL`)
- Add optional notes to document each variable

### Collaborating
- **Request access** to a project you don't own
- **Invite users** from project settings (by username or email) — invitations expire in 7 days
- **Grant direct access** to a user by email
- **Approve/reject** pending requests from your dashboard or settings
- **Revoke access** anytime
- Permissions: `view` (read-only) or `edit` (can modify env vars)

---

## 🗄️ Database Schema

### `users`
| Column       | Type                          | Notes                    |
|--------------|-------------------------------|--------------------------|
| id           | BIGINT UNSIGNED AUTO_INCREMENT| Primary key              |
| email        | VARCHAR(255) UNIQUE           |                          |
| password     | VARCHAR(255)                  | bcrypt-hashed            |
| name         | VARCHAR(255)                  |                          |
| username     | VARCHAR(100) UNIQUE           |                          |
| organization | VARCHAR(255)                  |                          |
| role         | ENUM('user','admin')          | Default: `user`          |
| status       | ENUM('active','deleted')      | Soft-delete support      |
| onboarded    | TINYINT(1)                    |                          |
| created_at / updated_at | TIMESTAMP          |                          |

### `projects`
| Column       | Type                          | Notes                    |
|--------------|-------------------------------|--------------------------|
| id           | BIGINT UNSIGNED AUTO_INCREMENT| Primary key              |
| user_id      | BIGINT UNSIGNED FK → users    | Owner                    |
| name         | VARCHAR(255)                  |                          |
| slug         | VARCHAR(255)                  | Unique per user          |
| github_url   | VARCHAR(500)                  |                          |
| domain       | VARCHAR(500)                  |                          |
| description  | TEXT                          |                          |
| created_at / updated_at | TIMESTAMP          |                          |

### `environments`
| Column       | Type                          | Notes                    |
|--------------|-------------------------------|--------------------------|
| id           | BIGINT UNSIGNED AUTO_INCREMENT| Primary key              |
| project_id   | BIGINT UNSIGNED FK → projects |                          |
| env_key      | VARCHAR(255)                  | e.g., `DATABASE_URL`     |
| env_value    | TEXT                          |                          |
| environment  | ENUM('development','staging','production') | Default: `development` |
| note         | TEXT                          | Optional                 |
| created_at / updated_at | TIMESTAMP          |                          |
| Unique       | (project_id, env_key, environment) |                        |

### `project_access`
| Column       | Type                          | Notes                    |
|--------------|-------------------------------|--------------------------|
| id           | BIGINT UNSIGNED AUTO_INCREMENT| Primary key              |
| project_id   | BIGINT UNSIGNED FK → projects |                          |
| user_id      | BIGINT UNSIGNED FK → users    |                          |
| permission   | ENUM('view','edit')           | Default: `view`          |
| status       | ENUM('pending','approved','rejected','invited','accepted','declined','expired') | |
| expires_at   | TIMESTAMP                     | Invitation expiry (7 days) |
| created_at / updated_at | TIMESTAMP          |                          |
| Unique       | (project_id, user_id)         |                          |

### `migrations`
Tracks executed migration files (filename, name, executed_at).

---

## 🧩 API Routes

### Auth
| Method | Route            | Description          |
|--------|------------------|----------------------|
| GET    | `/auth/login`    | Show login page      |
| GET    | `/auth/register` | Show register page   |
| POST   | `/auth/register` | Create account       |
| POST   | `/auth/login`    | Log in               |
| POST   | `/auth/logout`   | Log out              |

### Onboarding
| Method | Route         | Description              |
|--------|---------------|--------------------------|
| GET    | `/onboarding` | Show profile setup page  |
| POST   | `/onboarding` | Complete profile setup   |

### Projects
| Method | Route                              | Description              |
|--------|------------------------------------|--------------------------|
| GET    | `/new`                             | Show create form         |
| POST   | `/projects`                        | Create project           |
| GET    | `/:username/:projectSlug`          | View project + env vars  |
| GET    | `/:username/:projectSlug/edit`     | Show edit form           |
| GET    | `/:username/:projectSlug/settings` | Show settings (owner)    |
| PUT    | `/:username/:projectSlug`          | Update project           |
| DELETE | `/:username/:projectSlug`          | Delete project           |
| GET    | `/:username`                       | User dashboard           |

### Environment Variables
| Method | Route                                          | Description              |
|--------|------------------------------------------------|--------------------------|
| POST   | `/:username/:projectSlug/environments`         | Add/update env var       |
| POST   | `/:username/:projectSlug/environments/bulk`    | Bulk upsert env vars     |
| DELETE | `/:username/:projectSlug/environments/:envId`  | Delete env var           |

### Access Control
| Method | Route                                                  | Description              |
|--------|--------------------------------------------------------|--------------------------|
| GET    | `/:username/:projectSlug/invitations`                  | View invitation page     |
| POST   | `/:username/:projectSlug/invitations/accept`           | Accept invitation        |
| POST   | `/:username/:projectSlug/invitations/decline`          | Decline invitation       |
| POST   | `/:username/:projectSlug/access/request`               | Request access           |
| POST   | `/:username/:projectSlug/access/grant`                 | Grant direct access      |
| POST   | `/:username/:projectSlug/access/invite`                | Invite user              |
| POST   | `/:username/:projectSlug/access/:accessId/approve`     | Approve request          |
| POST   | `/:username/:projectSlug/access/:accessId/reject`      | Reject request           |
| DELETE | `/:username/:projectSlug/access/:accessId`             | Revoke access            |
| GET    | `/api/users/search?q=`                                 | Search users (JSON)      |

---

## ☁️ Deploying to Vercel

This project is configured for Vercel serverless deployment via `vercel.json`.

1. **Push to GitHub** and import the repo in Vercel
2. Set the following **Environment Variables** in Vercel:
   - `NODE_ENV=production`
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
   - `JWT_SECRET`, `SESSION_SECRET`
3. Deploy — Vercel will use `server.js` as the entry point

> **Serverless notes:** The database pool is tuned for serverless (low connection limit, hard query timeouts) to avoid exhausting TiDB Cloud connection limits. SSL is verified in production.

---

## 🧪 Scripts

| Script                  | Description                              |
|-------------------------|------------------------------------------|
| `npm start`             | Start the server (production)            |
| `npm run dev`           | Start with nodemon (auto-reload)         |
| `npm run db:create`     | Create database + tables from schema.sql |
| `npm run db:migrate`    | Run migrations (interactive)             |
| `npm run db:migrate -- --all` | Run all pending migrations         |
| `npm run db:migrate -- --list` | Show migration status             |

---

## 🔒 Security Considerations

- **JWT** stored in httpOnly, `sameSite: strict` cookies
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting on auth endpoints (5 attempts/hour) and general API (100/15min)
- Security headers set globally (clickjacking, MIME sniffing, XSS, referrer policy)
- Cache-Control disabled for sensitive pages
- Permissions-Policy restricts browser features (geolocation, camera, mic, etc.)
- Access control enforced at the controller level (owner vs. view/edit permissions)
- Invitations auto-expire after 7 days

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request