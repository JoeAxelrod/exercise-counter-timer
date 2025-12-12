# SAM Local Development

Use SAM Local to run your Lambda function locally, simulating API Gateway.

## Prerequisites

1. **Docker** - SAM Local uses Docker to run Lambda functions
   ```bash
   # Check if Docker is running
   docker ps
   ```

2. **AWS SAM CLI** - Install if not already installed
   ```bash
   # macOS
   brew install aws-sam-cli
   
   # Or see: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

## Running Locally

### Start SAM Local API

```bash
npm run start:sam
```

This will:
- Build your Lambda function
- Start API Gateway locally on `http://localhost:7777`
- Use local file storage (`counter.json`) instead of S3

### With Hot Reload (Watch Mode)

```bash
npm run start:sam:watch
```

This keeps containers warm for faster reloads during development.

## API Endpoints

Once running, your API will be available at:

- `http://localhost:7777/api/counters` - GET all counters
- `http://localhost:7777/api/counters/increment` - POST to increment
- `http://localhost:7777/api/counters/reset` - POST to reset

## How It Works

1. **Storage Adapter** - The `src/storage/index.js` automatically chooses:
   - **Local storage** (`counter.json`) when `SAM_LOCAL=true` (SAM Local)
   - **S3 storage** when running in AWS Lambda

2. **Environment Variables** - `sam-local-env.json` sets:
   - `SAM_LOCAL=true` - Tells the app to use local storage
   - `USE_LOCAL_STORAGE=true` - Explicitly use local file system

3. **Same Code** - `lambda.js` works for both:
   - Local development (via SAM Local)
   - AWS deployment (via API Gateway)

## Testing

You can test the local API:

```bash
# Get counters
curl http://localhost:7777/api/counters

# Increment counter
curl -X POST http://localhost:7777/api/counters/increment \
  -H "Content-Type: application/json" \
  -d '{"exercise": "pull-ups", "increment": 12}'

# Reset counters
curl -X POST http://localhost:7777/api/counters/reset
```

## Frontend Development

Update `public/app.js` to point to your local API:

```javascript
// For SAM Local
const API_URL = 'http://localhost:7777';

// Then use: fetch(`${API_URL}/api/counters`)
```

Or serve the frontend separately:

```bash
# Terminal 1: Run SAM Local API
npm run start:sam:watch

# Terminal 2: Serve frontend on port 3000
npm run start:ui
```

Then open `http://localhost:3000` in your browser. The frontend will automatically connect to the SAM Local API on port 7777.

## Benefits

✅ **Same code** for local and AWS  
✅ **No code duplication** - DRY principle  
✅ **Realistic testing** - Simulates API Gateway  
✅ **Fast iteration** - No deployment needed  
✅ **Local storage** - No AWS credentials required  

## Troubleshooting

### Docker not running
```bash
# Start Docker Desktop, then:
docker ps
```

### Port already in use
```bash
# Change port in package.json scripts:
sam local start-api --port 3000
```

### Build errors
```bash
# Clean and rebuild
rm -rf .aws-sam
sam build
```

