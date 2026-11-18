# Pocketbook

Pocketbook is a full-stack MERN personal expense tracker for recording daily income and expenses, tracking account balances, setting monthly and category budgets, managing savings goals, and reviewing spending trends.

## Live Demo
- **Frontend URL**: `<add-your-vercel-url>`
- **Backend URL**: `<add-your-render-url>`

> The backend runs on a free host. The first request after a quiet period can take about a minute.

## Demo Account
- **Email**: `demo@pocketbook.dev`
- **Password**: `Demo@1234`

It holds sample data created with `npm run seed:demo`, so reviewers can look around without registering.

## Screenshots
Screenshots live in [docs/screenshots/](docs/screenshots/).

## Features
- **Authentication**: Register, log in, and log out with bcrypt-hashed passwords and 1-day JWT Bearer tokens. Registering creates a default `Cash` account.
- **Data Isolation**: Every database query filters by the logged-in user. Cross-user reads, edits, or deletes return `404`.
- **Transactions & Receipts**: Add, edit, and delete income or expense entries with optional image/PDF attachments (max 1 MB, stored in MongoDB and served only to the owner).
- **History & Search**: Server-side pagination (max 50 per page), combinable filters (type, category, account, date range, amount range), and search by note, category, or amount.
- **Accounts**: Track balances across Cash, Bank Account, Credit Card, Wallet, and Savings. Each account balance is computed as `income - expenses`.
- **Dashboard & Analytics**: Total balance, income, expenses, 6-month overview chart, last 10 transactions, and switchable analytics (`Week`, `Month`, `3 Months`, `Year`) with category donut and spending trend charts powered by MongoDB aggregations.
- **Budgets**: One overall monthly budget plus independent per-category budgets, with progress bars and threshold warnings at 50%, 75%, 90%, and 100%+.
- **Recurring Transactions**: Daily, Weekly, Monthly, and Yearly schedules that catch up on missed occurrences (capped at 24 per run) on login, dashboard load, or transactions fetch using an atomic `nextDate` claim.
- **Savings Goals**: Create target goals and record atomic contributions with live progress percentages.
- **CSV Export**: Download filtered transactions as CSV with comma/quote escaping and spreadsheet formula-injection protection.

## Architecture
- `/server`: Express 4 REST API + Mongoose 9 + Joi validation + Multer memory uploads. `src/app.js` exports the Express app (without `listen`) so Supertest can test it directly; `src/server.js` connects to MongoDB and starts listening.
- `/client`: Vite + React 19 single-page application using React Router, Context API (`AuthContext`), Axios (with Bearer token and 401 auto-logout), Recharts, and `lucide-react` icons. Currency symbol (`₹`) lives in `client/src/utils/currency.js`.

## API Endpoints

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/register` | Register user and create Cash account | No |
| POST | `/api/auth/login` | Log in and run recurring catch-up | No |
| POST | `/api/auth/logout` | Log out | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/dashboard` | Balance totals, budget, chart, last 10 transactions | Yes |
| GET | `/api/analytics` | Period totals, category breakdown, trend | Yes |
| GET | `/api/accounts` | List accounts with balances and combined total | Yes |
| POST | `/api/accounts` | Create account | Yes |
| PUT | `/api/accounts/:id` | Update account | Yes |
| DELETE | `/api/accounts/:id` | Delete unused account | Yes |
| GET | `/api/categories` | Default + user custom categories | Yes |
| POST | `/api/categories` | Create custom category | Yes |
| DELETE | `/api/categories/:id` | Delete unused custom category | Yes |
| GET | `/api/transactions` | Paginated, filtered, searched transactions | Yes |
| GET | `/api/transactions/export` | Download filtered transactions as CSV | Yes |
| POST | `/api/transactions` | Create transaction (optional attachment) | Yes |
| GET | `/api/transactions/:id` | Get single transaction | Yes |
| GET | `/api/transactions/:id/attachment` | Download attachment (owner only) | Yes |
| PUT | `/api/transactions/:id` | Update transaction | Yes |
| DELETE | `/api/transactions/:id` | Delete transaction | Yes |
| GET | `/api/budgets` | Overall + category budgets for a month | Yes |
| PUT | `/api/budgets` | Create or update a monthly/category budget | Yes |
| DELETE | `/api/budgets/:id` | Delete budget | Yes |
| GET | `/api/goals` | List savings goals with progress % | Yes |
| POST | `/api/goals` | Create savings goal | Yes |
| PUT | `/api/goals/:id` | Update savings goal | Yes |
| POST | `/api/goals/:id/contribute` | Add money to a savings goal | Yes |
| DELETE | `/api/goals/:id` | Delete savings goal | Yes |

## Local Setup

1. **Clone and install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure environment variables**
   Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then fill in your values.

   Server (`server/.env`):
   - `PORT` (default `5000`)
   - `MONGO_URI` (MongoDB Atlas connection string)
   - `JWT_SECRET` (long random secret string)
   - `JWT_EXPIRES_IN` (e.g. `1d`)
   - `CLIENT_URL` (e.g. `http://localhost:5173`)

   Client (`client/.env`):
   - `VITE_API_URL` (e.g. `http://localhost:5000/api`)

3. **Seed demo data (optional)**
   ```bash
   cd server && npm run seed:demo
   ```

4. **Run locally**
   ```bash
   # Terminal 1 (API)
   cd server && npm run dev

   # Terminal 2 (Frontend)
   cd client && npm run dev
   ```

## Tests
```bash
# Backend (Jest + Supertest + mongodb-memory-server)
cd server && npm test

# Frontend (Vitest + React Testing Library)
cd client && npm test
```

## Deployment
1. **MongoDB Atlas**: Create a free M0 cluster, add a database user, allow network access (`0.0.0.0/0` for Render), and copy the `MONGO_URI` connection string.
2. **Render (Server)**: Create a Web Service rooted at `server`.
   - Build command: `npm install`
   - Start command: `npm start`
   - Env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=1d`, `CLIENT_URL=https://<your-vercel-domain>`
3. **Vercel (Client)**: Import the repo with root directory `client` (Vite preset).
   - Build command: `npm run build`
   - Output directory: `dist`
   - Env var: `VITE_API_URL=https://<your-render-domain>/api`

## Known Limitations
- JWT is stored in `localStorage` instead of an `HttpOnly` cookie, so any XSS vulnerability would expose the token.
- Free-tier Render instances sleep after inactivity, causing a cold-start delay on the first request.
- Receipt attachments are capped at 1 MB and stored inside MongoDB documents rather than external object storage.
- No email verification or password reset flow is included.
