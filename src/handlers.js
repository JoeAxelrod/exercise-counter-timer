// Shared business logic for both Express and Lambda

const DEFAULT_EXERCISES = {
  'pull-ups': 0,
  'squats': 0,
  'chest-dumbbells': 0,
  'sit-ups': 0,
  'biceps': 0,
  'triceps': 0
};

// Validate and normalize increment value
function validateIncrement(increment) {
  let incrementValue = parseInt(increment, 10);
  if (isNaN(incrementValue) || incrementValue < 1 || incrementValue > 100) {
    return 12; // default
  }
  return incrementValue;
}

// Validate userId format (basic security check)
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  // Must start with 'user_' and contain only alphanumeric, underscore, and hyphen
  const userIdPattern = /^user_[a-zA-Z0-9_-]+$/;
  if (!userIdPattern.test(userId)) {
    console.warn('Invalid userId format:', userId);
    return false;
  }
  // Prevent path traversal attempts
  if (userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
    console.warn('Suspicious userId (path traversal attempt):', userId);
    return false;
  }
  return true;
}

// Get all counters handler
async function getCountersHandler(storage, userId) {
  if (!userId) {
    return {
      statusCode: 400,
      body: { error: 'userId is required' }
    };
  }
  if (!validateUserId(userId)) {
    return {
      statusCode: 400,
      body: { error: 'Invalid userId format' }
    };
  }
  try {
    const counters = await storage.getCounters(userId);
    const safeCounters = (counters && typeof counters === 'object') ? counters : {};
    const merged = { ...DEFAULT_EXERCISES, ...safeCounters };
    return { statusCode: 200, body: merged };
  } catch (error) {
    return { statusCode: 200, body: DEFAULT_EXERCISES };
  }
}

// Increment counter handler
async function incrementCounterHandler(storage, exercise, increment, userId) {
  if (!exercise) {
    return {
      statusCode: 400,
      body: { error: 'Exercise name required' }
    };
  }

  if (!userId) {
    return {
      statusCode: 400,
      body: { error: 'userId is required' }
    };
  }
  if (!validateUserId(userId)) {
    return {
      statusCode: 400,
      body: { error: 'Invalid userId format' }
    };
  }

  const incrementValue = validateIncrement(increment);
  console.log('Received increment:', increment, 'Using:', incrementValue);

  const counters = await storage.getCounters(userId);

  // Initialize exercise if it doesn't exist
  if (typeof counters[exercise] !== 'number') {
    counters[exercise] = 0;
  }

  counters[exercise] += incrementValue;
  const updated = await storage.saveCounters(counters, userId);

  return { statusCode: 200, body: updated };
}

// Reset counters handler
async function resetCountersHandler(storage, userId) {
  if (!userId) {
    return {
      statusCode: 400,
      body: { error: 'userId is required' }
    };
  }
  if (!validateUserId(userId)) {
    return {
      statusCode: 400,
      body: { error: 'Invalid userId format' }
    };
  }
  try {
    const resetCounters = { ...DEFAULT_EXERCISES };
    await storage.saveCounters(resetCounters, userId);
    return { statusCode: 200, body: resetCounters };
  } catch (error) {
    return {
      statusCode: 500,
      body: { error: 'Failed to reset counters' }
    };
  }
}

module.exports = {
  DEFAULT_EXERCISES,
  validateIncrement,
  validateUserId,
  getCountersHandler,
  incrementCounterHandler,
  resetCountersHandler
};

