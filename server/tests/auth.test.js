const jwt = require('jsonwebtoken');
const { app, request, connectDb, clearDb, closeDb, registerUser } = require('./helpers');

beforeAll(connectDb);
afterEach(clearDb);
afterAll(closeDb);

const valid = { name: 'Asha', email: 'asha@example.com', password: 'password123' };

describe('register', () => {
  it('creates a user, returns a token and makes a Cash account', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({ id: expect.any(String), name: 'Asha', email: 'asha@example.com' });
    expect(res.body.user.password).toBeUndefined();

    const accounts = await request(app).get('/api/accounts').set('Authorization', `Bearer ${res.body.token}`);
    expect(accounts.body.data).toHaveLength(1);
    expect(accounts.body.data[0]).toMatchObject({ name: 'Cash', type: 'Cash', balance: 0 });
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
  });

  it('returns field errors for bad input', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '', email: 'nope', password: '123' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('ignores unknown fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, isAdmin: true });
    expect(res.status).toBe(201);
  });
});

describe('login', () => {
  beforeEach(() => request(app).post('/api/auth/register').send(valid));

  it('returns a token for the right password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects the wrong password and unknown email with the same message', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'wrongpass1' });
    const b = await request(app).post('/api/auth/login').send({ email: 'no@example.com', password: 'wrongpass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it('does not accept a NoSQL operator as email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: '' }, password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('protected routes', () => {
  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(app).get('/api/accounts').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const user = await registerUser();
    const old = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${old}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/);
  });

  it('accepts a valid token on /me', async () => {
    const user = await registerUser();
    const res = await request(app).get('/api/auth/me').set('Authorization', user.auth);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });
});

describe('accounts and categories', () => {
  it('creates, updates and deletes an account', async () => {
    const user = await registerUser();
    const created = await request(app).post('/api/accounts').set('Authorization', user.auth).send({ name: 'HDFC', type: 'Bank Account' });
    expect(created.status).toBe(201);
    const id = created.body._id;
    const updated = await request(app).put(`/api/accounts/${id}`).set('Authorization', user.auth).send({ name: 'HDFC Salary', type: 'Bank Account' });
    expect(updated.body.name).toBe('HDFC Salary');
    const del = await request(app).delete(`/api/accounts/${id}`).set('Authorization', user.auth);
    expect(del.status).toBe(200);
  });

  it('rejects an invalid account type and a bad id', async () => {
    const user = await registerUser();
    const bad = await request(app).post('/api/accounts').set('Authorization', user.auth).send({ name: 'X', type: 'Piggy' });
    expect(bad.status).toBe(400);
    const badId = await request(app).delete('/api/accounts/123').set('Authorization', user.auth);
    expect(badId.status).toBe(404);
  });

  it('returns defaults plus only my custom categories', async () => {
    const a = await registerUser('A', 'a@example.com');
    const b = await registerUser('B', 'b@example.com');
    await request(app).post('/api/categories').set('Authorization', a.auth).send({ name: 'Pets', type: 'Expense' });
    const forA = await request(app).get('/api/categories').set('Authorization', a.auth);
    const forB = await request(app).get('/api/categories').set('Authorization', b.auth);
    expect(forA.body.data).toHaveLength(17);
    expect(forB.body.data).toHaveLength(16);
    expect(forA.body.data.some((c) => c.name === 'Pets')).toBe(true);
  });

  it('rejects a custom category that duplicates a default', async () => {
    const user = await registerUser();
    const res = await request(app).post('/api/categories').set('Authorization', user.auth).send({ name: 'food', type: 'Expense' });
    expect(res.status).toBe(409);
  });
});
