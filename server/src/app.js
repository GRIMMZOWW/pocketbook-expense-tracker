const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./utils/config');
const auth = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

// Mongoose strips query operators ($ne, $gt...) from user input unless marked trusted.
mongoose.set('sanitizeFilter', true);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl.split(',').map((u) => u.trim()),
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/accounts', auth, require('./routes/accountRoutes'));
app.use('/api/categories', auth, require('./routes/categoryRoutes'));

app.use('/api/transactions', auth, require('./routes/transactionRoutes'));
const feature = require('./routes/featureRoutes');
app.use('/api/budgets', auth, feature.budgetRouter);
app.use('/api/goals', auth, feature.goalRouter);
app.use('/api/analytics', auth, feature.analyticsRouter);
app.use('/api/dashboard', auth, feature.dashboardRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

