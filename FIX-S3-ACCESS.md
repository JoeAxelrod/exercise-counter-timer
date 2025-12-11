# Fix S3 Website Public Access

Your S3 bucket needs to be configured for public website access. Follow these steps:

## Steps to Enable Public Access

1. **Go to S3 Console:**
   https://console.aws.amazon.com/s3/buckets/exercise-timer-frontend-dev

2. **Disable Block Public Access:**
   - Click on **Permissions** tab
   - Scroll to **Block public access (bucket settings)**
   - Click **Edit**
   - **Uncheck all 4 boxes**:
     - ☐ Block all public access
     - ☐ Block public access to buckets and objects granted through new access control lists (ACLs)
     - ☐ Block public access to buckets and objects granted through any access control lists (ACLs)
     - ☐ Block public access to buckets and objects granted through new public bucket or access point policies
   - Click **Save changes**
   - Type `confirm` and click **Confirm**

3. **Add Bucket Policy:**
   - Still in **Permissions** tab
   - Scroll to **Bucket policy**
   - Click **Edit**
   - Paste this policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::exercise-timer-frontend-dev/*"
       }
     ]
   }
   ```
   - Click **Save changes**

4. **Enable Static Website Hosting:**
   - Click on **Properties** tab
   - Scroll to **Static website hosting**
   - Click **Edit**
   - Select **Enable**
   - **Index document**: `index.html`
   - **Error document**: `index.html`
   - Click **Save changes**

5. **Get Website URL:**
   - Still in **Properties** tab
   - Scroll to **Static website hosting**
   - Copy the **Bucket website endpoint**
   - It should be: `http://exercise-timer-frontend-dev.s3-website-us-east-1.amazonaws.com`

## Verify

After completing these steps, your website should be accessible at:
http://exercise-timer-frontend-dev.s3-website-us-east-1.amazonaws.com

## Alternative: Use CloudFront (More Secure)

If you want better security and performance:
1. Create CloudFront distribution
2. Point it to your S3 bucket
3. Use CloudFront URL instead

This keeps the S3 bucket private while making the website public through CloudFront.

