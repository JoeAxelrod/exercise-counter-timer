#!/bin/bash

# AWS Deployment Script for Exercise Timer App
# This script deploys the app using AWS Free Tier services

set -e

echo "🚀 Deploying Exercise Timer App to AWS..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://aws.amazon.com/cli/"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI is not installed. Installing..."
    echo "   Install from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

STAGE=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "📦 Stage: $STAGE"
echo "🌍 Region: $REGION"

# Install Lambda dependencies
echo "📥 Installing Lambda dependencies..."
cd "$(dirname "$0")"
npm install --production --prefix . 2>/dev/null || npm install --production

# Build and deploy with SAM
echo "🏗️  Building SAM application..."
sam build

echo "🚀 Deploying to AWS..."
sam deploy \
  --stack-name exercise-timer-$STAGE \
  --region $REGION \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Stage=$STAGE \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# Get API endpoint
echo "📡 Getting API endpoint..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name exercise-timer-$STAGE \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📡 API URL: $API_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Update public/app.js to use API URL: $API_URL"
echo "   2. Deploy frontend to S3 (see deploy-frontend.sh)"
echo ""
echo "💰 Cost Protection:"
echo "   - API Gateway: 10 requests/second max (free tier: 1M/month)"
echo "   - Lambda: 128MB memory, 10s timeout (free tier: 1M requests/month)"
echo "   - S3: Free tier includes 5GB storage"
echo ""



