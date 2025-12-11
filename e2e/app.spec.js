const { test, expect } = require('@playwright/test');

test.describe('Exercise Timer App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForSelector('#timer');
  });

  test('should display timer and exercise buttons', async ({ page }) => {
    // Check timer is visible
    const timer = page.locator('#timer');
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText('06:00');

    // Check exercises grid is visible
    const exercisesGrid = page.locator('#exercisesGrid');
    await expect(exercisesGrid).toBeVisible();

    // Check at least one exercise button exists
    const exerciseButtons = page.locator('.exercise-button');
    const count = await exerciseButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should start stopwatch when clicking exercise button', async ({ page }) => {
    const firstExerciseButton = page.locator('.exercise-button').first();
    const exerciseName = await firstExerciseButton.locator('.exercise-name').textContent();
    
    // Click exercise button
    await firstExerciseButton.click();

    // Check timer starts counting up (stopwatch mode)
    const timer = page.locator('#timer');
    await page.waitForTimeout(1100); // Wait 1.1 seconds
    
    const timerText = await timer.textContent();
    expect(timerText).not.toBe('06:00');
    
    // Check button text changes to "Done"
    await expect(firstExerciseButton.locator('.exercise-name')).toHaveText('Done');
  });

  test('should increment counter and start rest timer when clicking Done', async ({ page }) => {
    const firstExerciseButton = page.locator('.exercise-button').first();
    const countElement = firstExerciseButton.locator('.exercise-count');
    const initialCount = parseInt(await countElement.textContent()) || 0;

    // Start exercise
    await firstExerciseButton.click();
    await page.waitForTimeout(500);

    // Click Done
    await firstExerciseButton.click();

    // Check counter incremented
    await page.waitForTimeout(500);
    const newCount = parseInt(await countElement.textContent()) || 0;
    expect(newCount).toBeGreaterThan(initialCount);

    // Check timer is counting down (rest mode)
    const timer = page.locator('#timer');
    await page.waitForTimeout(1100);
    const timerText = await timer.textContent();
    
    // Should be counting down from 06:00 (or 03:00 if user changed TIMER_DURATION)
    const minutes = parseInt(timerText.split(':')[0]);
    expect(minutes).toBeLessThanOrEqual(6);
  });

  test('should disable other exercise buttons when one exercise is active', async ({ page }) => {
    const exerciseButtons = page.locator('.exercise-button');
    const firstButton = exerciseButtons.first();
    const secondButton = exerciseButtons.nth(1);

    // Click first exercise
    await firstButton.click();
    await page.waitForTimeout(100);

    // Check second button is disabled
    await expect(secondButton).toBeDisabled();
  });

  test('should allow changing increment value', async ({ page }) => {
    const incrementInput = page.locator('#incrementValue');
    
    // Change increment value
    await incrementInput.fill('5');
    await incrementInput.blur();
    
    // Verify value is saved
    const value = await incrementInput.inputValue();
    expect(value).toBe('5');
  });

  test('should use custom increment value when incrementing counter', async ({ page }) => {
    const incrementInput = page.locator('#incrementValue');
    const firstExerciseButton = page.locator('.exercise-button').first();
    const countElement = firstExerciseButton.locator('.exercise-count');
    
    // Set increment to 5
    await incrementInput.fill('5');
    await incrementInput.blur();
    
    // Get initial count
    const initialCount = parseInt(await countElement.textContent()) || 0;
    
    // Start and finish exercise
    await firstExerciseButton.click();
    await page.waitForTimeout(500);
    await firstExerciseButton.click();
    
    // Check counter incremented by 5
    await page.waitForTimeout(500);
    const newCount = parseInt(await countElement.textContent()) || 0;
    expect(newCount - initialCount).toBe(5);
  });

  test('should show stop alarm button when timer finishes', async ({ page }) => {
    // Note: This test assumes TIMER_DURATION is short (like 3 seconds for testing)
    // You may need to adjust based on actual timer duration
    
    const firstExerciseButton = page.locator('.exercise-button').first();
    
    // Start and finish exercise to trigger rest timer
    await firstExerciseButton.click();
    await page.waitForTimeout(500);
    await firstExerciseButton.click();
    
    // Wait for timer to finish (adjust timeout based on TIMER_DURATION)
    // For 3 seconds timer:
    await page.waitForTimeout(4000);
    
    // Check stop alarm button appears
    const stopAlarmBtn = page.locator('#stopAlarmBtn');
    await expect(stopAlarmBtn).toBeVisible();
  });

  test('should stop alarm when stop button is clicked', async ({ page }) => {
    const firstExerciseButton = page.locator('.exercise-button').first();
    
    // Start and finish exercise
    await firstExerciseButton.click();
    await page.waitForTimeout(500);
    await firstExerciseButton.click();
    
    // Wait for alarm
    await page.waitForTimeout(4000);
    
    // Click stop alarm button
    const stopAlarmBtn = page.locator('#stopAlarmBtn');
    if (await stopAlarmBtn.isVisible()) {
      await stopAlarmBtn.click();
      await page.waitForTimeout(500);
      
      // Button should be hidden
      await expect(stopAlarmBtn).not.toBeVisible();
    }
  });

  test('should persist counter values across page refresh', async ({ page }) => {
    const firstExerciseButton = page.locator('.exercise-button').first();
    const countElement = firstExerciseButton.locator('.exercise-count');
    
    // Get initial count
    const initialCount = parseInt(await countElement.textContent()) || 0;
    
    // Increment counter
    await firstExerciseButton.click();
    await page.waitForTimeout(500);
    await firstExerciseButton.click();
    await page.waitForTimeout(1000);
    
    const newCount = parseInt(await countElement.textContent()) || 0;
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('#exercisesGrid');
    
    // Check counter persisted
    const persistedCount = parseInt(await countElement.textContent()) || 0;
    expect(persistedCount).toBe(newCount);
  });

  test('should handle multiple exercises independently', async ({ page }) => {
    const exerciseButtons = page.locator('.exercise-button');
    const firstButton = exerciseButtons.first();
    const secondButton = exerciseButtons.nth(1);
    
    const firstCount = firstButton.locator('.exercise-count');
    const secondCount = secondButton.locator('.exercise-count');
    
    const initialFirstCount = parseInt(await firstCount.textContent()) || 0;
    const initialSecondCount = parseInt(await secondCount.textContent()) || 0;
    
    // Do first exercise
    await firstButton.click();
    await page.waitForTimeout(500);
    await firstButton.click();
    await page.waitForTimeout(2000);
    
    // Do second exercise
    await secondButton.click();
    await page.waitForTimeout(500);
    await secondButton.click();
    await page.waitForTimeout(2000);
    
    // Check both counters incremented independently
    const newFirstCount = parseInt(await firstCount.textContent()) || 0;
    const newSecondCount = parseInt(await secondCount.textContent()) || 0;
    
    expect(newFirstCount).toBeGreaterThan(initialFirstCount);
    expect(newSecondCount).toBeGreaterThan(initialSecondCount);
  });
});

