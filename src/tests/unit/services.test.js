/**
 * Comprehensive Unit Tests for Core Services
 * Tests all major service classes with mocking and edge cases
 */

import { jest } from '@jest/globals';
import FaultCodeService from '../../services/FaultCodeService.js';
import ConversationStateManager from '../../services/ConversationStateManager.js';
import ResponseManager from '../../services/ResponseManager.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

describe('FaultCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Manufacturer Normalization', () => {
    test('should normalize manufacturer names correctly', () => {
      const service = new FaultCodeService();
      
      expect(service.normalizeManufacturer('IDEAL')).toBe('ideal');
      expect(service.normalizeManufacturer('Worcester Bosch')).toBe('worcester');
      expect(service.normalizeManufacturer('Vaillant UK')).toBe('vaillant');
      expect(service.normalizeManufacturer('  BAXI  ')).toBe('baxi');
    });

    test('should handle invalid manufacturer inputs', () => {
      const service = new FaultCodeService();
      
      expect(service.normalizeManufacturer(null)).toBeNull();
      expect(service.normalizeManufacturer(undefined)).toBeNull();
      expect(service.normalizeManufacturer('')).toBeNull();
      expect(service.normalizeManufacturer(123)).toBeNull();
    });
  });

  describe('Fault Code Extraction', () => {
    test('should extract fault codes correctly', () => {
      const service = new FaultCodeService();
      
      expect(service.extractFaultCode('L2')).toBe('L2');
      expect(service.extractFaultCode('Error L2')).toBe('L2');
      expect(service.extractFaultCode('F28 fault')).toBe('F28');
      expect(service.extractFaultCode('EA-123')).toBe('EA-123');
    });

    test('should handle invalid fault code inputs', () => {
      const service = new FaultCodeService();
      
      expect(service.extractFaultCode(null)).toBeNull();
      expect(service.extractFaultCode('')).toBeNull();
      expect(service.extractFaultCode('   ')).toBeNull();
      expect(service.extractFaultCode(123)).toBeNull();
    });
  });

  describe('Fault Code Search', () => {
    test('should search fault codes with valid inputs', async () => {
      const service = new FaultCodeService();
      
      const result = await service.searchFaultCode('ideal', 'L2');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
    });

    test('should handle search with invalid inputs', async () => {
      const service = new FaultCodeService();
      
      const result = await service.searchFaultCode(null, 'L2');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });
  });

  describe('Performance and Caching', () => {
    test('should implement lazy loading', () => {
      const service = new FaultCodeService();
      
      // Database should not be loaded initially
      expect(service.database).toBeNull();
      
      // Should load on first access
      service.ensureDatabaseLoaded();
      expect(service.database).not.toBeNull();
    });

    test('should cache search results', async () => {
      const service = new FaultCodeService();
      
      // First search
      const result1 = await service.searchFaultCode('ideal', 'L2');
      
      // Second search should use cache
      const result2 = await service.searchFaultCode('ideal', 'L2');
      
      expect(result1).toEqual(result2);
    });
  });
});

