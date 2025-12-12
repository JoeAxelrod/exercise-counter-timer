const {
  getCountersHandler,
  incrementCounterHandler,
  resetCountersHandler
} = require('./src/handlers');
const storage = require('./src/storage');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT'
};

function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // Simulate network delay in local development
  if (process.env.SAM_LOCAL === 'true') {
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
  }

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
    // Handle root path
    if (path === '/' || path === '') {
      return createResponse(200, { 
        message: 'Exercise Timer API',
        endpoints: {
          'GET /api/counters': 'Get all counters',
          'POST /api/counters/increment': 'Increment a counter',
          'POST /api/counters/reset': 'Reset all counters'
        }
      });
    }

    // GET /api/counters
    if (path.includes('/api/counters') && method === 'GET') {
      const userId = event.queryStringParameters?.userId;
      const result = await getCountersHandler(storage, userId);
      return createResponse(result.statusCode, result.body);
    }

    // POST /api/counters/increment
    if (path.includes('/api/counters/increment') && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { exercise, increment, userId } = body;
      const result = await incrementCounterHandler(storage, exercise, increment, userId);
      return createResponse(result.statusCode, result.body);
    }

    // POST /api/counters/reset
    if (path.includes('/api/counters/reset') && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { userId } = body;
      console.log('Resetting all counters to zero for user:', userId);
      const result = await resetCountersHandler(storage, userId);
      console.log('Reset result:', JSON.stringify(result.body));
      return createResponse(result.statusCode, result.body);
    }

    // 404 for unknown routes
    return createResponse(404, { error: 'Not found' });

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

