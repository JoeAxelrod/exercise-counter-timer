// Storage adapter factory - chooses storage based on environment
// Lazy load to avoid executing localStorage initialization code in production

function getStorage() {
  // Use local storage if SAM_LOCAL is set (SAM Local development)
  // or if we're in a local environment without AWS credentials
  if (process.env.SAM_LOCAL === 'true' || process.env.USE_LOCAL_STORAGE === 'true') {
    return require('./local');
  }
  
  // Otherwise use S3 (for AWS Lambda)
  return require('./s3');
}

module.exports = getStorage();

