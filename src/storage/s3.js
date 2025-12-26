// S3 storage adapter for AWS Lambda
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DEFAULT_EXERCISES } = require('../handlers');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.COUNTER_BUCKET_NAME || 'exercise-timer-counters-dev';

// In-memory cache for GET operations (5 second TTL)
const cache = new Map();
const CACHE_TTL_MS = 5000; // 5 seconds

function getCounterKey(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }
  return `users/${userId}/counter.json`;
}

async function getCounters(userId) {
  const cacheKey = getCounterKey(userId);
  const now = Date.now();
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cacheKey
    });
    const response = await s3Client.send(command);
    const bodyString = await response.Body.transformToString();
    const data = JSON.parse(bodyString);
    
    // Cache the result
    cache.set(cacheKey, { data, timestamp: now });
    
    return data;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      const defaultData = DEFAULT_EXERCISES;
      // Cache default data too
      cache.set(cacheKey, { data: defaultData, timestamp: now });
      return defaultData;
    }
    throw error;
  }
}

async function saveCounters(counters, userId) {
  const cacheKey = getCounterKey(userId);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cacheKey,
    Body: JSON.stringify(counters),
    ContentType: 'application/json'
  });
  await s3Client.send(command);
  
  // Update cache with new data
  cache.set(cacheKey, { data: counters, timestamp: Date.now() });
  
  return counters;
}

module.exports = {
  getCounters,
  saveCounters
};

