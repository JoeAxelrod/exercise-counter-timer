let timerDuration = 6 * 60 * 1000; // Timer duration in milliseconds (default 6 minutes)
let timerInterval = null;
let stopwatchInterval = null;
let timeRemaining = timerDuration;
let stopwatchTime = 0; // Time elapsed in stopwatch mode
let isRunning = false; // True when rest timer is running
let isDoingExercise = false; // True when stopwatch is running
let currentExercise = null; // Current exercise being done

// Time-based tracking for accurate timing even when tab is inactive
let restTimerStartTime = null; // Timestamp when rest timer started
let stopwatchStartTime = null; // Timestamp when stopwatch started

const timerDisplay = document.getElementById('timer');
const exercisesGrid = document.getElementById('exercisesGrid');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const resetCountersBtn = document.getElementById('resetCountersBtn');
const alarmSound = document.getElementById('alarmSound');
const incrementInput = document.getElementById('incrementValue');
const timerDurationInput = document.getElementById('timerDuration');

let counters = {};

// Loader element
const loaderOverlay = document.getElementById('loaderOverlay');

// Show/hide loader functions
function showLoader() {
  if (loaderOverlay) {
    loaderOverlay.style.display = 'flex';
  }
}

function hideLoader() {
  if (loaderOverlay) {
    loaderOverlay.style.display = 'none';
  }
}

// API Base URL - detects local vs cloud automatically
// For local: uses SAM Local API (localhost:7777)
// For cloud: uses API Gateway URL (set via config or default)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
  ? (window.location.port === '7777' ? '' : 'http://localhost:7777')  // Use SAM Local API if not on port 7777
  : (window.API_GATEWAY_URL || 'https://2n9dsdvfb7.execute-api.us-east-1.amazonaws.com/Prod/'); // API Gateway URL

// Load increment value from localStorage or default to 12
function getIncrementValue() {
  const saved = localStorage.getItem('incrementValue');
  return saved ? parseInt(saved, 10) : 12;
}

// Save increment value to localStorage
function saveIncrementValue(value) {
  localStorage.setItem('incrementValue', value.toString());
}

// Load timer duration from localStorage or default to 6 minutes
function getTimerDuration() {
  const saved = localStorage.getItem('timerDuration');
  return saved ? parseInt(saved, 10) : 6;
}

// Save timer duration to localStorage
function saveTimerDuration(value) {
  localStorage.setItem('timerDuration', value.toString());
  timerDuration = value * 60 * 1000; // Convert minutes to milliseconds
  timeRemaining = timerDuration;
  if (!isRunning && !isDoingExercise) {
    updateDisplay();
  }
}

// Generate or retrieve user ID
function getUserId() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    // Generate a unique user ID (timestamp + random)
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
  }
  return userId;
}

// Initialize inputs
incrementInput.value = getIncrementValue();
timerDurationInput.value = getTimerDuration();
timerDuration = getTimerDuration() * 60 * 1000;
timeRemaining = timerDuration;

// Update increment value on change or input
function updateIncrementValue(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1 && value <= 100) {
    saveIncrementValue(value);
  } else {
    e.target.value = getIncrementValue();
  }
}

// Update timer duration on change or input
function updateTimerDuration(e) {
  const value = parseInt(e.target.value, 10);
  if (value >= 1 && value <= 60) {
    saveTimerDuration(value);
  } else {
    e.target.value = getTimerDuration();
  }
}

incrementInput.addEventListener('change', updateIncrementValue);
incrementInput.addEventListener('input', updateIncrementValue);
timerDurationInput.addEventListener('change', updateTimerDuration);
timerDurationInput.addEventListener('input', updateTimerDuration);

// Exercise display names
const exerciseNames = {
  'pull-ups': 'Pull-Ups',
  'squats': 'Squats',
  'chest-dumbbells': 'Chest Dumbbells',
  'sit-ups': 'Sit-ups',
  'biceps': 'Biceps',
  'triceps': 'Triceps'
};

const DEFAULT_EXERCISES = {
  'pull-ups': 0,
  'squats': 0,
  'chest-dumbbells': 0,
  'sit-ups': 0,
  'biceps': 0,
  'triceps': 0
};

