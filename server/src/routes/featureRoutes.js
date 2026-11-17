const express = require('express');
const validate = require('../middleware/validate');
const validId = require('../middleware/validId');
const schemas = require('../validators/featureSchemas');
const budgets = require('../controllers/budgetController');
const goals = require('../controllers/goalController');
const analytics = require('../controllers/analyticsController');
const dashboard = require('../controllers/dashboardController');

// All routes here are behind auth (applied in app.js).
const budgetRouter = express.Router();
budgetRouter.get('/', validate(schemas.budgetQuery, 'query'), budgets.list);
budgetRouter.put('/', validate(schemas.budget), budgets.save);
budgetRouter.delete('/:id', validId(), budgets.remove);

const goalRouter = express.Router();
goalRouter.get('/', goals.list);
goalRouter.post('/', validate(schemas.goal), goals.create);
goalRouter.put('/:id', validId(), validate(schemas.goal), goals.update);
goalRouter.post('/:id/contribute', validId(), validate(schemas.contribute), goals.contribute);
goalRouter.delete('/:id', validId(), goals.remove);

const analyticsRouter = express.Router();
analyticsRouter.get('/', validate(schemas.analyticsQuery, 'query'), analytics.get);

const dashboardRouter = express.Router();
dashboardRouter.get('/', dashboard.summary);

module.exports = { budgetRouter, goalRouter, analyticsRouter, dashboardRouter };
