#!/bin/bash

# Deploy CloudFront distribution for HTTPS access
STAGE=${1:-dev}
BUCKET_NAME="exercise-timer-frontend-${STAGE}"
REGION=${AWS_REGION:-us-east-1}

echo "🌐 Setting up CloudFront distribution for HTTPS access..."

# Check if distribution already exists
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment==\`${BUCKET_NAME}\`].Id" --output text 2>/dev/null)

if [ -z "$DIST_ID" ]; then
  echo "📦 Creating CloudFront distribution..."
  
  # Create CloudFront distribution
  DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "${BUCKET_NAME}",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${BUCKET_NAME}",
        "DomainName": "${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${BUCKET_NAME}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
EOF
)
  
  DIST_ID=$(aws cloudfront create-distribution --distribution-config "$DIST_CONFIG" --query 'Distribution.Id' --output text 2>/dev/null)
  
  if [ -z "$DIST_ID" ]; then
    echo "❌ Failed to create CloudFront distribution"
    exit 1
  fi
  
  echo "✅ CloudFront distribution created: $DIST_ID"
  echo "⏳ Distribution is deploying (this takes 10-15 minutes)..."
else
  echo "✅ CloudFront distribution already exists: $DIST_ID"
fi

# Get distribution domain name
DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text 2>/dev/null)
STATUS=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.Status' --output text 2>/dev/null)

echo ""
echo "📡 CloudFront Distribution:"
echo "   ID: $DIST_ID"
echo "   Domain: $DIST_DOMAIN"
echo "   Status: $STATUS"
echo ""
echo "🌐 Your app will be available at:"
echo "   https://${DIST_DOMAIN}"
echo ""
if [ "$STATUS" != "Deployed" ]; then
  echo "⏳ Note: Distribution is still deploying. It may take 10-15 minutes."
  echo "   Check status with: aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'"
fi

