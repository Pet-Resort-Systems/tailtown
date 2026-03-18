import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  // Just verify the app renders without errors
  expect(true).toBe(true);
});