// Helper to build API URL without double slashes
function buildApiUrl(path) {
  const base = API_BASE_URL || '';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

// Helper to build fetch options with auth header
function getFetchOptions(method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Add auth header if available
  const authHeader = window.cognitoAuth?.getAuthHeader();
  if (authHeader) {
    options.headers['Authorization'] = authHeader;
  }
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return options;
}

// Load all counters on page load
async function loadCounters() {
  showLoader();
  try {
    // No userId needed - backend uses Cognito user ID
    const response = await fetch(buildApiUrl('/api/counters'), getFetchOptions('GET'));
    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated - show auth modal
        showAuthModal();
        hideLoader();
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    counters = await response.json();
    counters = { ...DEFAULT_EXERCISES, ...(counters || {}) };
    
    renderExercises();
  } catch (error) {
    console.error('Failed to load counters:', error);
    // Show user-friendly error message
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      alert('⚠️ Cannot connect to API server.\n\nMake sure SAM Local is running:\nnpm run start:sam:watch\n\nOr use the Express server:\nnpm start');
    }
    // Initialize with default exercises on error
    counters = { ...DEFAULT_EXERCISES };
    renderExercises();
  } finally {
    hideLoader();
  }
}

// Render exercise buttons
function renderExercises() {
  exercisesGrid.innerHTML = '';
  
  Object.keys(counters).forEach(exercise => {
    const button = document.createElement('button');
    button.className = 'exercise-button';
    button.id = `exercise-${exercise}`;
    
    // Disable buttons if timer is running (rest period)
    button.disabled = isRunning;
    
    const name = document.createElement('div');
    name.className = 'exercise-name';
    
    const count = document.createElement('div');
    count.className = 'exercise-count';
    count.textContent = counters[exercise] || 0;
    count.id = `count-${exercise}`;
    
    button.appendChild(name);
    button.appendChild(count);
    
    // Update button text based on state
    function updateButtonText() {
      if (isDoingExercise && currentExercise === exercise) {
        name.textContent = 'Done';
      } else {
        name.textContent = exerciseNames[exercise] || exercise.replace(/-/g, ' ');
      }
    }
    
    updateButtonText();
    
    button.addEventListener('click', () => {
      // Stop alarm if it's playing
      stopAlarm();
      
      if (isRunning) return; // Can't start exercise during rest period
      
      if (isDoingExercise && currentExercise === exercise) {
        // Clicking "Done" - finish exercise and start rest timer
        finishExercise(exercise);
      } else if (!isDoingExercise) {
        // Starting new exercise - start stopwatch
        startExercise(exercise);
      }
    });
    
    exercisesGrid.appendChild(button);
    
    // Store update function for this button
    button.updateText = updateButtonText;
  });
}

// Start exercise (start stopwatch)
function startExercise(exercise) {
  if (isDoingExercise || isRunning) return;
  
  isDoingExercise = true;
  currentExercise = exercise;
  stopwatchStartTime = Date.now();
  stopwatchTime = 0;
  
  // Disable all other exercise buttons
  document.querySelectorAll('.exercise-button').forEach(btn => {
    if (btn.id !== `exercise-${exercise}`) {
      btn.disabled = true;
    }
    if (btn.updateText) btn.updateText();
  });
  
  // Disable timer duration input during exercise
  timerDurationInput.disabled = true;
  
  // Update display frequently for smooth updates
  stopwatchInterval = setInterval(() => {
    updateDisplay();
  }, 100); // Update every 100ms for smooth display
  
  updateDisplay();
}

// Finish exercise (increment counter and start rest timer)
function finishExercise(exercise) {
  if (!isDoingExercise || currentExercise !== exercise) return;
  
  // Stop stopwatch
  if (stopwatchInterval) {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
  }
  
  // Calculate final stopwatch time
  if (stopwatchStartTime) {
    stopwatchTime = Date.now() - stopwatchStartTime;
  }
  
  isDoingExercise = false;
  currentExercise = null;
  stopwatchStartTime = null;
  
  // Increment counter
  incrementCounter(exercise).then(() => {
    // Start 6-minute rest timer
    startRestTimer();
  });
  
  // Update all button texts
  document.querySelectorAll('.exercise-button').forEach(btn => {
    if (btn.updateText) btn.updateText();
    btn.disabled = false;
  });
  
  // Re-enable timer duration input
  timerDurationInput.disabled = false;
}

