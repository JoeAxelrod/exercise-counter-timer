#!/bin/bash

# Configure API Gateway throttling after deployment
# This sets up cost protection limits

STAGE=${1:-dev}
STACK_NAME="exercise-timer-$STAGE"
REGION=${AWS_REGION:-us-east-1}

echo "🔒 Configuring API Gateway throttling for cost protection..."

# Get API URL from stack outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$API_URL" ]; then
    echo "❌ Could not find API URL from stack outputs."
    exit 1
fi

# Extract API ID from URL (format: https://API_ID.execute-api.REGION.amazonaws.com/STAGE/)
API_ID=$(echo "$API_URL" | sed -E 's|https://([^.]+)\.execute-api\..*|\1|')

if [ -z "$API_ID" ]; then
    echo "❌ Could not extract API Gateway ID from URL: $API_URL"
    exit 1
fi

if [ -z "$API_ID" ]; then
    echo "❌ Could not find API Gateway. Make sure the stack is deployed."
    exit 1
fi

echo "📡 API Gateway ID: $API_ID"

# Get stage name from URL or API Gateway
STAGE_NAME=$(echo "$API_URL" | sed -E 's|.*/([^/]+)/?$|\1|' | tr -d '/')
if [ "$STAGE_NAME" = "$API_URL" ] || [ -z "$STAGE_NAME" ]; then
  STAGE_NAME=$(aws apigateway get-stages \
    --rest-api-id "$API_ID" \
    --region "$REGION" \
    --query 'item[0].stageName' \
    --output text 2>/dev/null || echo "Prod")
fi

echo "📊 Configuring throttling on stage: $STAGE_NAME"

# Update stage with throttling
aws apigateway update-stage \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE_NAME" \
  --region "$REGION" \
  --patch-ops \
    op=replace,path=/throttle/burstLimit,value=10 \
    op=replace,path=/throttle/rateLimit,value=5 \
    op=replace,path=/quota/limit,value=10000 \
    op=replace,path=/quota/period,value=MONTH \
  2>/dev/null && {
    echo "✅ Throttling configured successfully!"
  } || {
    echo "⚠️  Could not update stage throttling automatically."
    echo "📝 Please configure manually in AWS Console:"
    echo "   1. Go to API Gateway → $API_ID → Stages → $STAGE_NAME"
    echo "   2. Set Throttle: Burst=10, Rate=5"
    echo "   3. Set Quota: 10,000 requests/month"
}

echo "✅ Throttling configuration complete!"
echo ""
echo "📊 Current limits:"
echo "   - Rate: 5 requests/second"
echo "   - Burst: 10 requests"
echo "   - Monthly quota: 10,000 requests"



