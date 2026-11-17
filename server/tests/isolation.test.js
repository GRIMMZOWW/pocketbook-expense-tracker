const { app, request, connectDb, clearDb, closeDb, registerUser } = require('./helpers');

beforeAll(connectDb);
afterEach(clearDb);
afterAll(closeDb);

// User A owns everything. User B tries to touch it.
async function twoUsers() {
  const a = await registerUser('A', 'a@example.com');
  const b = await registerUser('B', 'b@example.com');
  const accountsA = await request(app).get('/api/accounts').set('Authorization', a.auth);
  const accountsB = await request(app).get('/api/accounts').set('Authorization', b.auth);
  const accountA = accountsA.body.data[0]._id;
  const accountB = accountsB.body.data[0]._id;
  const tx = await request(app).post('/api/transactions').set('Authorization', a.auth)
    .send({ amount: 99, type: 'Expense', category: 'Food', account: accountA, note: 'secret' });
  const goal = await request(app).post('/api/goals').set('Authorization', a.auth).send({ name: 'Laptop', targetAmount: 50000 });
  const budget = await request(app).put('/api/budgets').set('Authorization', a.auth).send({ month: '2026-11', amount: 1000 });
  return { a, b, accountA, accountB, txId: tx.body._id, goalId: goal.body._id, budgetId: budget.body.overall.id };
}

describe('user B cannot touch user A data', () => {
  it('transactions: read, edit, delete all return 404 and change nothing', async () => {
    const { a, b, accountB, txId } = await twoUsers();
    const body = { amount: 1, type: 'Expense', category: 'Food', account: accountB, date: '2026-11-01' };

    expect((await request(app).get(`/api/transactions/${txId}`).set('Authorization', b.auth)).status).toBe(404);
    expect((await request(app).put(`/api/transactions/${txId}`).set('Authorization', b.auth).send(body)).status).toBe(404);
    expect((await request(app).delete(`/api/transactions/${txId}`).set('Authorization', b.auth)).status).toBe(404);

    const mine = await request(app).get(`/api/transactions/${txId}`).set('Authorization', a.auth);
    expect(mine.body).toMatchObject({ amount: 99, note: 'secret' });

    const list = await request(app).get('/api/transactions').set('Authorization', b.auth);
    expect(list.body.total).toBe(0);
  });

  it('accounts: edit and delete return 404', async () => {
    const { a, b, accountA } = await twoUsers();
    const put = await request(app).put(`/api/accounts/${accountA}`).set('Authorization', b.auth).send({ name: 'Hacked', type: 'Cash' });
    expect(put.status).toBe(404);
    expect((await request(app).delete(`/api/accounts/${accountA}`).set('Authorization', b.auth)).status).toBe(404);
    const mine = await request(app).get('/api/accounts').set('Authorization', a.auth);
    expect(mine.body.data[0].name).toBe('Cash');
  });

  it('goals: edit, contribute and delete return 404', async () => {
    const { a, b, goalId } = await twoUsers();
    const put = await request(app).put(`/api/goals/${goalId}`).set('Authorization', b.auth).send({ name: 'x', targetAmount: 1 });
    expect(put.status).toBe(404);
    expect((await request(app).post(`/api/goals/${goalId}/contribute`).set('Authorization', b.auth).send({ amount: 10 })).status).toBe(404);
    expect((await request(app).delete(`/api/goals/${goalId}`).set('Authorization', b.auth)).status).toBe(404);
    const mine = await request(app).get('/api/goals').set('Authorization', a.auth);
    expect(mine.body.data[0]).toMatchObject({ name: 'Laptop', currentAmount: 0 });
  });

  it('budgets: delete returns 404 and list shows nothing', async () => {
    const { b, budgetId } = await twoUsers();
    expect((await request(app).delete(`/api/budgets/${budgetId}`).set('Authorization', b.auth)).status).toBe(404);
    const list = await request(app).get('/api/budgets?month=2026-11').set('Authorization', b.auth);
    expect(list.body.overall).toBeNull();
  });

  it('cannot put a transaction on another user\'s account', async () => {
    const { b, accountA } = await twoUsers();
    const res = await request(app).post('/api/transactions').set('Authorization', b.auth)
      .send({ amount: 5, type: 'Expense', category: 'Food', account: accountA });
    expect(res.status).toBe(404);
  });

  it('cannot move own transaction onto another user\'s account', async () => {
    const { a, accountB, txId } = await twoUsers();
    const res = await request(app).put(`/api/transactions/${txId}`).set('Authorization', a.auth)
      .send({ amount: 99, type: 'Expense', category: 'Food', account: accountB, date: '2026-11-01' });
    expect(res.status).toBe(404);
  });

  it('cannot use another user\'s custom category', async () => {
    const { a, b, accountB } = await twoUsers();
    await request(app).post('/api/categories').set('Authorization', a.auth).send({ name: 'Pets', type: 'Expense' });
    const res = await request(app).post('/api/transactions').set('Authorization', b.auth)
      .send({ amount: 5, type: 'Expense', category: 'Pets', account: accountB });
    expect(res.status).toBe(400);
  });

  it('cannot delete another user\'s custom category', async () => {
    const { a, b } = await twoUsers();
    const cat = await request(app).post('/api/categories').set('Authorization', a.auth).send({ name: 'Pets', type: 'Expense' });
    const res = await request(app).delete(`/api/categories/${cat.body.id}`).set('Authorization', b.auth);
    expect(res.status).toBe(404);
  });

  it('dashboard and analytics only count my data', async () => {
    const { b } = await twoUsers();
    const dash = await request(app).get('/api/dashboard').set('Authorization', b.auth);
    expect(dash.body).toMatchObject({ totalIncome: 0, totalExpenses: 0, totalBalance: 0 });
    expect(dash.body.recent).toHaveLength(0);
    const an = await request(app).get('/api/analytics?range=year').set('Authorization', b.auth);
    expect(an.body.expenses).toBe(0);
  });

  it('invalid ids return 404, not 500', async () => {
    const { a } = await twoUsers();
    for (const path of ['transactions', 'accounts', 'goals', 'budgets', 'categories']) {
      const res = await request(app).delete(`/api/${path}/not-an-id`).set('Authorization', a.auth);
      expect(res.status).toBe(404);
    }
  });
});
