const router = require('express').Router();
const validate = require('../middleware/validate');
const validId = require('../middleware/validId');
const schemas = require('../validators/schemas');
const c = require('../controllers/accountController');

// auth middleware is applied in app.js for this whole router
router.get('/', c.list);
router.post('/', validate(schemas.account), c.create);
router.put('/:id', validId(), validate(schemas.account), c.update);
router.delete('/:id', validId(), c.remove);

module.exports = router;
