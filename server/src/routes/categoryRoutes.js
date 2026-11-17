const router = require('express').Router();
const validate = require('../middleware/validate');
const validId = require('../middleware/validId');
const schemas = require('../validators/schemas');
const c = require('../controllers/categoryController');

router.get('/', c.list);
router.post('/', validate(schemas.category), c.create);
router.delete('/:id', validId(), c.remove);

module.exports = router;
