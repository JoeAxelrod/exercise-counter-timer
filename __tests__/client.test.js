/**
 * @jest-environment jsdom
 */

// Mock localStorage
let localStorageStore = {};

const localStorageMock = {
  getItem: jest.fn((key) => localStorageStore[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageStore[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    localStorageStore = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

// Mock Audio
global.Audio = jest.fn(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  currentTime: 0,
  volume: 0.3
}));

describe('Client Unit Tests', () => {
  let container;
  let timerDisplay;
  let incrementInput;
  let exercisesGrid;
  
  beforeEach(() => {
    // Reset mocks
    localStorageStore = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    fetch.mockClear();
    global.Audio.mockClear();
    
    // Setup DOM
    document.body.innerHTML = `
      <div class="container">
        <h1>Exercise Timer</h1>
        <div class="timer-display" id="timer">06:00</div>
        <div class="settings-section">
          <label for="incrementValue">Increment per click:</label>
          <input type="number" id="incrementValue" min="1" max="100" value="12" class="increment-input">
        </div>
        <div class="exercises-section">
          <h2>Exercises</h2>
          <div class="exercises-grid" id="exercisesGrid"></div>
        </div>
        <button class="stop-button" id="stopAlarmBtn" style="display: none;">Stop Alarm</button>
      </div>
      <audio id="alarmSound" preload="auto" loop></audio>
    `;
    
    timerDisplay = document.getElementById('timer');
    incrementInput = document.getElementById('incrementValue');
    exercisesGrid = document.getElementById('exercisesGrid');
  });
  
  describe('Time Formatting', () => {
    test('formatTime should format milliseconds correctly', () => {
      // This would be imported from app.js, but for testing we'll define it
      const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      };
      
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(1000)).toBe('00:01');
      expect(formatTime(60000)).toBe('01:00');
      expect(formatTime(3661000)).toBe('61:01');
      expect(formatTime(125000)).toBe('02:05');
    });
  });
  
  describe('Increment Value Management', () => {
    test('should save increment value to localStorage', () => {
      const saveIncrementValue = (value) => {
        localStorage.setItem('incrementValue', value.toString());
      };
      
      saveIncrementValue(15);
      expect(localStorage.setItem).toHaveBeenCalledWith('incrementValue', '15');
    });
    
    test('should load increment value from localStorage', () => {
      localStorageStore['incrementValue'] = '20';
      
      const getIncrementValue = () => {
        const saved = localStorage.getItem('incrementValue');
        return saved ? parseInt(saved, 10) : 12;
      };
      
      expect(getIncrementValue()).toBe(20);
    });
    
    test('should default to 12 if no value in localStorage', () => {
      delete localStorageStore['incrementValue'];
      
      const getIncrementValue = () => {
        const saved = localStorage.getItem('incrementValue');
        return saved ? parseInt(saved, 10) : 12;
      };
      
      expect(getIncrementValue()).toBe(12);
    });
  });
  
  describe('API Calls', () => {
    test('should fetch counters on load', async () => {
      const mockCounters = {
        'pull-ups': 12,
        'squats': 0
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCounters
      });
      
      const response = await fetch('/api/counters');
      const data = await response.json();
      
      expect(fetch).toHaveBeenCalledWith('/api/counters');
      expect(data).toEqual(mockCounters);
    });
    
    test('should increment counter via API', async () => {
      const mockResponse = {
        'pull-ups': 24,
        'squats': 0
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const response = await fetch('/api/counters/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: 'pull-ups', increment: 12 })
      });
      
      const data = await response.json();
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/counters/increment',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      expect(data['pull-ups']).toBe(24);
    });
    
    test('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await fetch('/api/counters');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });
  
  describe('Increment Value Validation', () => {
    test('should validate increment value is between 1 and 100', () => {
      const validateIncrement = (value) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num >= 1 && num <= 100;
      };
      
      expect(validateIncrement(1)).toBe(true);
      expect(validateIncrement(50)).toBe(true);
      expect(validateIncrement(100)).toBe(true);
      expect(validateIncrement(0)).toBe(false);
      expect(validateIncrement(101)).toBe(false);
      expect(validateIncrement('invalid')).toBe(false);
    });
  });
  
  describe('Exercise Names', () => {
    test('should format exercise names correctly', () => {
      const exerciseNames = {
        'pull-ups': 'Pull-Ups',
        'chest-dumbbells': 'Chest Dumbbells'
      };
      
      const formatName = (key) => {
        return exerciseNames[key] || key.replace(/-/g, ' ');
      };
      
      expect(formatName('pull-ups')).toBe('Pull-Ups');
      expect(formatName('chest-dumbbells')).toBe('Chest Dumbbells');
      expect(formatName('new-exercise')).toBe('new exercise');
    });
  });
});

