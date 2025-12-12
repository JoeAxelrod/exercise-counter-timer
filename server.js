const express = require('express');
const {
  getCountersHandler,
  incrementCounterHandler,
  resetCountersHandler
} = require('./src/handlers');
const storage = require('./src/storage/local');

const app = express();
const PORT = 7777;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simulate network delay in local development
const simulateDelay = async () => {
  if (process.env.NODE_ENV !== 'production') {
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
  }
};

// Get all counters
app.get('/api/counters', async (req, res) => {
  await simulateDelay();
  const userId = req.query.userId;
  const result = await getCountersHandler(storage, userId);
  res.status(result.statusCode).json(result.body);
});

// Increment specific exercise counter
app.post('/api/counters/increment', async (req, res) => {
  await simulateDelay();
  const { exercise, increment, userId } = req.body;
  const result = await incrementCounterHandler(storage, exercise, increment, userId);
  res.status(result.statusCode).json(result.body);
});

// Reset all counters to zero
app.post('/api/counters/reset', async (req, res) => {
  await simulateDelay();
  const { userId } = req.body;
  const result = await resetCountersHandler(storage, userId);
  res.status(result.statusCode).json(result.body);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

