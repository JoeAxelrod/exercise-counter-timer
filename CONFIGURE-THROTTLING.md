# Configure API Gateway Throttling (Manual Steps)

Since the AWS CLI command isn't working, configure throttling manually:

## Option 1: AWS Console (Easiest)

1. Go to: https://console.aws.amazon.com/apigateway
2. Click on your API: `2n9dsdvfb7`
3. Click on **Stages** in the left menu
4. Click on **Prod** stage
5. Click the **Settings** tab
6. Scroll to **Default Method Throttling**:
   - **Burst limit**: `10`
   - **Rate limit**: `5`
7. Scroll to **Default Method Quota**:
   - **Quota**: `10000`
   - **Period**: `MONTH`
8. Click **Save Changes**

## Option 2: Use AWS Console CLI (if available)

If you have AWS Console CLI installed:
```bash
aws apigateway update-stage \
  --rest-api-id 2n9dsdvfb7 \
  --stage-name Prod \
  --region us-east-1 \
  --throttle-burst-limit 10 \
  --throttle-rate-limit 5
```

## Option 3: Use Usage Plans (More Control)

1. Go to API Gateway → Usage Plans
2. Create new usage plan
3. Set throttling: 5 req/sec, burst 10
4. Set quota: 10,000/month
5. Associate with your API stage

## Verify Configuration

After configuring, test your API:
```bash
curl https://2n9dsdvfb7.execute-api.us-east-1.amazonaws.com/Prod/api/counters
```

If throttling is working, you'll get 429 errors after exceeding limits.

## Current Status

- ✅ API deployed and working
- ✅ Frontend deployed
- ⚠️ Throttling needs manual configuration (5 minutes)

Your app is functional without throttling, but configuring it prevents unexpected costs.

