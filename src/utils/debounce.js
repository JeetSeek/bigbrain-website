/**
 * Debounce Utility
 * Delays function execution until after a specified delay
 */

/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked
 * 
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds (default: 300ms)
 * @returns {Function} The debounced function
 * 
 * @example
 * const debouncedSearch = debounce((value) => {
 *   console.log('Searching for:', value);
 * }, 300);
 * 
 * // Call multiple times - only the last call executes after 300ms
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // Only this executes
 */
export function debounce(func, delay = 300) {
  let timeoutId;

  const debounced = function (...args) {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };

  // Add cancel method to clear pending execution
  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 * 
 * @param {Function} func - The function to throttle
 * @param {number} wait - The wait time in milliseconds (default: 300ms)
 * @returns {Function} The throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event');
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(func, wait = 300) {
  let timeout;
  let previous = 0;

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };

  // Add cancel method
  throttled.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
  };

  return throttled;
}

export default debounce;
