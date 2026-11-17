const mongoose = require('mongoose');
const app = require('./app');
const config = require('./utils/config');

async function start() {
  if (!config.mongoUri || !config.jwtSecret) {
    console.error('MONGO_URI and JWT_SECRET must be set. Copy .env.example to .env.');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

start().catch((err) => {
  console.error('Could not start server:', err.message);
  process.exit(1);
});
