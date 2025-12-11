# Test Suite Documentation

This directory contains comprehensive tests for the Exercise Timer application.

## Test Structure

### Unit Tests

#### Server Tests (`server.test.js`)
- **GET /api/counters**: Tests retrieving all exercise counters
- **POST /api/counters/increment**: Tests incrementing exercise counters
  - Valid increment values
  - Invalid increment values (defaults to 12)
  - Missing exercise name handling
  - Multiple exercises independence
  - Custom increment values

#### Client Tests (`client.test.js`)
- Time formatting functions
- Increment value management (localStorage)
- API call handling
- Increment value validation
- Exercise name formatting

### E2E Tests (`e2e/app.spec.js`)
End-to-end tests using Playwright:
- Page load and display
- Exercise stopwatch functionality
- Counter incrementing
- Rest timer functionality
- Increment value customization
- Alarm functionality
- Counter persistence
- Multiple exercises handling

## Running Tests

### Run all unit tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run E2E tests
```bash
npm run test:e2e
```

### Run all tests (unit + E2E)
```bash
npm run test:all
```

## Test Coverage

The test suite covers:
- ✅ Server API endpoints
- ✅ Client-side logic
- ✅ User interactions
- ✅ Data persistence
- ✅ Error handling
- ✅ Edge cases

## Notes

- E2E tests require the server to be running (handled automatically by Playwright)
- Unit tests use mocks for file system and API calls
- Client tests use jsdom for DOM simulation

