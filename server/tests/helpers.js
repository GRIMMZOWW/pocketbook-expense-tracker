const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');

let mongod;

async function connectDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function clearDb() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function closeDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

// Registers a user and returns { token, id, auth } where auth is the header value.
async function registerUser(name = 'Test User', email = 'test@example.com') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'password123' });
  return { token: res.body.token, id: res.body.user.id, auth: `Bearer ${res.body.token}` };
}

module.exports = { app, request, connectDb, clearDb, closeDb, registerUser };