// Start rest timer
function startRestTimer() {
  if (isRunning) return;
  
  isRunning = true;
  restTimerStartTime = Date.now();
  timeRemaining = timerDuration;
  
  // Disable all exercise buttons during rest
  document.querySelectorAll('.exercise-button').forEach(btn => {
    btn.disabled = true;
  });
  
  // Disable timer duration input during rest
  timerDurationInput.disabled = true;
  
  // Show reset timer button
  if (resetTimerBtn) {
    resetTimerBtn.style.display = 'block';
  }
  
  // Update display frequently for accurate timing even when tab is inactive
  timerInterval = setInterval(() => {
    updateDisplay();
  }, 100); // Update every 100ms for smooth and accurate display
  
  updateDisplay();
}

// Reset timer (stop and reset to default duration)
function resetTimer() {
  // Clear timer interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Stop alarm if playing
  stopAlarm();
  
  isRunning = false;
  restTimerStartTime = null;
  timeRemaining = timerDuration;
  
  // Re-enable all exercise buttons
  document.querySelectorAll('.exercise-button').forEach(btn => {
    btn.disabled = false;
  });
  
  // Re-enable timer duration input
  timerDurationInput.disabled = false;
  
  // Hide reset timer button
  if (resetTimerBtn) {
    resetTimerBtn.style.display = 'none';
  }
  
  updateDisplay();
}

// Reset all counters to zero
async function resetAllCounters() {
  
  if (!confirm('Reset all counters to zero?')) {
    return;
  }
  
  showLoader();
  try {
    // No userId needed - backend uses Cognito user ID
    const response = await fetch(
      buildApiUrl('/api/counters/reset'),
      getFetchOptions('POST', {})
    );
    
    if (response.status === 401) {
      showAuthModal();
      hideLoader();
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    counters = data;
    
    // Update all count displays
    Object.keys(counters).forEach(exercise => {
      const countElement = document.getElementById(`count-${exercise}`);
      if (countElement) {
        countElement.textContent = counters[exercise] || 0;
      }
    });
  } catch (error) {
    console.error('Failed to reset counters:', error);
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      alert('⚠️ Cannot connect to API server.\n\nMake sure SAM Local is running:\nnpm run start:sam:watch');
    }
  } finally {
    hideLoader();
  }
}

// Increment specific exercise counter
async function incrementCounter(exercise) {
  showLoader();
  try {
    // Read the increment value from the input field
    const inputValue = incrementInput.value.trim();
    let incrementValue = parseInt(inputValue, 10);
    
    // Validate the increment value - if invalid, use 12 as default
    if (isNaN(incrementValue) || incrementValue < 1 || incrementValue > 100) {
      incrementValue = 12;
    }
    
    console.log('Incrementing by:', incrementValue, 'Input value was:', inputValue);
    
    // No userId needed - backend uses Cognito user ID
    const response = await fetch(
      buildApiUrl('/api/counters/increment'),
      getFetchOptions('POST', { exercise, increment: incrementValue })
    );
    
    if (response.status === 401) {
      showAuthModal();
      hideLoader();
      return;
    }
    
    const data = await response.json();
    counters = data;
    
    // Update the count display
    const countElement = document.getElementById(`count-${exercise}`);
    if (countElement) {
      countElement.textContent = counters[exercise];
    }
    
  } catch (error) {
    console.error('Failed to increment counter:', error);
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      alert('⚠️ Cannot connect to API server.\n\nMake sure SAM Local is running:\nnpm run start:sam:watch');
    }
  } finally {
    hideLoader();
  }
}

