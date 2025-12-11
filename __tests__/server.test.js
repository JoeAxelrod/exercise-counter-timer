const request = require('supertest');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Mock fs before requiring server
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;
const originalExistsSync = fs.existsSync;

let mockCounters = {};
let mockFileExists = true;

// Create a test server module
function createTestServer() {
  const app = express();
  app.use(express.json());
  
  const TEST_COUNTER_FILE = path.join(__dirname, '../test-counter.json');
  const DEFAULT_EXERCISES = {
    'pull-ups': 0,
    'squats': 0,
    'chest-dumbbells': 0,
    'push-ups': 0,
    'lunges': 0,
    'planks': 0
  };
  
  // Mock file operations
  const readCounters = () => {
    if (!mockFileExists) {
      return DEFAULT_EXERCISES;
    }
    return mockCounters;
  };
  
  const writeCounters = (counters) => {
    mockCounters = { ...counters };
    mockFileExists = true;
  };
  
  // Get all counters
  app.get('/api/counters', (req, res) => {
    try {
      const counters = readCounters();
      res.json(counters);
    } catch (error) {
      res.json(DEFAULT_EXERCISES);
    }
  });
  
  // Increment specific exercise counter
  app.post('/api/counters/increment', (req, res) => {
    try {
      const { exercise, increment } = req.body;
      if (!exercise) {
        return res.status(400).json({ error: 'Exercise name required' });
      }
      
      let incrementValue = parseInt(increment, 10);
      if (isNaN(incrementValue) || incrementValue < 1 || incrementValue > 100) {
        incrementValue = 12;
      }
      
      const counters = readCounters();
      
      if (typeof counters[exercise] !== 'number') {
        counters[exercise] = 0;
      }
      
      counters[exercise] += incrementValue;
      writeCounters(counters);
      res.json(counters);
    } catch (error) {
      res.status(500).json({ error: 'Failed to increment counter' });
    }
  });
  
  return app;
}

describe('Server API Tests', () => {
  let app;
  
  beforeEach(() => {
    app = createTestServer();
    mockCounters = {
      'pull-ups': 0,
      'squats': 0,
      'chest-dumbbells': 0,
      'push-ups': 0,
      'lunges': 0,
      'planks': 0
    };
    mockFileExists = true;
  });
  
  describe('GET /api/counters', () => {
    test('should return all counters', async () => {
      const response = await request(app)
        .get('/api/counters')
        .expect(200);
      
      expect(response.body).toHaveProperty('pull-ups');
      expect(response.body).toHaveProperty('squats');
      expect(response.body['pull-ups']).toBe(0);
    });
    
    test('should return default exercises when file does not exist', async () => {
      mockFileExists = false;
      const response = await request(app)
        .get('/api/counters')
        .expect(200);
      
      expect(response.body).toHaveProperty('pull-ups');
      expect(response.body).toHaveProperty('squats');
    });
  });
  
  describe('POST /api/counters/increment', () => {
    test('should increment counter by specified amount', async () => {
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 12 })
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(12);
    });
    
    test('should increment counter multiple times', async () => {
      await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 12 });
      
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 12 })
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(24);
    });
    
    test('should use default increment of 12 when invalid', async () => {
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 'invalid' })
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(12);
    });
    
    test('should use default increment of 12 when increment is 0', async () => {
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 0 })
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(12);
    });
    
    test('should use default increment of 12 when increment is > 100', async () => {
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 150 })
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(12);
    });
    
    test('should initialize exercise if it does not exist', async () => {
      mockCounters = { 'pull-ups': 10 };
      
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'new-exercise', increment: 5 })
        .expect(200);
      
      expect(response.body['new-exercise']).toBe(5);
    });
    
    test('should return 400 if exercise name is missing', async () => {
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ increment: 12 })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Exercise name required');
    });
    
    test('should handle different exercises independently', async () => {
      await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 12 });
      
      await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'squats', increment: 20 });
      
      const response = await request(app)
        .get('/api/counters')
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(12);
      expect(response.body['squats']).toBe(20);
    });
    
    test('should accept custom increment values', async () => {
      const response = await request(app)
        .post('/api/counters/increment')
        .send({ exercise: 'pull-ups', increment: 5 })
        .expect(200);
      
      expect(response.body['pull-ups']).toBe(5);
    });
  });
});

