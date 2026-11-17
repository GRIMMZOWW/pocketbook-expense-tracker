const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const schemas = require('../validators/schemas');
const c = require('../controllers/authController');

// 10 attempts per 15 minutes. Skipped in tests.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT,
});

router.use(limiter);
router.post('/register', validate(schemas.register), c.register);
router.post('/login', validate(schemas.login), c.login);
router.post('/logout', c.logout);
router.get('/me', auth, c.me);

module.exports = router;
