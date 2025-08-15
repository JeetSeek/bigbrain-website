/**
 * Performance Monitoring Service
 * Provides comprehensive performance monitoring, metrics collection, and alerting
 */

import EventEmitter from 'events';
import os from 'os';
import process from 'process';

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: new Map(),
        byStatusCode: new Map(),
        responseTimes: []
      },
      system: {
        memory: {
          used: 0,
          free: 0,
          total: 0,
          heapUsed: 0,
          heapTotal: 0
        },
        cpu: {
          usage: 0,
          loadAverage: []
        },
        uptime: 0
      },
      database: {
        connections: 0,
        queries: 0,
        queryTimes: [],
        errors: 0
      },
      ai: {
        requests: 0,
        tokens: 0,
        responseTimes: [],
        errors: 0,
        modelUsage: new Map()
      }
    };

    this.alerts = {
      thresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 0.05, // 5%
        memoryUsage: 0.9, // 90%
        cpuUsage: 0.8 // 80%
      },
      history: []
    };

    this.startTime = Date.now();
    this.isMonitoring = false;
    
    // Start monitoring intervals
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Collect system metrics every 30 seconds
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Check alerts every minute
    this.alertsInterval = setInterval(() => {
      this.checkAlerts();
    }, 60000);

    // Clean up old metrics every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);

  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    clearInterval(this.systemMetricsInterval);
    clearInterval(this.alertsInterval);
    clearInterval(this.cleanupInterval);
    
  }

  /**
   * Record API request metrics
   */
  recordRequest(endpoint, method, statusCode, responseTime, error = null) {
    const endpointKey = `${method} ${endpoint}`;
    
    // Update request counters
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    // Track by endpoint
    const endpointStats = this.metrics.requests.byEndpoint.get(endpointKey) || {
      count: 0,
      errors: 0,
      totalResponseTime: 0,
      avgResponseTime: 0
    };
    
    endpointStats.count++;
    endpointStats.totalResponseTime += responseTime;
    endpointStats.avgResponseTime = endpointStats.totalResponseTime / endpointStats.count;
    
    if (error) {
      endpointStats.errors++;
    }
    
    this.metrics.requests.byEndpoint.set(endpointKey, endpointStats);

    // Track by status code
    const statusCount = this.metrics.requests.byStatusCode.get(statusCode) || 0;
    this.metrics.requests.byStatusCode.set(statusCode, statusCount + 1);

    // Track response times (keep last 1000)
    this.metrics.requests.responseTimes.push({
      timestamp: Date.now(),
      responseTime,
      endpoint: endpointKey,
      statusCode
    });

    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes.shift();
    }

    // Emit event for real-time monitoring
    this.emit('request', {
      endpoint: endpointKey,
      statusCode,
      responseTime,
      error
    });
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(operation, duration, error = null) {
    this.metrics.database.queries++;
    
    if (error) {
      this.metrics.database.errors++;
    }

    // Track query times (keep last 500)
    this.metrics.database.queryTimes.push({
      timestamp: Date.now(),
      operation,
      duration,
      error: !!error
    });

    if (this.metrics.database.queryTimes.length > 500) {
      this.metrics.database.queryTimes.shift();
    }

    this.emit('database', {
      operation,
      duration,
      error
    });
  }

  /**
   * Record AI service metrics
   */
  recordAIOperation(model, tokens, duration, error = null) {
    this.metrics.ai.requests++;
    this.metrics.ai.tokens += tokens;
    
    if (error) {
      this.metrics.ai.errors++;
    }

    // Track model usage
    const modelStats = this.metrics.ai.modelUsage.get(model) || {
      requests: 0,
      tokens: 0,
      errors: 0,
      avgDuration: 0,
      totalDuration: 0
    };
    
    modelStats.requests++;
    modelStats.tokens += tokens;
    modelStats.totalDuration += duration;
    modelStats.avgDuration = modelStats.totalDuration / modelStats.requests;
    
    if (error) {
      modelStats.errors++;
    }
    
    this.metrics.ai.modelUsage.set(model, modelStats);

    // Track response times
    this.metrics.ai.responseTimes.push({
      timestamp: Date.now(),
      model,
      duration,
      tokens,
      error: !!error
    });

    if (this.metrics.ai.responseTimes.length > 500) {
      this.metrics.ai.responseTimes.shift();
    }

    this.emit('ai', {
      model,
      tokens,
      duration,
      error
    });
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    this.metrics.system.memory = {
      used: usedMem,
      free: freeMem,
      total: totalMem,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      usagePercent: usedMem / totalMem
    };

    this.metrics.system.cpu = {
      loadAverage: os.loadavg(),
      usage: this.calculateCPUUsage()
    };

    this.metrics.system.uptime = Date.now() - this.startTime;

    this.emit('system', this.metrics.system);
  }

  /**
   * Calculate CPU usage percentage
   */
  calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    if (!this.previousCPU) {
      this.previousCPU = { idle, total };
      return 0;
    }

    const idleDifference = idle - this.previousCPU.idle;
    const totalDifference = total - this.previousCPU.total;
    
    this.previousCPU = { idle, total };
    
    return 100 - (100 * idleDifference / totalDifference);
  }

  /**
   * Check for performance alerts
   */
  checkAlerts() {
    const alerts = [];
    const now = Date.now();

    // Check response time alerts
    const recentRequests = this.metrics.requests.responseTimes.filter(
      req => now - req.timestamp < 300000 // Last 5 minutes
    );

    if (recentRequests.length > 0) {
      const avgResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length;
      
      if (avgResponseTime > this.alerts.thresholds.responseTime) {
        alerts.push({
          type: 'response_time',
          severity: 'warning',
          message: `Average response time (${Math.round(avgResponseTime)}ms) exceeds threshold (${this.alerts.thresholds.responseTime}ms)`,
          value: avgResponseTime,
          threshold: this.alerts.thresholds.responseTime
        });
      }
    }

    // Check error rate alerts
    const recentErrors = recentRequests.filter(req => req.statusCode >= 400).length;
    const errorRate = recentRequests.length > 0 ? recentErrors / recentRequests.length : 0;
    
    if (errorRate > this.alerts.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold (${(this.alerts.thresholds.errorRate * 100).toFixed(1)}%)`,
        value: errorRate,
        threshold: this.alerts.thresholds.errorRate
      });
    }

    // Check memory usage alerts
    if (this.metrics.system.memory.usagePercent > this.alerts.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'warning',
        message: `Memory usage (${(this.metrics.system.memory.usagePercent * 100).toFixed(1)}%) exceeds threshold (${(this.alerts.thresholds.memoryUsage * 100).toFixed(1)}%)`,
        value: this.metrics.system.memory.usagePercent,
        threshold: this.alerts.thresholds.memoryUsage
      });
    }

    // Check CPU usage alerts
    if (this.metrics.system.cpu.usage > this.alerts.thresholds.cpuUsage * 100) {
      alerts.push({
        type: 'cpu_usage',
        severity: 'warning',
        message: `CPU usage (${this.metrics.system.cpu.usage.toFixed(1)}%) exceeds threshold (${(this.alerts.thresholds.cpuUsage * 100).toFixed(1)}%)`,
        value: this.metrics.system.cpu.usage / 100,
        threshold: this.alerts.thresholds.cpuUsage
      });
    }

    // Process alerts
    alerts.forEach(alert => {
      alert.timestamp = now;
      this.alerts.history.push(alert);
      this.emit('alert', alert);
      
      console.warn(`🚨 PERFORMANCE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    });

    // Keep only last 100 alerts
    if (this.alerts.history.length > 100) {
      this.alerts.history = this.alerts.history.slice(-100);
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - 3600000; // 1 hour ago

    // Clean up response times
    this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.filter(
      req => req.timestamp > cutoff
    );

    // Clean up database query times
    this.metrics.database.queryTimes = this.metrics.database.queryTimes.filter(
      query => query.timestamp > cutoff
    );

    // Clean up AI response times
    this.metrics.ai.responseTimes = this.metrics.ai.responseTimes.filter(
      ai => ai.timestamp > cutoff
    );

  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate recent metrics (last 5 minutes)
    const recentRequests = this.metrics.requests.responseTimes.filter(
      req => now - req.timestamp < 300000
    );

    const avgResponseTime = recentRequests.length > 0 
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
      : 0;

    const errorRate = recentRequests.length > 0
      ? recentRequests.filter(req => req.statusCode >= 400).length / recentRequests.length
      : 0;

    // Top endpoints by request count
    const topEndpoints = Array.from(this.metrics.requests.byEndpoint.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        errorRate: stats.count > 0 ? stats.errors / stats.count : 0
      }));

    // AI model performance
    const aiModels = Array.from(this.metrics.ai.modelUsage.entries())
      .map(([model, stats]) => ({
        model,
        ...stats,
        errorRate: stats.requests > 0 ? stats.errors / stats.requests : 0
      }));

    return {
      timestamp: now,
      uptime,
      summary: {
        totalRequests: this.metrics.requests.total,
        successRate: this.metrics.requests.total > 0 
          ? this.metrics.requests.success / this.metrics.requests.total 
          : 0,
        avgResponseTime,
        errorRate,
        systemHealth: {
          memoryUsage: this.metrics.system.memory.usagePercent,
          cpuUsage: this.metrics.system.cpu.usage / 100,
          uptime
        }
      },
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        errors: this.metrics.requests.errors,
        recentCount: recentRequests.length,
        avgResponseTime,
        topEndpoints
      },
      system: this.metrics.system,
      database: {
        ...this.metrics.database,
        avgQueryTime: this.metrics.database.queryTimes.length > 0
          ? this.metrics.database.queryTimes.reduce((sum, q) => sum + q.duration, 0) / this.metrics.database.queryTimes.length
          : 0
      },
      ai: {
        ...this.metrics.ai,
        models: aiModels,
        avgResponseTime: this.metrics.ai.responseTimes.length > 0
          ? this.metrics.ai.responseTimes.reduce((sum, ai) => sum + ai.duration, 0) / this.metrics.ai.responseTimes.length
          : 0
      },
      alerts: {
        recent: this.alerts.history.filter(alert => now - alert.timestamp < 3600000), // Last hour
        thresholds: this.alerts.thresholds
      }
    };
  }

  /**
   * Get health status based on current metrics
   */
  getHealthStatus() {
    const report = this.getPerformanceReport();
    
    let status = 'healthy';
    const issues = [];

    // Check various health indicators
    if (report.summary.errorRate > this.alerts.thresholds.errorRate) {
      status = 'degraded';
      issues.push(`High error rate: ${(report.summary.errorRate * 100).toFixed(1)}%`);
    }

    if (report.summary.avgResponseTime > this.alerts.thresholds.responseTime) {
      status = 'degraded';
      issues.push(`Slow response time: ${Math.round(report.summary.avgResponseTime)}ms`);
    }

    if (report.system.memory.usagePercent > this.alerts.thresholds.memoryUsage) {
      status = 'degraded';
      issues.push(`High memory usage: ${(report.system.memory.usagePercent * 100).toFixed(1)}%`);
    }

    if (report.system.cpu.usage > this.alerts.thresholds.cpuUsage * 100) {
      status = 'degraded';
      issues.push(`High CPU usage: ${report.system.cpu.usage.toFixed(1)}%`);
    }

    // Check for critical issues
    if (report.summary.errorRate > 0.2 || report.system.memory.usagePercent > 0.95) {
      status = 'unhealthy';
    }

    return {
      status,
      issues,
      timestamp: Date.now(),
      uptime: report.uptime
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format = 'json') {
    const report = this.getPerformanceReport();
    
    switch (format) {
      case 'prometheus':
        return this.formatPrometheusMetrics(report);
      case 'json':
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  /**
   * Format metrics for Prometheus
   */
  formatPrometheusMetrics(report) {
    const metrics = [];
    
    // Request metrics
    metrics.push(`# HELP boilerbrain_requests_total Total number of requests`);
    metrics.push(`# TYPE boilerbrain_requests_total counter`);
    metrics.push(`boilerbrain_requests_total ${report.requests.total}`);
    
    metrics.push(`# HELP boilerbrain_request_duration_seconds Request duration in seconds`);
    metrics.push(`# TYPE boilerbrain_request_duration_seconds histogram`);
    metrics.push(`boilerbrain_request_duration_seconds ${report.summary.avgResponseTime / 1000}`);
    
    // System metrics
    metrics.push(`# HELP boilerbrain_memory_usage_ratio Memory usage ratio`);
    metrics.push(`# TYPE boilerbrain_memory_usage_ratio gauge`);
    metrics.push(`boilerbrain_memory_usage_ratio ${report.system.memory.usagePercent}`);
    
    metrics.push(`# HELP boilerbrain_cpu_usage_ratio CPU usage ratio`);
    metrics.push(`# TYPE boilerbrain_cpu_usage_ratio gauge`);
    metrics.push(`boilerbrain_cpu_usage_ratio ${report.system.cpu.usage / 100}`);
    
    return metrics.join('\n');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
