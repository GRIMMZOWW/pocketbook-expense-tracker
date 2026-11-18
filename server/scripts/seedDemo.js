require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Account = require('../src/models/Account');
const Category = require('../src/models/Category');
const Transaction = require('../src/models/Transaction');
const Budget = require('../src/models/Budget');
const Goal = require('../src/models/Goal');
const { createDueRecurring, addPeriod } = require('../src/utils/recurring');
const { getBalances } = require('../src/utils/balances');
const { budgetsForMonth } = require('../src/utils/stats');

const RAW_TRANSACTIONS = [
  ['2026-09-01', 'Income', 'Other', 'Bank Account', 5000, 'Monthly pocket money'],
  ['2026-09-01', 'Income', 'Other', 'Cash', 1000, 'Cash from home'],
  ['2026-09-03', 'Expense', 'Train Pass', 'Wallet', 330, 'Monthly local train pass'],
  ['2026-09-05', 'Expense', 'Subscription', 'Wallet', 59, 'Spotify Student', 'Monthly'],
  ['2026-09-06', 'Expense', 'Education', 'Bank Account', 850, 'Semester textbooks'],
  ['2026-09-08', 'Expense', 'Bills', 'Wallet', 299, 'Mobile recharge', 'Monthly'],
  ['2026-09-10', 'Expense', 'Food', 'Cash', 420, 'Canteen lunches'],
  ['2026-09-15', 'Income', 'Freelance', 'Wallet', 1800, 'Logo design for a local shop'],
  ['2026-09-20', 'Expense', 'Entertainment', 'Cash', 300, 'Movie with friends'],
  ['2026-09-27', 'Expense', 'Food', 'Wallet', 550, "Friend's birthday dinner"],
  ['2026-10-01', 'Income', 'Other', 'Bank Account', 5000, 'Monthly pocket money'],
  ['2026-10-01', 'Income', 'Other', 'Cash', 1000, 'Cash from home'],
  ['2026-10-03', 'Expense', 'Train Pass', 'Wallet', 330, 'Monthly local train pass'],
  ['2026-10-04', 'Expense', 'Food', 'Cash', 380, 'Canteen lunches'],
  ['2026-10-09', 'Expense', 'Entertainment', 'Cash', 520, 'Movie and snacks'],
  ['2026-10-12', 'Income', 'Gift', 'Cash', 1000, 'Birthday gift from uncle'],
  ['2026-10-14', 'Expense', 'Shopping', 'Bank Account', 1200, 'College backpack'],
  ['2026-10-17', 'Expense', 'Food', 'Wallet', 650, 'Family dinner out'],
  ['2026-10-20', 'Income', 'Freelance', 'Wallet', 2500, 'Portfolio website for a classmate'],
  ['2026-10-22', 'Expense', 'Education', 'Cash', 240, 'Printouts and stationery'],
  ['2026-10-25', 'Expense', 'Health', 'Cash', 400, 'Doctor visit and medicines'],
  ['2026-10-28', 'Expense', 'Travel', 'Wallet', 1100, 'Lonavala trip with friends'],
  ['2026-11-01', 'Income', 'Other', 'Bank Account', 5000, 'Monthly pocket money'],
  ['2026-11-01', 'Income', 'Other', 'Cash', 1000, 'Cash from home'],
  ['2026-11-02', 'Expense', 'Food', 'Cash', 140, 'Canteen lunch and chai'],
  ['2026-11-03', 'Expense', 'Train Pass', 'Wallet', 330, 'Monthly local train pass'],
  ['2026-11-06', 'Expense', 'Food', 'Wallet', 450, 'Dinner with friends'],
  ['2026-11-08', 'Expense', 'Education', 'Bank Account', 449, 'React course on Udemy'],
  ['2026-11-10', 'Income', 'Freelance', 'Wallet', 3500, 'Landing page for a local cafe'],
  ['2026-11-11', 'Expense', 'Shopping', 'Bank Account', 1899, 'Sneakers on sale'],
  ['2026-11-13', 'Expense', 'Entertainment', 'Cash', 360, 'Movie tickets'],
  ['2026-11-14', 'Expense', 'Food', 'Cash', 210, 'Canteen lunches and snacks'],
  ['2026-11-15', 'Expense', 'Health', 'Cash', 180, 'Pharmacy'],
  ['2026-11-16', 'Expense', 'Food', 'Wallet', 520, "Roommate's birthday treat"],
  ['2026-11-17', 'Expense', 'Travel', 'Wallet', 240, 'Cab to college fest'],
  ['2026-11-18', 'Expense', 'Food', 'Cash', 180, 'Weekend lunch'],
];

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const email = 'demo@pocketbook.dev';
  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  let user = await User.findOne({ email });
  if (user) {
    user.name = 'Aarav Mehta';
    user.password = passwordHash;
    await user.save();
    await Promise.all([
      Transaction.deleteMany({ user: user._id }),
      Account.deleteMany({ user: user._id }),
      Category.deleteMany({ user: user._id }),
      Budget.deleteMany({ user: user._id }),
      Goal.deleteMany({ user: user._id }),
    ]);
  } else {
    user = await User.create({ name: 'Aarav Mehta', email, password: passwordHash });
  }

  const accounts = await Account.insertMany([
    { user: user._id, name: 'Cash', type: 'Cash' },
    { user: user._id, name: 'Bank Account', type: 'Bank Account' },
    { user: user._id, name: 'Wallet', type: 'Wallet' },
  ]);
  const accountByName = Object.fromEntries(accounts.map((a) => [a.name, a._id]));

  await Category.create({ user: user._id, name: 'Train Pass', type: 'Expense' });

  const docs = RAW_TRANSACTIONS.map(([dateStr, type, category, accountName, amount, note, frequency]) => {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const doc = {
      user: user._id,
      date,
      type,
      category,
      account: accountByName[accountName],
      amount,
      note,
      recurring: Boolean(frequency),
    };
    if (frequency) {
      doc.frequency = frequency;
      doc.nextDate = addPeriod(date, frequency);
    }
    return doc;
  });

  await Transaction.insertMany(docs);
  const recurringCreated = await createDueRecurring(user._id);

  await Budget.insertMany([
    { user: user._id, month: '2026-11', category: '', amount: 7000 },
    { user: user._id, month: '2026-11', category: 'Food', amount: 1600 },
    { user: user._id, month: '2026-11', category: 'Shopping', amount: 2000 },
    { user: user._id, month: '2026-11', category: 'Entertainment', amount: 500 },
  ]);

  await Goal.insertMany([
    { user: user._id, name: 'Used laptop', targetAmount: 35000, currentAmount: 9000, targetDate: new Date('2027-06-30T00:00:00.000Z') },
    { user: user._id, name: 'Goa trip', targetAmount: 8000, currentAmount: 3200, targetDate: new Date('2027-02-15T00:00:00.000Z') },
  ]);

  const allTx = await Transaction.find({ user: user._id }).lean();
  const totalIncome = allTx.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = allTx.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const balances = await getBalances(user._id);
  const novBudget = await budgetsForMonth(user._id, '2026-11', Budget);

  console.log(`Demo user seeded: ${email}`);
  console.log(`Total transactions: ${allTx.length} (${docs.length} inserted + ${recurringCreated} recurring copies)`);
  console.log(`Total income: ${totalIncome}, Total expenses: ${totalExpenses}, Balance: ${totalIncome - totalExpenses}`);
  console.log('Account balances:');
  accounts.forEach((a) => console.log(`  ${a.name}: ${balances[a._id.toString()] || 0}`));
  console.log(`November spent: ${novBudget.spent}, Budget used: ${novBudget.overall.percentUsed}%`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
