/**
 * Custom hook for debouncing values
 * Used for search inputs and other frequently changing values
 * to reduce unnecessary operations
 */
import { useState, useEffect } from 'react';

import { UI } from './constants';

/**
 * useDebounce hook for delaying state updates
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay time in milliseconds, defaults to search debounce
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = UI.DEBOUNCE.SEARCH) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set debouncedValue to value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
