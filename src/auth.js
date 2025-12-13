// Cognito JWT token verification
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// For local development, skip auth only if SAM_LOCAL is true AND no USER_POOL_ID is provided
const SAM_LOCAL = process.env.SAM_LOCAL === 'true';
const USER_POOL_ID = process.env.USER_POOL_ID;
// AWS_REGION is automatically available in Lambda runtime, or use default for local
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

// JWKS client for token verification
// Initialize if USER_POOL_ID is provided (works for both local and cloud)
let client = null;
if (USER_POOL_ID) {
  const jwksUri = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
  client = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
  });
}

// Get signing key from JWKS
function getKey(header, callback) {
  if (!client) {
    return callback(new Error('JWKS client not initialized'));
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify Cognito JWT token
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    // Skip auth only if SAM_LOCAL is true AND no USER_POOL_ID is provided (mock mode)
    if (SAM_LOCAL && !USER_POOL_ID) {
      return resolve({
        sub: 'local-user',
        email: 'local@example.com',
        'cognito:username': 'local-user'
      });
    }

    if (!token) {
      return reject(new Error('No token provided'));
    }

    if (!USER_POOL_ID) {
      return reject(new Error('User Pool ID not configured'));
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    jwt.verify(
      cleanToken,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`,
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
}

// Extract token from event (API Gateway or SAM Local)
function extractToken(event) {
  // Try Authorization header first
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    return authHeader;
  }

  // Try query parameter (for testing)
  if (event.queryStringParameters?.token) {
    return event.queryStringParameters.token;
  }

  return null;
}

// Middleware to verify authentication
async function requireAuth(event) {
  // Skip auth only if SAM_LOCAL is true AND no USER_POOL_ID is provided (mock mode)
  if (SAM_LOCAL && !USER_POOL_ID) {
    return {
      authenticated: true,
      user: {
        sub: 'local-user',
        email: 'local@example.com',
        'cognito:username': 'local-user'
      }
    };
  }

  const token = extractToken(event);
  
  if (!token) {
    return {
      authenticated: false,
      error: 'No authentication token provided'
    };
  }

  try {
    const decoded = await verifyToken(token);
    return {
      authenticated: true,
      user: decoded
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error.message || 'Invalid token'
    };
  }
}

module.exports = {
  verifyToken,
  requireAuth,
  extractToken
};

