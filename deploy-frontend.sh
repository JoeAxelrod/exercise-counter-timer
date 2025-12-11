#!/bin/bash

# Deploy frontend to S3 with CloudFront
set -e

STAGE=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
BUCKET_NAME="exercise-timer-frontend-$STAGE"

echo "🌐 Deploying frontend to S3..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    exit 1
fi

# Create S3 bucket if it doesn't exist
if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "✅ Bucket exists"
else
    echo "📦 Creating S3 bucket..."
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION
    
    # Enable static website hosting
    aws s3 website "s3://$BUCKET_NAME" \
      --index-document index.html \
      --error-document index.html
fi

# Get API URL from CloudFormation
API_URL=$(aws cloudformation describe-stacks \
  --stack-name exercise-timer-$STAGE \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo "⚠️  Warning: Could not get API URL. You'll need to update app.js manually."
else
    echo "📡 Updating API URL in app.js..."
    # Create a temporary app.js with API URL
    sed "s|fetch('/api|fetch('$API_URL/api|g" public/app.js > public/app.js.tmp
    mv public/app.js.tmp public/app.js
fi

# Upload files to S3
echo "📤 Uploading files..."
aws s3 sync public/ "s3://$BUCKET_NAME" \
  --exclude "*.mp3" \
  --cache-control "max-age=3600" \
  --delete

# Upload alarm.mp3 separately (larger file)
if [ -f "public/alarm.mp3" ]; then
    echo "📤 Uploading alarm.mp3..."
    aws s3 cp public/alarm.mp3 "s3://$BUCKET_NAME/alarm.mp3" \
      --cache-control "max-age=86400"
fi

# Get website URL
WEBSITE_URL=$(aws s3api get-bucket-website \
  --bucket "$BUCKET_NAME" \
  --query 'WebsiteConfiguration.RedirectAllRequestsTo.HostName' \
  --output text 2>/dev/null || echo "")

if [ -z "$WEBSITE_URL" ]; then
    WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
fi

echo ""
echo "✅ Frontend deployed!"
echo ""
echo "🌐 Website URL: $WEBSITE_URL"
echo ""
echo "📝 Note: S3 website URLs are public. For production, consider:"
echo "   - Using CloudFront (free tier: 50GB/month)"
echo "   - Adding CloudFront distribution (see deploy-cloudfront.sh)"
echo ""


