/**
 * LogCollector - Frontend logging utility for BugBox
 * Automatically collects console logs, network requests, and performance metrics
 */

class LogCollector {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:5000',
      enableConsole: config.enableConsole !== false,
      enableNetwork: config.enableNetwork !== false,
      enableUserInteractions: config.enableUserInteractions !== false,
      enablePerformance: config.enablePerformance !== false,
      maxLogs: config.maxLogs || 500,
      ...config,
    };

    this.logs = {
      consoleLogs: [],
      networkRequests: [],
      userInteractions: [],
      performanceMetrics: {},
      sessionDuration: 0,
      browserVersion: '',
      osInfo: '',
    };

    this.sessionStartTime = Date.now();
    this.init();
  }

  init() {
    if (this.config.enableConsole) this.hookConsole();
    if (this.config.enableNetwork) this.hookFetch();
    if (this.config.enableUserInteractions) this.hookUserInteractions();
    if (this.config.enablePerformance) this.collectPerformance();
    this.collectDeviceInfo();
  }

  hookConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    const captureLog = (level, args) => {
      const message = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
      this.logs.consoleLogs.push({
        level,
        message,
        timestamp: new Date(),
        stack: level === 'error' ? new Error().stack : null,
      });
      if (this.logs.consoleLogs.length > this.config.maxLogs) {
        this.logs.consoleLogs.shift();
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      captureLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      captureLog('warn', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      captureLog('info', args);
    };

    console.debug = (...args) => {
      originalDebug(...args);
      captureLog('debug', args);
    };
  }

  hookFetch() {
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = (args[1]?.method || 'GET').toUpperCase();

      return originalFetch.apply(window, args)
        .then((response) => {
          const endTime = performance.now();
          this.logs.networkRequests.push({
            method,
            url,
            status: response.status,
            responseTime: Math.round(endTime - startTime),
            timestamp: new Date(),
            headers: this.extractHeaders(response.headers),
          });
          if (this.logs.networkRequests.length > this.config.maxLogs) {
            this.logs.networkRequests.shift();
          }
          return response;
        })
        .catch((error) => {
          const endTime = performance.now();
          this.logs.networkRequests.push({
            method,
            url,
            status: 0,
            responseTime: Math.round(endTime - startTime),
            timestamp: new Date(),
            error: error.message,
          });
          throw error;
        });
    };
  }

  hookUserInteractions() {
    const captureInteraction = (type, event) => {
      const target = event.target?.tagName || 'unknown';
      const targetId = event.target?.id || '';
      const targetClass = event.target?.className || '';

      this.logs.userInteractions.push({
        type,
        target: `${target}${targetId ? `#${targetId}` : ''}${targetClass ? `.${targetClass}` : ''}`,
        timestamp: new Date(),
        details: {
          x: event.clientX,
          y: event.clientY,
          text: event.target?.textContent?.substring(0, 50),
        },
      });

      if (this.logs.userInteractions.length > this.config.maxLogs) {
        this.logs.userInteractions.shift();
      }
    };

    document.addEventListener('click', (e) => captureInteraction('click', e), true);
    document.addEventListener('input', (e) => captureInteraction('input', e), true);
    document.addEventListener('scroll', (e) => captureInteraction('scroll', e), true);
    document.addEventListener('focus', (e) => captureInteraction('focus', e), true);
  }

  collectPerformance() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.logs.performanceMetrics = {
            memoryUsage: performance.memory?.usedJSHeapSize,
            loadTime: entry.loadEventEnd - entry.loadEventStart,
            timestamp: new Date(),
          };
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      console.warn('Performance observer not fully supported');
    }
  }

  collectDeviceInfo() {
    this.logs.browserVersion = navigator.userAgent;
    this.logs.osInfo = navigator.platform;
  }

  extractHeaders(headers) {
    const result = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  async submitLogs(bugId) {
    try {
      this.logs.sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000);

      const response = await fetch(`${this.config.apiUrl}/api/logs/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          bugId,
          consolidateLogs: this.logs,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit logs');
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error submitting logs:', error);
      return { success: false, error: error.message };
    }
  }

  getAuthToken() {
    return localStorage.getItem('authToken') || '';
  }

  getLogs() {
    return {
      ...this.logs,
      sessionDuration: Math.round((Date.now() - this.sessionStartTime) / 1000),
    };
  }

  clearLogs() {
    this.logs = {
      consoleLogs: [],
      networkRequests: [],
      userInteractions: [],
      performanceMetrics: {},
      sessionDuration: 0,
      browserVersion: this.logs.browserVersion,
      osInfo: this.logs.osInfo,
    };
    this.sessionStartTime = Date.now();
  }
}

export default LogCollector;