// Format time as MM:SS
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Update timer display
function updateDisplay() {
  if (isDoingExercise && stopwatchStartTime) {
    // Calculate stopwatch time based on actual elapsed time
    const elapsed = Date.now() - stopwatchStartTime;
    timerDisplay.textContent = formatTime(elapsed);
  } else if (isRunning && restTimerStartTime) {
    // Calculate remaining time based on actual elapsed time
    const elapsed = Date.now() - restTimerStartTime;
    const remaining = Math.max(0, timerDuration - elapsed);
    timerDisplay.textContent = formatTime(remaining);
    
    // Check if timer finished
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = '00:00';
      playAlarm();
      isRunning = false;
      restTimerStartTime = null;
      
      // Re-enable all exercise buttons
      document.querySelectorAll('.exercise-button').forEach(btn => {
        btn.disabled = false;
      });
      
      // Re-enable timer duration input
      timerDurationInput.disabled = false;
      
      // Hide reset timer button when timer finishes
      if (resetTimerBtn) {
        resetTimerBtn.style.display = 'none';
      }
    }
  } else {
    // Show current timer duration
    timerDisplay.textContent = formatTime(timerDuration);
  }
}


// Play alarm sound from MP3 file
function playAlarm() {
  // Stop any existing alarm
  stopAlarm();
  
  try {
    // Set volume to soft (30%)
    alarmSound.volume = 0.3;
    
    // Reset to beginning and play
    alarmSound.currentTime = 0;
    alarmSound.play().then(() => {
      // Show stop alarm button when playing
      if (stopAlarmBtn) {
        stopAlarmBtn.style.display = 'block';
      }
    }).catch(error => {
      console.error('Failed to play alarm:', error);
      // Fallback: show alert if audio fails
      alert('Timer finished!');
      if (stopAlarmBtn) {
        stopAlarmBtn.style.display = 'block';
      }
    });
  } catch (error) {
    console.error('Failed to play alarm:', error);
    alert('Timer finished!');
    if (stopAlarmBtn) {
      stopAlarmBtn.style.display = 'block';
    }
  }
}

// Stop alarm sound
function stopAlarm() {
  if (alarmSound) {
    alarmSound.pause();
    alarmSound.currentTime = 0;
  }
  // Hide stop alarm button
  if (stopAlarmBtn) {
    stopAlarmBtn.style.display = 'none';
  }
  // Re-enable timer duration input if timer is not running
  if (!isRunning) {
    timerDurationInput.disabled = false;
  }
}

// Button click handlers
stopAlarmBtn.addEventListener('click', () => {
  stopAlarm();
});

resetTimerBtn.addEventListener('click', () => {
  resetTimer();
});

// Reset counters button - always show (works in production too)
if (resetCountersBtn) {
  resetCountersBtn.style.display = 'block';
  resetCountersBtn.addEventListener('click', () => {
    resetAllCounters();
  });
}

// Handle tab visibility changes to ensure timer continues accurately
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden) {
    // Tab became visible - update display immediately
    updateDisplay();
    
    // Refresh session if authenticated (handles token expiration after hours away)
    if (window.cognitoAuth && window.cognitoAuth.isAuthenticated()) {
      try {
        await window.cognitoAuth.checkSession();
        // If session check failed, show auth modal
        if (!window.cognitoAuth.isAuthenticated()) {
          showAuthModal();
        }
      } catch (e) {
        console.error('Session refresh failed:', e);
      }
    }
  }
});

// Display user ID
function displayUserId() {
  const userIdDisplay = document.getElementById('userIdDisplay');
  if (userIdDisplay) {
    // Show Cognito user info instead of generated userId
    window.cognitoAuth.getUserEmail().then(email => {
      if (email) {
        userIdDisplay.textContent = `User: ${email}`;
      }
    });
  }
}

// Auth UI Functions
function showAuthModal() {
  const authModal = document.getElementById('authModal');
  const mainContainer = document.getElementById('mainContainer');
  if (authModal) authModal.style.display = 'flex';
  if (mainContainer) mainContainer.style.display = 'none';
}

function hideAuthModal() {
  const authModal = document.getElementById('authModal');
  const mainContainer = document.getElementById('mainContainer');
  if (authModal) authModal.style.display = 'none';
  if (mainContainer) mainContainer.style.display = 'block';
}

