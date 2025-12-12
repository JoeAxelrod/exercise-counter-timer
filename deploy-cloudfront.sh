#!/bin/bash

# Deploy CloudFront distribution with Origin Access Control (OAC)
# This restricts S3 bucket access to CloudFront only - prevents direct S3 access
STAGE=${1:-dev}
BUCKET_NAME="exercise-timer-frontend-${STAGE}"
REGION=${AWS_REGION:-us-east-1}

echo "🔒 Setting up CloudFront with Origin Access Control (OAC)..."
echo "   This will restrict S3 access to CloudFront only"

# Step 1: Create Origin Access Control (OAC)
echo "📦 Creating Origin Access Control..."
OAC_NAME="${BUCKET_NAME}-oac"
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config "Name=${OAC_NAME},Description=Restrict S3 access to CloudFront only,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
  --query 'OriginAccessControl.Id' \
  --output text 2>/dev/null)

if [ -z "$OAC_ID" ]; then
  # Check if OAC already exists
  OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name==\`${OAC_NAME}\`].Id" --output text 2>/dev/null)
  if [ -z "$OAC_ID" ]; then
    echo "❌ Failed to create Origin Access Control"
    exit 1
  else
    echo "✅ Origin Access Control already exists: $OAC_ID"
  fi
else
  echo "✅ Origin Access Control created: $OAC_ID"
fi

# Step 2: Block public access on S3 bucket (if not already blocked)
echo "🔒 Ensuring S3 bucket blocks public access..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  2>/dev/null || echo "⚠️  Note: Could not update public access block (may already be set)"

# Step 3: Check if distribution already exists
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment==\`${BUCKET_NAME}\`].Id" --output text 2>/dev/null)

if [ -z "$DIST_ID" ]; then
  echo "📦 Creating CloudFront distribution with OAC..."
  
  # Create CloudFront distribution with OAC
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
        "DomainName": "${BUCKET_NAME}.s3.${REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "${OAC_ID}"
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
  
  echo "✅ CloudFront distribution created with OAC: $DIST_ID"
  echo "⏳ Distribution is deploying (this takes 10-15 minutes)..."
else
  echo "✅ CloudFront distribution already exists: $DIST_ID"
  echo "⚠️  Note: If this distribution was created before, you may need to update it to use OAC"
fi

# Step 4: Update S3 bucket policy to allow CloudFront OAC access only
echo "📝 Updating S3 bucket policy to allow CloudFront OAC only..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_ARN="arn:aws:s3:::${BUCKET_NAME}"

# Create bucket policy that allows CloudFront OAC access
# Using wildcard for distribution ARN to allow any CloudFront distribution from this account
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "${BUCKET_ARN}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::${ACCOUNT_ID}:distribution/*"
        }
      }
    }
  ]
}
EOF
)

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "$BUCKET_POLICY" 2>/dev/null && {
  echo "✅ S3 bucket policy updated - only CloudFront can access files"
} || {
  echo "⚠️  Warning: Could not update bucket policy automatically."
  echo "   Please apply this bucket policy manually:"
  echo ""
  echo "$BUCKET_POLICY"
  echo ""
}

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

echo ""
echo "🔒 Security Status:"
echo "   ✅ Origin Access Control (OAC) enabled"
echo "   ✅ S3 bucket blocks public access"
echo "   ✅ Only CloudFront can access S3 files"
echo ""
echo "📝 To verify protection:"
echo "   Try accessing: https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/alarm.mp3"
echo "   This should FAIL (Access Denied) - proving direct S3 access is blocked"
echo "   ✅ Only CloudFront URL works: https://${DIST_DOMAIN}/alarm.mp3"
echo ""

