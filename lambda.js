const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Get bucket name from environment or use default
const BUCKET_NAME = process.env.COUNTER_BUCKET_NAME || 'exercise-timer-counters-dev';
const COUNTER_KEY = 'counter.json';

// Default exercises
const DEFAULT_EXERCISES = {
  'pull-ups': 0,
  'squats': 0,
  'chest-dumbbells': 0,
  'push-ups': 0,
  'lunges': 0,
  'planks': 0
};

// Helper to get counters from S3
async function getCounters() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: COUNTER_KEY
    });
    const response = await s3Client.send(command);
    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      // File doesn't exist, return defaults
      return DEFAULT_EXERCISES;
    }
    throw error;
  }
}

// Helper to save counters to S3
async function saveCounters(counters) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: COUNTER_KEY,
    Body: JSON.stringify(counters),
    ContentType: 'application/json'
  });
  await s3Client.send(command);
  return counters;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT'
};

// Helper to reset all counters
async function resetAllCounters() {
  const resetData = { ...DEFAULT_EXERCISES };
  await saveCounters(resetData);
  return resetData;
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const path = event.path || event.requestContext.path;
  const method = event.httpMethod;

  try {
    // GET /api/counters
    if (path.includes('/api/counters') && method === 'GET') {
      const counters = await getCounters();
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(counters)
      };
    }

    // POST /api/counters/increment
    if (path.includes('/api/counters/increment') && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { exercise, increment } = body;

      if (!exercise) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Exercise name required' })
        };
      }

      let incrementValue = parseInt(increment, 10);
      if (isNaN(incrementValue) || incrementValue < 1 || incrementValue > 100) {
        incrementValue = 12;
      }

      const counters = await getCounters();

      if (typeof counters[exercise] !== 'number') {
        counters[exercise] = 0;
      }

      counters[exercise] += incrementValue;
      const updated = await saveCounters(counters);

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
      };
    }

    // POST /api/counters/reset
    if (path.includes('/api/counters/reset') && method === 'POST') {
      console.log('Resetting all counters to zero');
      const reset = await resetAllCounters();
      console.log('Reset result:', JSON.stringify(reset));
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reset)
      };
    }

    // 404 for unknown routes
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

