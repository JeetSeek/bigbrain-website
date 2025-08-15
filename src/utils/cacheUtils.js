/**
 * Caching utility for BoilerBrain application
 * Provides memory caching with TTL (time-to-live) and localStorage persistence options
 */
import React from 'react';

import { CACHE } from './constants';

// In-memory cache storage
const memoryCache = new Map();

/**
 * Get a value from cache
 * @param {string} key - The cache key
 * @param {object} options - Cache options
 * @param {boolean} options.useLocalStorage - Whether to also check localStorage
 * @param {number} options.ttl - Time to live in milliseconds
 * @returns {any|null} - The cached value or null if not found/expired
 */
export const getCachedData = (key, options = {}) => {
  const { useLocalStorage = false, ttl } = options;

  // Check memory cache first (faster)
  if (memoryCache.has(key)) {
    const cachedItem = memoryCache.get(key);

    // Check if item has expired
    if (ttl && cachedItem.timestamp && Date.now() - cachedItem.timestamp > ttl) {
      memoryCache.delete(key);
      return null;
    }

    return cachedItem.value;
  }

  // Then check localStorage if specified
  if (useLocalStorage) {
    try {
      const storedItem = localStorage.getItem(`${CACHE.PREFIX}${key}`);
      if (storedItem) {
        const parsedItem = JSON.parse(storedItem);

        // Check if localStorage item has expired
        if (ttl && parsedItem.timestamp && Date.now() - parsedItem.timestamp > ttl) {
          localStorage.removeItem(`${CACHE.PREFIX}${key}`);
          return null;
        }

        // Add back to memory cache and return
        memoryCache.set(key, parsedItem);
        return parsedItem.value;
      }
    } catch (error) {
      console.error('Error reading from localStorage cache:', error);
    }
  }

  return null;
};

/**
 * Store a value in cache
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {object} options - Cache options
 * @param {boolean} options.useLocalStorage - Whether to also store in localStorage
 * @returns {void}
 */
export const setCachedData = (key, value, options = {}) => {
  const { useLocalStorage = false } = options;

  // Store in memory cache
  const timestamp = Date.now();
  memoryCache.set(key, { value, timestamp });

  // Also store in localStorage if specified
  if (useLocalStorage && value !== undefined) {
    try {
      localStorage.setItem(`${CACHE.PREFIX}${key}`, JSON.stringify({ value, timestamp }));
    } catch (error) {
      console.error('Error writing to localStorage cache:', error);
    }
  }
};

/**
 * Remove a value from cache
 * @param {string} key - The cache key
 * @param {object} options - Cache options
 * @param {boolean} options.useLocalStorage - Whether to also remove from localStorage
 * @returns {void}
 */
export const removeCachedData = (key, options = {}) => {
  const { useLocalStorage = false } = options;

  // Remove from memory cache
  memoryCache.delete(key);

  // Also remove from localStorage if specified
  if (useLocalStorage) {
    try {
      localStorage.removeItem(`${CACHE.PREFIX}${key}`);
    } catch (error) {
      console.error('Error removing from localStorage cache:', error);
    }
  }
};

/**
 * Clear all cached data
 * @param {object} options - Cache options
 * @param {boolean} options.useLocalStorage - Whether to also clear localStorage
 * @returns {void}
 */
export const clearCache = (options = {}) => {
  const { useLocalStorage = false } = options;

  // Clear memory cache
  memoryCache.clear();

  // Also clear localStorage if specified
  if (useLocalStorage) {
    try {
      // Only clear keys with our prefix
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE.PREFIX))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing localStorage cache:', error);
    }
  }
};

/**
 * React hook for cached data with automatic refresh
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data when not in cache
 * @param {object} options - Cache options
 * @returns {[any, boolean, Error|null]} - [data, loading, error]
 */
export function useCachedData(key, fetchFn, options = {}) {
  const { ttl = CACHE.DEFAULT_TTL, useLocalStorage = false, forceRefresh = false } = options;

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to get from cache first, unless forcing refresh
        if (!forceRefresh) {
          const cachedData = getCachedData(key, { useLocalStorage, ttl });

          if (cachedData !== null) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        }

        // Not in cache or forcing refresh, fetch fresh data
        const freshData = await fetchFn();

        // Store in cache and update state
        setCachedData(key, freshData, { useLocalStorage });
        setData(freshData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, ttl, useLocalStorage, forceRefresh, fetchFn]);

  return [data, loading, error];
}

// Only export named exports for better tree-shaking and consistency
// Remove the default export to avoid confusion
