# AWS Deployment Guide

Deploy the Exercise Timer app to AWS using free tier services.

## Prerequisites

1. **AWS Account** (Free Tier eligible)
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```
3. **AWS SAM CLI** installed
   ```bash
   # macOS
   brew install aws-sam-cli
   
   # Or download from:
   # https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

## Quick Deploy

1. **Deploy Backend (API)**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh dev
   ```

2. **Deploy Frontend**
   ```bash
   chmod +x deploy-frontend.sh
   ./deploy-frontend.sh dev
   ```

3. **Get Your URLs**
   - API URL: Shown after backend deployment
   - Frontend URL: Shown after frontend deployment

## Manual Deployment

### Step 1: Deploy Lambda + API Gateway

```bash
# Build
sam build

# Deploy
sam deploy --guided
```

Follow the prompts:
- Stack name: `exercise-timer-dev`
- Region: `us-east-1` (or your preferred region)
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`

### Step 2: Update Frontend API URL

After deployment, get your API URL:
```bash
aws cloudformation describe-stacks \
  --stack-name exercise-timer-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

Update `public/app.js`:
```javascript
// Change all fetch('/api/...') to fetch('YOUR_API_URL/api/...')
```

### Step 3: Deploy Frontend to S3

```bash
# Create bucket
aws s3 mb s3://exercise-timer-frontend-dev

# Enable static website hosting
aws s3 website s3://exercise-timer-frontend-dev \
  --index-document index.html \
  --error-document index.html

# Upload files
aws s3 sync public/ s3://exercise-timer-frontend-dev --exclude "*.mp3"
aws s3 cp public/alarm.mp3 s3://exercise-timer-frontend-dev/alarm.mp3

# Get website URL
aws s3api get-bucket-website \
  --bucket exercise-timer-frontend-dev \
  --query 'WebsiteConfiguration.RedirectAllRequestsTo.HostName'
```

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  S3 Static  │─────▶│ API Gateway  │─────▶│   Lambda    │
│   Website   │      │ (Throttled)  │      │  Function   │
└─────────────┘      └──────┬───────┘      └──────┬──────┘
                            │                     │
                            │                     ▼
                            │              ┌─────────────┐
                            │              │  S3 Bucket  │
                            │              │ (Counters)  │
                            │              └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ CloudWatch   │
                    │  (Logs)      │
                    └──────────────┘
```

## Cost Protection

- **API Gateway**: Throttled to 5 req/sec, 10K/month limit
- **Lambda**: 128MB, 10s timeout
- **S3**: Versioned, auto-cleanup after 7 days

See `.aws-cost-protection.md` for details.

## Troubleshooting

### API Gateway CORS Issues
If you see CORS errors, check that the API Gateway has CORS enabled:
```bash
aws apigateway get-resources --rest-api-id YOUR_API_ID
```

### Lambda Permissions
If Lambda can't access S3, check IAM role:
```bash
aws iam get-role --role-name exercise-timer-api-dev-ExerciseTimerAPI-*
```

### S3 Website Not Loading
Check bucket policy allows public read:
```bash
aws s3api get-bucket-policy --bucket exercise-timer-frontend-dev
```

## Cleanup

To delete everything and avoid charges:
```bash
# Delete CloudFormation stack
sam delete --stack-name exercise-timer-dev

# Delete S3 buckets
aws s3 rb s3://exercise-timer-frontend-dev --force
aws s3 rb s3://exercise-timer-counters-dev --force
```

## Support

For issues:
1. Check CloudWatch logs: `aws logs tail /aws/lambda/exercise-timer-api-dev`
2. Check API Gateway logs in AWS Console
3. Verify IAM permissions



