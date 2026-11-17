const { app, request, connectDb, clearDb, closeDb, registerUser } = require('./helpers');

beforeAll(connectDb);
afterEach(clearDb);
afterAll(closeDb);

async function setup() {
  const user = await registerUser();
  const accounts = await request(app).get('/api/accounts').set('Authorization', user.auth);
  return { user, accountId: accounts.body.data[0]._id };
}

const add = (user, accountId, extra = {}) =>
  request(app)
    .post('/api/transactions')
    .set('Authorization', user.auth)
    .send({ amount: 100, type: 'Expense', category: 'Food', account: accountId, note: 'lunch', date: '2026-11-05', ...extra });

describe('transaction CRUD', () => {
  it('creates, reads, updates and deletes', async () => {
    const { user, accountId } = await setup();
    const created = await add(user, accountId);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ amount: 100, type: 'Expense', category: 'Food', note: 'lunch' });
    const id = created.body._id;

    const got = await request(app).get(`/api/transactions/${id}`).set('Authorization', user.auth);
    expect(got.body.account.name).toBe('Cash');

    const updated = await request(app).put(`/api/transactions/${id}`).set('Authorization', user.auth)
      .send({ amount: 250.5, type: 'Expense', category: 'Travel', account: accountId, note: 'cab', date: '2026-11-06' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ amount: 250.5, category: 'Travel', note: 'cab' });

    const del = await request(app).delete(`/api/transactions/${id}`).set('Authorization', user.auth);
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/transactions/${id}`).set('Authorization', user.auth);
    expect(gone.status).toBe(404);
  });

  it('defaults the date to today', async () => {
    const { user, accountId } = await setup();
    const res = await request(app).post('/api/transactions').set('Authorization', user.auth)
      .send({ amount: 5, type: 'Income', category: 'Gift', account: accountId });
    expect(res.status).toBe(201);
    expect(res.body.date.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it('validates input', async () => {
    const { user, accountId } = await setup();
    const cases = [
      { amount: 0 }, { amount: -5 }, { amount: 'abc' }, { type: 'Transfer' },
      { category: 'Nonsense' }, { account: 'not-an-id' }, { date: 'yesterday' },
      { recurring: true }, // frequency missing
    ];
    for (const extra of cases) {
      const res = await add(user, accountId, extra);
      expect(res.status).toBe(400);
    }
  });

  it('accepts a custom category of the right type only', async () => {
    const { user, accountId } = await setup();
    await request(app).post('/api/categories').set('Authorization', user.auth).send({ name: 'Pets', type: 'Expense' });
    expect((await add(user, accountId, { category: 'Pets' })).status).toBe(201);
    expect((await add(user, accountId, { category: 'Pets', type: 'Income' })).status).toBe(400);
  });

  it('computes balances as income minus expenses', async () => {
    const { user, accountId } = await setup();
    await add(user, accountId, { amount: 1000, type: 'Income', category: 'Salary' });
    await add(user, accountId, { amount: 250 });
    const res = await request(app).get('/api/accounts').set('Authorization', user.auth);
    expect(res.body.data[0].balance).toBe(750);
    expect(res.body.total).toBe(750);
    const dash = await request(app).get('/api/dashboard').set('Authorization', user.auth);
    expect(dash.body).toMatchObject({ totalIncome: 1000, totalExpenses: 250, totalBalance: 750 });
  });
});

describe('attachments', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  it('stores an attachment and serves it only to the owner', async () => {
    const { user, accountId } = await setup();
    const other = await registerUser('Other', 'other@example.com');
    const res = await request(app).post('/api/transactions').set('Authorization', user.auth)
      .field('amount', '40').field('type', 'Expense').field('category', 'Bills').field('account', accountId)
      .attach('attachment', png, { filename: 'receipt.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.attachment.name).toBe('receipt.png');
    expect(res.body.attachment.data).toBeUndefined();

    const mine = await request(app).get(`/api/transactions/${res.body._id}/attachment`).set('Authorization', user.auth);
    expect(mine.status).toBe(200);
    expect(mine.headers['content-type']).toBe('image/png');
    const anon = await request(app).get(`/api/transactions/${res.body._id}/attachment`);
    expect(anon.status).toBe(401);
    const theirs = await request(app).get(`/api/transactions/${res.body._id}/attachment`).set('Authorization', other.auth);
    expect(theirs.status).toBe(404);
  });

  it('rejects files over 1 MB, wrong types and fake content', async () => {
    const { user, accountId } = await setup();
    const send = (buf, name, type) =>
      request(app).post('/api/transactions').set('Authorization', user.auth)
        .field('amount', '40').field('type', 'Expense').field('category', 'Bills').field('account', accountId)
        .attach('attachment', buf, { filename: name, contentType: type });
    expect((await send(Buffer.alloc(1024 * 1024 + 10, 1), 'big.png', 'image/png')).status).toBe(400);
    expect((await send(Buffer.from('hello'), 'x.txt', 'text/plain')).status).toBe(400);
    expect((await send(Buffer.from('<script>alert(1)</script>'), 'x.png', 'image/png')).status).toBe(400);
  });
});

describe('history: pagination, filters, search', () => {
  async function seed() {
    const ctx = await setup();
    const { user, accountId } = ctx;
    const bank = await request(app).post('/api/accounts').set('Authorization', user.auth).send({ name: 'HDFC', type: 'Bank Account' });
    ctx.bankId = bank.body._id;
    await add(user, accountId, { amount: 50, category: 'Food', note: 'Coffee, large', date: '2026-10-01' });
    await add(user, accountId, { amount: 200, category: 'Travel', note: 'Metro card', date: '2026-10-15' });
    await add(user, ctx.bankId, { amount: 5000, type: 'Income', category: 'Salary', note: 'October pay', date: '2026-10-31' });
    await add(user, ctx.bankId, { amount: 1200, category: 'Shopping', note: '50% off sale (shoes)', date: '2026-11-03' });
    await add(user, accountId, { amount: 75, category: 'Food', note: 'Dinner', date: '2026-11-10' });
    return ctx;
  }
  const get = (user, qs) => request(app).get(`/api/transactions?${qs}`).set('Authorization', user.auth);

  it('paginates with the right shape, newest first', async () => {
    const { user } = await seed();
    const res = await get(user, 'page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].note).toBe('October pay');
  });

  it('caps limit at 50 by rejecting larger values', async () => {
    const { user } = await seed();
    expect((await get(user, 'limit=51')).status).toBe(400);
    expect((await get(user, 'page=0')).status).toBe(400);
  });

  it('filters by type, category, account', async () => {
    const { user, bankId } = await seed();
    expect((await get(user, 'type=Income')).body.total).toBe(1);
    expect((await get(user, 'category=Food')).body.total).toBe(2);
    expect((await get(user, `account=${bankId}`)).body.total).toBe(2);
  });

  it('filters by date range (inclusive end) and amount range', async () => {
    const { user } = await seed();
    expect((await get(user, 'from=2026-10-15&to=2026-10-31')).body.total).toBe(2);
    expect((await get(user, 'minAmount=100&maxAmount=1200')).body.total).toBe(2);
  });

  it('combines filters', async () => {
    const { user } = await seed();
    const res = await get(user, 'type=Expense&category=Food&from=2026-11-01');
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].note).toBe('Dinner');
  });

  it('searches note, category and amount, with regex characters escaped', async () => {
    const { user } = await seed();
    expect((await get(user, 'search=metro')).body.total).toBe(1);
    expect((await get(user, 'search=shopping')).body.total).toBe(1);
    expect((await get(user, 'search=75')).body.total).toBe(1);
    expect((await get(user, `search=${encodeURIComponent('(shoes)')}`)).body.total).toBe(1);
    expect((await get(user, `search=${encodeURIComponent('.*')}`)).body.total).toBe(0);
    expect((await get(user, `search=${encodeURIComponent('(((')}`)).status).toBe(200);
  });

  it('ignores operator injection in the query string', async () => {
    const { user } = await seed();
    const res = await get(user, 'type[$ne]=Income');
    expect(res.status).toBe(400);
    const res2 = await get(user, 'user[$ne]=x');
    expect(res2.body.total).toBe(5);
  });
});

describe('CSV export', () => {
  it('returns the exact header, formatted dates, escaping and formula protection', async () => {
    const { user, accountId } = await setup();
    await add(user, accountId, { note: 'a, "quoted" note', date: '2026-11-05' });
    await add(user, accountId, { note: '=HYPERLINK("http://evil.test")', date: '2026-11-04' });
    await add(user, accountId, { note: '@SUM(A1)', date: '2026-11-03' });
    const res = await request(app).get('/api/transactions/export?type=Expense').set('Authorization', user.auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Account,Amount,Note');
    expect(lines[1]).toBe('2026-11-05,Expense,Food,Cash,100.00,"a, ""quoted"" note"');
    expect(lines[2]).toBe(`2026-11-04,Expense,Food,Cash,100.00,"'=HYPERLINK(""http://evil.test"")"`);
    expect(lines[3]).toBe("2026-11-03,Expense,Food,Cash,100.00,'@SUM(A1)");
  });

  it('only exports my own rows', async () => {
    const a = await setup();
    const b = await registerUser('B', 'b@example.com');
    await add(a.user, a.accountId);
    const res = await request(app).get('/api/transactions/export').set('Authorization', b.auth);
    expect(res.text.trim()).toBe('Date,Type,Category,Account,Amount,Note');
  });
});
