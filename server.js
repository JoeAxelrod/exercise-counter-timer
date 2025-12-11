const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 7777;
const COUNTER_FILE = path.join(__dirname, 'counter.json');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Default exercises
const DEFAULT_EXERCISES = {
  'pull-ups': 0,
  'squats': 0,
  'chest-dumbbells': 0,
  'push-ups': 0,
  'lunges': 0,
  'planks': 0
};

// Initialize counter file if it doesn't exist
if (!fs.existsSync(COUNTER_FILE)) {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(DEFAULT_EXERCISES));
}

// Get all counters
app.get('/api/counters', (req, res) => {
  try {
    const data = fs.readFileSync(COUNTER_FILE, 'utf8');
    const counters = JSON.parse(data);
    res.json(counters);
  } catch (error) {
    res.json(DEFAULT_EXERCISES);
  }
});

// Increment specific exercise counter
app.post('/api/counters/increment', (req, res) => {
  try {
    const { exercise, increment } = req.body;
    if (!exercise) {
      return res.status(400).json({ error: 'Exercise name required' });
    }
    
    // Use provided increment value or default to 12
    let incrementValue = parseInt(increment, 10);
    if (isNaN(incrementValue) || incrementValue < 1 || incrementValue > 100) {
      incrementValue = 12;
    }
    
    console.log('Server received increment:', increment, 'Using:', incrementValue);
    
    const data = fs.readFileSync(COUNTER_FILE, 'utf8');
    const counters = JSON.parse(data);
    
    // Initialize exercise if it doesn't exist
    if (typeof counters[exercise] !== 'number') {
      counters[exercise] = 0;
    }
    
    counters[exercise] += incrementValue;
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(counters));
    res.json(counters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to increment counter' });
  }
});

// Reset all counters to zero
app.post('/api/counters/reset', (req, res) => {
  try {
    const resetCounters = { ...DEFAULT_EXERCISES };
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(resetCounters));
    res.json(resetCounters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset counters' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

