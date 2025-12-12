// S3 storage adapter for AWS Lambda
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DEFAULT_EXERCISES } = require('../handlers');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.COUNTER_BUCKET_NAME || 'exercise-timer-counters-dev';

function getCounterKey(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }
  return `users/${userId}/counter.json`;
}

async function getCounters(userId) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: getCounterKey(userId)
    });
    const response = await s3Client.send(command);
    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
      return DEFAULT_EXERCISES;
    }
    throw error;
  }
}

async function saveCounters(counters, userId) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: getCounterKey(userId),
    Body: JSON.stringify(counters),
    ContentType: 'application/json'
  });
  await s3Client.send(command);
  return counters;
}

module.exports = {
  getCounters,
  saveCounters
};

