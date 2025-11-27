/**
 * Performance monitoring utilities
 * Tracks component render times and user interactions
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 100;
  }

  /**
   * Mark the start of a performance measurement
   * @param {string} name - Name of the measurement
   */
  startMeasure(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Mark the end of a performance measurement
   * @param {string} name - Name of the measurement
   * @returns {number|null} Duration in milliseconds
   */
  endMeasure(name) {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measures = performance.getEntriesByName(name);
        if (measures.length > 0) {
          const duration = measures[measures.length - 1].duration;
          
          // Store metric
          this.metrics.push({
            name,
            duration,
            timestamp: Date.now()
          });
          
          // Keep only recent metrics
          if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
          }
          
          // Log slow operations
          if (duration > 1000) {
            console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
          }
          
          // Clean up
          performance.clearMarks(`${name}-start`);
          performance.clearMarks(`${name}-end`);
          performance.clearMeasures(name);
          
          return duration;
        }
      } catch (error) {
        console.error('[Performance] Measurement error:', error);
      }
    }
    return null;
  }

  /**
   * Get performance stats for a specific measurement name
   * @param {string} name - Name of the measurement
   * @returns {Object} Statistics
   */
  getStats(name) {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      name,
      count: filtered.length,
      average: avg.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      total: sum.toFixed(2)
    };
  }

  /**
   * Get all performance metrics
   * @returns {Array} All stored metrics
   */
  getAllMetrics() {
    return this.metrics;
  }

  /**
   * Get summary of all measurements
   * @returns {Object} Summary by measurement name
   */
  getSummary() {
    const names = [...new Set(this.metrics.map(m => m.name))];
    const summary = {};
    
    names.forEach(name => {
      summary[name] = this.getStats(name);
    });
    
    return summary;
  }

  /**
   * Clear all stored metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Report metrics to console
   */
  report() {
    const summary = this.getSummary();
    console.table(summary);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order component to measure component render time
 * @param {React.Component} Component - Component to measure
 * @param {string} componentName - Name for the measurement
 * @returns {React.Component} Wrapped component
 */
export function withPerformanceTracking(Component, componentName) {
  return function PerformanceTrackedComponent(props) {
    const name = componentName || Component.displayName || Component.name || 'Component';
    
    React.useEffect(() => {
      performanceMonitor.endMeasure(`${name}-render`);
    });
    
    performanceMonitor.startMeasure(`${name}-render`);
    
    return <Component {...props} />;
  };
}

/**
 * Hook to measure async operations
 * @param {string} operationName - Name of the operation
 * @returns {Function} Function to wrap async operations
 */
export function usePerformanceTracking(operationName) {
  return React.useCallback(async (operation) => {
    performanceMonitor.startMeasure(operationName);
    try {
      const result = await operation();
      return result;
    } finally {
      performanceMonitor.endMeasure(operationName);
    }
  }, [operationName]);
}

/**
 * Track user interactions
 * @param {string} action - Action name
 * @param {Object} metadata - Additional data
 */
export function trackInteraction(action, metadata = {}) {
  try {
    const interaction = {
      action,
      timestamp: Date.now(),
      url: window.location.pathname,
      ...metadata
    };
    
    // Store in localStorage for later analysis
    const interactions = JSON.parse(localStorage.getItem('bb_interactions') || '[]');
    interactions.push(interaction);
    
    // Keep only last 50 interactions
    if (interactions.length > 50) {
      interactions.shift();
    }
    
    localStorage.setItem('bb_interactions', JSON.stringify(interactions));
    
    // Log important interactions
    if (metadata.important) {
      console.log('[Interaction]', action, metadata);
    }
  } catch (error) {
    console.error('[Performance] Failed to track interaction:', error);
  }
}

/**
 * Measure page load performance
 */
export function measurePageLoad() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  try {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    const firstPaintTime = perfData.responseEnd - perfData.fetchStart;

    const metrics = {
      pageLoadTime,
      domReadyTime,
      firstPaintTime,
      timestamp: Date.now()
    };

    console.log('[Performance] Page Load Metrics:', metrics);
    
    // Store metrics
    localStorage.setItem('bb_page_load', JSON.stringify(metrics));
    
    return metrics;
  } catch (error) {
    console.error('[Performance] Failed to measure page load:', error);
    return null;
  }
}

// Measure page load after window loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(measurePageLoad, 0);
  });
}

export default performanceMonitor;
