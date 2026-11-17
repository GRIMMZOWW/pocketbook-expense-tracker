const Transaction = require('../src/models/Transaction');
const { createDueRecurring, addPeriod } = require('../src/utils/recurring');
const { app, request, connectDb, clearDb, closeDb, registerUser } = require('./helpers');

beforeAll(connectDb);
afterEach(clearDb);
afterAll(closeDb);

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

async function setup() {
  const user = await registerUser();
  const accounts = await request(app).get('/api/accounts').set('Authorization', user.auth);
  return { user, accountId: accounts.body.data[0]._id };
}

const add = (user, accountId, extra = {}) =>
  request(app).post('/api/transactions').set('Authorization', user.auth)
    .send({ amount: 100, type: 'Expense', category: 'Food', account: accountId, ...extra });

describe('recurring', () => {
  it('addPeriod clamps month ends', () => {
    expect(addPeriod('2026-01-31T00:00:00Z', 'Monthly').toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(addPeriod('2026-11-05T00:00:00Z', 'Weekly').toISOString().slice(0, 10)).toBe('2026-11-12');
    expect(addPeriod('2028-02-29T00:00:00Z', 'Yearly').toISOString().slice(0, 10)).toBe('2029-02-28');
    expect(addPeriod('2026-11-05T00:00:00Z', 'Daily').toISOString().slice(0, 10)).toBe('2026-11-06');
  });

  it('creates every missed occurrence once', async () => {
    const { user, accountId } = await setup();
    const res = await add(user, accountId, { date: daysAgo(3), recurring: true, frequency: 'Daily' });
    expect(res.status).toBe(201);
    const list = await request(app).get('/api/transactions').set('Authorization', user.auth);
    // original (3 days ago) + copies for 2, 1 and 0 days ago
    expect(list.body.total).toBe(4);
    const again = await request(app).get('/api/transactions').set('Authorization', user.auth);
    expect(again.body.total).toBe(4);
  });

  it('does not create duplicates when two requests run together', async () => {
    const { user, accountId } = await setup();
    await add(user, accountId, { date: daysAgo(5), recurring: true, frequency: 'Daily' });
    await Promise.all([createDueRecurring(user.id), createDueRecurring(user.id), createDueRecurring(user.id)]);
    expect(await Transaction.countDocuments({ user: user.id })).toBe(6);
  });

  it('stops at 24 per run, then catches up on the next run', async () => {
    const { user, accountId } = await setup();
    await add(user, accountId, { date: daysAgo(40), recurring: true, frequency: 'Daily' });
    expect(await createDueRecurring(user.id)).toBe(24);
    expect(await createDueRecurring(user.id)).toBe(16);
    expect(await createDueRecurring(user.id)).toBe(0);
  });

  it('runs on login and on the dashboard', async () => {
    const { user, accountId } = await setup();
    await add(user, accountId, { date: daysAgo(2), recurring: true, frequency: 'Daily' });
    await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
    expect(await Transaction.countDocuments({ user: user.id })).toBe(3);
    await Transaction.updateOne({ user: user.id, recurring: true }, { nextDate: new Date(Date.now() - 1000) });
    await request(app).get('/api/dashboard').set('Authorization', user.auth);
    expect(await Transaction.countDocuments({ user: user.id })).toBe(4);
  });

  it('turning recurring off stops new copies', async () => {
    const { user, accountId } = await setup();
    const res = await add(user, accountId, { date: daysAgo(1), recurring: true, frequency: 'Daily' });
    await request(app).put(`/api/transactions/${res.body._id}`).set('Authorization', user.auth)
      .send({ amount: 100, type: 'Expense', category: 'Food', account: accountId, date: daysAgo(1), recurring: false });
    expect(await createDueRecurring(user.id)).toBe(0);
  });
});

describe('budgets', () => {
  it('returns percent, remaining and the right level and message', async () => {
    const { user, accountId } = await setup();
    const month = thisMonth();
    const set = (amount, category = '') => request(app).put('/api/budgets').set('Authorization', user.auth).send({ month, amount, category });

    let res = await set(1000);
    expect(res.body.overall).toMatchObject({ percentUsed: 0, level: 'ok', message: null, remaining: 1000 });

    const levels = [[500, 'notice', 50], [250, 'warning', 75], [150, 'danger', 90], [125, 'exceeded', 100]];
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = names[Number(month.slice(5)) - 1];
    for (const [spend, level, pct] of levels) {
      await add(user, accountId, { amount: spend });
      res = await request(app).get(`/api/budgets?month=${month}`).set('Authorization', user.auth);
      expect(res.body.overall.level).toBe(level);
      if (level === 'exceeded') {
        expect(res.body.overall.message).toBe('Budget exceeded by ₹25.');
        expect(res.body.overall.remaining).toBe(-25);
      } else {
        expect(res.body.overall.message).toBe(`You have used ${pct}% of your ${monthName} budget.`);
      }
    }
  });

  it('keeps one budget per month (second save updates it)', async () => {
    const { user } = await setup();
    const put = (amount) => request(app).put('/api/budgets').set('Authorization', user.auth).send({ month: '2026-11', amount });
    await put(1000);
    const res = await put(2000);
    expect(res.body.overall.amount).toBe(2000);
    expect(res.body.categories).toHaveLength(0);
  });

  it('tracks category budgets independently', async () => {
    const { user, accountId } = await setup();
    const month = thisMonth();
    await request(app).put('/api/budgets').set('Authorization', user.auth).send({ month, amount: 10000 });
    await request(app).put('/api/budgets').set('Authorization', user.auth).send({ month, amount: 200, category: 'Food' });
    await add(user, accountId, { amount: 190, category: 'Food' });
    await add(user, accountId, { amount: 500, category: 'Travel' });
    const res = await request(app).get(`/api/budgets?month=${month}`).set('Authorization', user.auth);
    expect(res.body.overall.spent).toBe(690);
    expect(res.body.categories[0]).toMatchObject({ category: 'Food', spent: 190, level: 'danger' });
  });

  it('validates month and amount', async () => {
    const { user } = await setup();
    const put = (body) => request(app).put('/api/budgets').set('Authorization', user.auth).send(body);
    expect((await put({ month: '2026-13', amount: 100 })).status).toBe(400);
    expect((await put({ month: '2026-11', amount: -1 })).status).toBe(400);
    expect((await put({ month: '2026-11', amount: 100, category: 'Nope' })).status).toBe(400);
  });
});

describe('goals', () => {
  it('creates, adds money, shows progress, updates and deletes', async () => {
    const { user } = await setup();
    const created = await request(app).post('/api/goals').set('Authorization', user.auth)
      .send({ name: 'Trip', targetAmount: 1000, targetDate: '2027-01-01' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ currentAmount: 0, progress: 0 });
    const id = created.body._id;

    const added = await request(app).post(`/api/goals/${id}/contribute`).set('Authorization', user.auth).send({ amount: 250 });
    expect(added.body).toMatchObject({ currentAmount: 250, progress: 25 });
    expect((await request(app).post(`/api/goals/${id}/contribute`).set('Authorization', user.auth).send({ amount: -5 })).status).toBe(400);

    const updated = await request(app).put(`/api/goals/${id}`).set('Authorization', user.auth).send({ name: 'Goa trip', targetAmount: 500 });
    expect(updated.body).toMatchObject({ name: 'Goa trip', progress: 50 });

    expect((await request(app).delete(`/api/goals/${id}`).set('Authorization', user.auth)).status).toBe(200);
  });

  it('rejects bad goals', async () => {
    const { user } = await setup();
    expect((await request(app).post('/api/goals').set('Authorization', user.auth).send({ name: '', targetAmount: 0 })).status).toBe(400);
  });
});

describe('analytics', () => {
  it('computes totals, categories and trend from real transactions', async () => {
    const { user, accountId } = await setup();
    await add(user, accountId, { amount: 3000, type: 'Income', category: 'Salary', date: daysAgo(0) });
    await add(user, accountId, { amount: 300, category: 'Food', date: daysAgo(0) });
    await add(user, accountId, { amount: 100, category: 'Travel', date: daysAgo(0) });
    await add(user, accountId, { amount: 999, category: 'Food', date: '2020-01-01' }); // outside every range

    const res = await request(app).get('/api/analytics?range=week').set('Authorization', user.auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ income: 3000, expenses: 400, netSavings: 2600, bucket: 'day' });
    expect(res.body.categories).toEqual([
      { category: 'Food', total: 300, percent: 75 },
      { category: 'Travel', total: 100, percent: 25 },
    ]);
    expect(res.body.trend).toHaveLength(7);
    expect(res.body.trend[6]).toMatchObject({ income: 3000, expenses: 400 });
    expect(res.body.trend[0]).toMatchObject({ income: 0, expenses: 0 });
  });

  it('supports every range', async () => {
    const { user } = await setup();
    const sizes = { week: 7, '3months': 3, year: 12 };
    for (const [range, size] of Object.entries(sizes)) {
      const res = await request(app).get(`/api/analytics?range=${range}`).set('Authorization', user.auth);
      expect(res.body.trend).toHaveLength(size);
    }
    const month = await request(app).get('/api/analytics?range=month').set('Authorization', user.auth);
    expect(month.body.bucket).toBe('day');
    expect((await request(app).get('/api/analytics?range=decade').set('Authorization', user.auth)).status).toBe(400);
  });
});