describe('ConversationStateManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.getItem.mockReturnValue(null);
    manager = new ConversationStateManager();
  });

  describe('Session Management', () => {
    test('should create new session with valid data', async () => {
      const sessionData = {
        userId: 'test-user',
        metadata: { source: 'test' }
      };

      const result = await manager.createSession(sessionData);
      
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    test('should reject invalid session data', async () => {
      const result = await manager.createSession(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid session data');
    });

    test('should update existing session', async () => {
      // Create session first
      const createResult = await manager.createSession({ userId: 'test' });
      const sessionId = createResult.sessionId;

      // Update session
      const updateResult = await manager.updateSession(sessionId, {
        lastActivity: new Date().toISOString()
      });

      expect(updateResult.success).toBe(true);
    });
  });

  describe('Context Management', () => {
    test('should save and retrieve context', () => {
      const testContext = {
        currentQuery: 'test query',
        manufacturer: 'ideal',
        faultCode: 'L2'
      };

      manager.saveContext('test-session', testContext);
      const retrieved = manager.getContext('test-session');

      expect(retrieved).toEqual(testContext);
    });

    test('should handle invalid context data', () => {
      const result = manager.saveContext('test-session', null);
      expect(result).toBe(false);
    });
  });

  describe('Session Validation', () => {
    test('should validate session structure', () => {
      const validSession = {
        sessionId: 'test-id',
        timestamp: new Date().toISOString(),
        context: {},
        history: []
      };

      expect(manager.validateSessionStructure(validSession)).toBe(true);
    });

    test('should reject invalid session structure', () => {
      const invalidSession = {
        sessionId: 'test-id'
        // Missing required fields
      };

      expect(manager.validateSessionStructure(invalidSession)).toBe(false);
    });
  });

  describe('Cleanup Operations', () => {
    test('should clean up expired sessions', () => {
      // Mock expired session data
      const expiredData = JSON.stringify({
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      });
      
      sessionStorageMock.getItem.mockReturnValue(expiredData);
      
      const result = manager.cleanupExpiredSessions();
      expect(result.cleaned).toBeGreaterThan(0);
    });
  });
});

describe('ResponseManager', () => {
  describe('Response Formatting', () => {
    test('should format diagnostic response correctly', () => {
      const diagnosticData = {
        faultCode: 'L2',
        manufacturer: 'Ideal',
        description: 'Ignition lockout',
        solutions: ['Check gas supply', 'Inspect ignition system']
      };

      const formatted = ResponseManager.formatDiagnosticResponse(diagnosticData);
      
      expect(formatted).toContain('L2');
      expect(formatted).toContain('Ideal');
      expect(formatted).toContain('Ignition lockout');
    });

    test('should handle missing diagnostic data', () => {
      const formatted = ResponseManager.formatDiagnosticResponse(null);
      
      expect(formatted).toContain('No diagnostic information');
    });
  });

  describe('Error Handling', () => {
    test('should format error responses appropriately', () => {
      const error = new Error('Test error');
      const formatted = ResponseManager.formatErrorResponse(error);
      
      expect(formatted).toContain('error');
      expect(formatted).toContain('Test error');
    });

    test('should sanitize error messages', () => {
      const error = new Error('Database connection failed: password123');
      const formatted = ResponseManager.formatErrorResponse(error);
      
      // Should not contain sensitive information
      expect(formatted).not.toContain('password123');
    });
  });

  describe('Response Validation', () => {
    test('should validate response structure', () => {
      const validResponse = {
        success: true,
        data: { result: 'test' },
        message: 'Success'
      };

      expect(ResponseManager.validateResponse(validResponse)).toBe(true);
    });

    test('should reject invalid response structure', () => {
      const invalidResponse = {
        data: 'test'
        // Missing required fields
      };

      expect(ResponseManager.validateResponse(invalidResponse)).toBe(false);
    });
  });
});

describe('Service Integration Tests', () => {
  test('should integrate FaultCodeService with ConversationStateManager', async () => {
    const faultService = new FaultCodeService();
    const stateManager = new ConversationStateManager();
    
    // Create session
    const session = await stateManager.createSession({ userId: 'test' });
    
    // Save diagnostic context
    const context = {
      manufacturer: 'ideal',
      faultCode: 'L2',
      query: 'Ideal Logic 24 combi showing L2 error'
    };
    
    stateManager.saveContext(session.sessionId, context);
    
    // Retrieve and use context for fault code search
    const savedContext = stateManager.getContext(session.sessionId);
    const searchResult = await faultService.searchFaultCode(
      savedContext.manufacturer,
      savedContext.faultCode
    );
    
    expect(searchResult.success).toBe(true);
    expect(savedContext.manufacturer).toBe('ideal');
    expect(savedContext.faultCode).toBe('L2');
  });

  test('should handle service integration errors gracefully', async () => {
    const faultService = new FaultCodeService();
    const stateManager = new ConversationStateManager();
    
    // Test with invalid data
    const context = {
      manufacturer: null,
      faultCode: null
    };
    
    const searchResult = await faultService.searchFaultCode(
      context.manufacturer,
      context.faultCode
    );
    
    expect(searchResult.success).toBe(false);
    expect(searchResult.message).toContain('Invalid');
  });
});

describe('Performance Tests', () => {
  test('should handle concurrent operations', async () => {
    const faultService = new FaultCodeService();
    const promises = [];
    
    // Create multiple concurrent searches
    for (let i = 0; i < 10; i++) {
      promises.push(faultService.searchFaultCode('ideal', 'L2'));
    }
    
    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });

  test('should maintain performance under load', async () => {
    const stateManager = new ConversationStateManager();
    const startTime = Date.now();
    
    // Create multiple sessions
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(stateManager.createSession({ userId: `user-${i}` }));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    // Should complete within reasonable time (5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

describe('Edge Cases and Error Conditions', () => {
  test('should handle storage quota exceeded', () => {
    const stateManager = new ConversationStateManager();
    
    // Mock storage quota exceeded
    sessionStorageMock.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    
    const result = stateManager.saveContext('test', { data: 'test' });
    expect(result).toBe(false);
  });

  test('should handle corrupted session data', () => {
    const stateManager = new ConversationStateManager();
    
    // Mock corrupted JSON data
    sessionStorageMock.getItem.mockReturnValue('invalid json{');
    
    const result = stateManager.getContext('test-session');
    expect(result).toBeNull();
  });

  test('should handle network timeouts gracefully', async () => {
    const faultService = new FaultCodeService();
    
    // Mock network timeout
    jest.spyOn(global, 'fetch').mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 100)
      )
    );
    
    const result = await faultService.searchFaultCode('ideal', 'L2');
    
    // Should handle timeout gracefully
    expect(result).toHaveProperty('success');
    
    global.fetch.mockRestore();
  });
});
