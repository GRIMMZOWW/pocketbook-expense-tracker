const Goal = require('../models/Goal');
const HttpError = require('../utils/HttpError');
const catchAsync = require('../utils/catchAsync');

const withProgress = (g) => {
  const goal = g.toObject ? g.toObject() : g;
  goal.progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  return goal;
};

const list = catchAsync(async (req, res) => {
  const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ data: goals.map(withProgress) });
});

const create = catchAsync(async (req, res) => {
  const goal = await Goal.create({ ...req.body, user: req.user.id });
  res.status(201).json(withProgress(goal));
});

const update = catchAsync(async (req, res) => {
  const goal = await Goal.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!goal) throw new HttpError(404, 'Goal not found.');
  res.json(withProgress(goal));
});

// $inc is atomic, so two quick deposits both count.
const contribute = catchAsync(async (req, res) => {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $inc: { currentAmount: req.body.amount } },
    { new: true }
  );
  if (!goal) throw new HttpError(404, 'Goal not found.');
  res.json(withProgress(goal));
});

const remove = catchAsync(async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!goal) throw new HttpError(404, 'Goal not found.');
  res.json({ message: 'Goal deleted.' });
});

module.exports = { list, create, update, contribute, remove };
