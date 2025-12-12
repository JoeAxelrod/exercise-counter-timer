// Local file system storage adapter
const fs = require('fs');
const path = require('path');
const { DEFAULT_EXERCISES } = require('../handlers');

// Use /tmp for SAM Local (writable), otherwise use project root
const isSamLocal = process.env.SAM_LOCAL === 'true';
const BASE_DIR = isSamLocal 
  ? '/tmp'
  : path.join(__dirname, '../../');

function getCounterFile(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }
  return path.join(BASE_DIR, 'users', userId, 'counter.json');
}

async function getCounters(userId) {
  try {
    const counterFile = getCounterFile(userId);
    // Ensure directory exists
    const counterDir = path.dirname(counterFile);
    if (!fs.existsSync(counterDir)) {
      fs.mkdirSync(counterDir, { recursive: true });
    }
    
    // Initialize counter file if it doesn't exist
    if (!fs.existsSync(counterFile)) {
      fs.writeFileSync(counterFile, JSON.stringify(DEFAULT_EXERCISES));
      return DEFAULT_EXERCISES;
    }
    
    const data = fs.readFileSync(counterFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return DEFAULT_EXERCISES;
  }
}

async function saveCounters(counters, userId) {
  const counterFile = getCounterFile(userId);
  // Ensure directory exists
  const counterDir = path.dirname(counterFile);
  if (!fs.existsSync(counterDir)) {
    fs.mkdirSync(counterDir, { recursive: true });
  }
  fs.writeFileSync(counterFile, JSON.stringify(counters));
  return counters;
}

module.exports = {
  getCounters,
  saveCounters
};