describe('dashboard', () => {
  it('returns recent 10, chart and budget', async () => {
    const { user, accountId } = await setup();
    for (let i = 0; i < 12; i += 1) await add(user, accountId, { amount: 10 + i, date: daysAgo(i) });
    await request(app).put('/api/budgets').set('Authorization', user.auth).send({ month: thisMonth(), amount: 1000 });
    const res = await request(app).get('/api/dashboard').set('Authorization', user.auth);
    expect(res.body.recent).toHaveLength(10);
    expect(res.body.chart).toHaveLength(6);
    expect(res.body.budget.amount).toBe(1000);
    expect(res.body.totalExpenses).toBe(10 * 12 + 66);
  });
});

describe('security basics', () => {
  it('rate limits auth routes when enabled', async () => {
    process.env.TEST_RATE_LIMIT = '1';
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'whatever12' });
    }
    delete process.env.TEST_RATE_LIMIT;
    expect(last.status).toBe(429);
  });

  it('sets security headers and limits CORS to CLIENT_URL', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await request(app).get('/api/health').set('Origin', 'http://evil.test');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects a body over the size limit and bad JSON without a stack trace', async () => {
    const big = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(20000) });
    expect(big.status).toBe(413);
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    expect(bad.body.stack).toBeUndefined();
  });
});