function showAuthError(message) {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function hideAuthError() {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// Initialize authentication UI
function initAuthUI() {
  const signInBtn = document.getElementById('signInBtn');
  const signUpBtn = document.getElementById('signUpBtn');
  const verifyBtn = document.getElementById('verifyBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const showSignUp = document.getElementById('showSignUp');
  const showSignIn = document.getElementById('showSignIn');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const verifyForm = document.getElementById('verifyForm');
  const authTitle = document.getElementById('authTitle');
  const userEmail = document.getElementById('userEmail');
  
  let pendingEmail = null;

  // Sign In
  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      hideAuthError();
      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;
      
      if (!email || !password) {
        showAuthError('Please enter email and password');
        return;
      }
      
      try {
        await window.cognitoAuth.signIn(email, password);
        hideAuthModal();
        await updateUserDisplay();
        await loadCounters();
      } catch (error) {
        showAuthError(error.message || 'Sign in failed');
      }
    });
  }

  // Sign Up
  if (signUpBtn) {
    signUpBtn.addEventListener('click', async () => {
      hideAuthError();
      const email = document.getElementById('signUpEmail').value;
      const password = document.getElementById('signUpPassword').value;
      
      if (!email || !password) {
        showAuthError('Please enter email and password');
        return;
      }
      
      if (password.length < 8) {
        showAuthError('Password must be at least 8 characters');
        return;
      }
      
      try {
        await window.cognitoAuth.signUp(email, password);
        pendingEmail = email;
        signUpForm.style.display = 'none';
        verifyForm.style.display = 'block';
        authTitle.textContent = 'Verify Email';
      } catch (error) {
        showAuthError(error.message || 'Sign up failed');
      }
    });
  }

  // Verify
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      hideAuthError();
      const code = document.getElementById('verifyCode').value;
      
      if (!code) {
        showAuthError('Please enter verification code');
        return;
      }
      
      try {
        await window.cognitoAuth.confirmSignUp(pendingEmail, code);
        // After verification, sign in
        await window.cognitoAuth.signIn(pendingEmail, document.getElementById('signUpPassword').value);
        hideAuthModal();
        await updateUserDisplay();
        await loadCounters();
      } catch (error) {
        showAuthError(error.message || 'Verification failed');
      }
    });
  }

  // Sign Out
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.cognitoAuth.signOut();
      showAuthModal();
      signInForm.style.display = 'block';
      signUpForm.style.display = 'none';
      verifyForm.style.display = 'none';
      authTitle.textContent = 'Sign In';
    });
  }

  // Toggle forms
  if (showSignUp) {
    showSignUp.addEventListener('click', (e) => {
      e.preventDefault();
      signInForm.style.display = 'none';
      signUpForm.style.display = 'block';
      authTitle.textContent = 'Sign Up';
      hideAuthError();
    });
  }

  if (showSignIn) {
    showSignIn.addEventListener('click', (e) => {
      e.preventDefault();
      signUpForm.style.display = 'none';
      signInForm.style.display = 'block';
      authTitle.textContent = 'Sign In';
      hideAuthError();
    });
  }

  // Update user email display
  async function updateUserDisplay() {
    const email = await window.cognitoAuth.getUserEmail();
    if (userEmail && email) {
      userEmail.textContent = email;
    }
    displayUserId();
  }

  return updateUserDisplay;
}

// Initialize app
async function initApp() {
  showLoader();
  // Wait for auth module to be available
  if (!window.cognitoAuth) {
    console.error('Auth module not loaded');
    hideLoader();
    return;
  }
  
  // Initialize auth
  try {
    await window.cognitoAuth.init();
  } catch (e) {
    console.error('Auth init failed:', e);
  }
  
  // Initialize auth UI
  const updateUserDisplay = initAuthUI();
  
  // Check if authenticated
  if (window.cognitoAuth.isAuthenticated()) {
    hideAuthModal();
    await updateUserDisplay();
    displayUserId();
    loadCounters();
    updateDisplay();
  } else {
    showAuthModal();
  }
  
  // Re-render exercises when counters are loaded
  setTimeout(() => {
    renderExercises();
  }, 100);

  hideLoader();
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for scripts to load
    setTimeout(initApp, 100);
  });
} else {
  setTimeout(initApp, 100);
}

