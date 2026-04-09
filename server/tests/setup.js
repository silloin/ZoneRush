// Jest setup file
// Suppress console logs during tests unless explicitly needed
const originalConsole = { ...console };

beforeAll(() => {
  // Silence console during tests (can be overridden per test)
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  };
});

afterAll(() => {
  // Restore console after all tests
  global.console = originalConsole;
});
