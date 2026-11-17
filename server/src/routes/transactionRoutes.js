const router = require('express').Router();
const validate = require('../middleware/validate');
const validId = require('../middleware/validId');
const schemas = require('../validators/transactionSchemas');
const { upload } = require('../utils/upload');
const c = require('../controllers/transactionController');

router.get('/', validate(schemas.transactionQuery, 'query'), c.list);
router.get('/export', validate(schemas.transactionQuery, 'query'), c.exportCsv);
router.post('/', upload, validate(schemas.transactionCreate), c.create);
router.get('/:id', validId(), c.getOne);
router.get('/:id/attachment', validId(), c.attachment);
router.put('/:id', validId(), upload, validate(schemas.transactionUpdate), c.update);
router.delete('/:id', validId(), c.remove);

module.exports = router;
