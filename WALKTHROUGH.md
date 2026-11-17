# Pocketbook Technical Walkthrough

## 1. How Authentication Works
1. On `POST /api/auth/register`, the server validates `name`, `email`, and `password` with Joi, hashes the password with `bcryptjs` (cost 10), creates the user, creates a default `Cash` account, and signs a JWT containing `{ id: user._id }` with `JWT_EXPIRES_IN` (default `1d`).
2. On `POST /api/auth/login`, the server loads the user with `+password`, compares the password hash, runs `createDueRecurring(user._id)`, and returns the JWT and public user fields.
3. Protected routes use `middleware/auth.js`, which reads `Authorization: Bearer <token>`, verifies it with `jwt.verify`, and sets `req.user = { id: payload.id }`. Expired or invalid tokens return `401`.
4. On the frontend, `AuthContext` stores the token in `localStorage`, calls `GET /api/auth/me` on startup, and registers an Axios response interceptor that clears the token and logs the user out if any API call returns `401`.

## 2. How Data Isolation Is Enforced
- Every database query (`find`, `findOne`, `findOneAndUpdate`, `findOneAndDelete`, `aggregate`) filters by `user: req.user.id` (or `new mongoose.Types.ObjectId(req.user.id)` in aggregations).
- Route `:id` parameters pass through `validId()` first, returning `404` for malformed ObjectIds before hitting Mongoose.
- When a record is not found or belongs to another user, the API returns `404` rather than `403` so attackers cannot probe whether an ID exists.
- Creating or editing a transaction calls `checkReferences`, verifying that the referenced `account` belongs to `req.user.id` and the `category` is either a default or belongs to `req.user.id`.
- Attachments have `data: { type: Buffer, select: false }` on the schema and are only streamed through `GET /api/transactions/:id/attachment`, which checks both `auth` and `{ _id: req.params.id, user: req.user.id }`.

## 3. How Recurring Transactions Work
- Free hosting tiers sleep when idle, so cron jobs are unreliable. Instead, `createDueRecurring(userId)` runs on login, dashboard load, and transactions list fetch.
- A recurring transaction has `recurring: true`, `frequency` (`Daily`, `Weekly`, `Monthly`, `Yearly`), and `nextDate`.
- For each template with `nextDate <= now`, the loop computes `next = addPeriod(due, frequency)` and runs `Transaction.findOneAndUpdate({ _id: t._id, user: userId, recurring: true, nextDate: due }, { nextDate: next })`.
- Because `nextDate: due` is part of the filter, if two concurrent requests try to process the same occurrence, only one update matches and creates the child transaction (`parent: t._id`).
- A cap of `24` created transactions per run prevents long loops if a user returns after a long break.

## 4. How Analytics Are Computed
- `GET /api/analytics?range=week|month|3months|year` computes `[from, to)` UTC date boundaries and runs three parallel MongoDB `aggregate` pipelines on `Transaction`:
  1. Total `Income` and `Expense` in the window, from which `netSavings = income - expenses`.
  2. Expense totals grouped by `category`, sorted descending, with percentage of total expenses.
  3. Income and expenses grouped by day (`%Y-%m-%d` for `week`/`month`) or month (`%Y-%m` for `3months`/`year`), then merged into a complete date-bucket array so empty days/months still render as `0`.

## 5. Likely Interview Questions & Short Answers
1. **Why separate `app.js` and `server.js`?**
   So Supertest can import `app` in tests and bind ephemeral ports without triggering `mongoose.connect()` or `app.listen()`.
2. **How do you prevent NoSQL operator injection?**
   `express-mongo-sanitize` strips `$` and `.` keys, Joi validates and strips unknown fields on every route, `mongoose.set('sanitizeFilter', true)` is enabled, and `escapeRegex` escapes user search strings.
3. **Why return `404` instead of `403` for another user's record?**
   Returning `404` prevents ID enumeration attacks—an attacker cannot tell whether an ID belongs to someone else or does not exist.
4. **How do you prevent duplicate recurring transactions under concurrent requests?**
   An atomic `findOneAndUpdate` matches `{ _id, recurring: true, nextDate: due }` and advances `nextDate` before inserting the child copy. Only one request can match `due`.
5. **Why is there no opening balance field on Accounts?**
   Every account balance is derived strictly from `income - expenses`, guaranteeing that the sum of account balances always equals the dashboard's Total Balance.
6. **How do you protect CSV exports from formula injection?**
   `safeCell()` prefixes any cell starting with `=`, `+`, `-`, `@`, tab, or carriage return with a leading single quote `'`, and escapes quotes/commas.
7. **How do you validate uploaded receipts?**
   Multer enforces a 1 MB limit in memory, checks MIME type, and `looksLikeType()` verifies the file's magic bytes (JPG, PNG, GIF, WebP, PDF) so renamed scripts are rejected.
8. **Why `localStorage` for JWT vs `HttpOnly` cookies, and what is the trade-off?**
   `localStorage` is simple across separate Vercel/Render domains without CSRF tokens, at the cost of XSS exposure; Helmet and strict input handling mitigate XSS.
9. **How does `addPeriod` handle month-end dates like Jan 31?**
   It sets the day to `1` before adding months, then clamps to the last day of the target month (`Feb 28` or `29`), avoiding JavaScript `Date` overflow into March.
10. **What happens if a user's JWT expires while using the app?**
    The server returns `401`, and the Axios response interceptor clears `pocketbook_token` and triggers `AuthContext` to redirect the user to `/login`.
