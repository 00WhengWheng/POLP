module.exports = {
  rootDir: '.',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};
