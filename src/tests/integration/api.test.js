/**
 * Integration Tests for API Endpoints
 * Tests the complete flow from frontend to backend
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import FaultCodeRepository from '../../repositories/FaultCodeRepository.js';
import faultCodeService from '../../services/FaultCodeService.js';

// Mock Supabase client for testing
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 1,
              manufacturer: 'ideal',
              fault_code: 'F1',
              description: 'Ignition failure',
              solution: 'Check gas supply and ignition components'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('API Integration Tests', () => {
  let faultCodeRepository;

  beforeAll(async () => {
    // Initialize services
    faultCodeRepository = new FaultCodeRepository();
    
    // Wait for service initialization
    await faultCodeService.ensureInitialized();
  });

  afterAll(() => {
    // Cleanup
    if (faultCodeService) {
      faultCodeService.clearCache();
    }
    if (faultCodeRepository) {
      faultCodeRepository.clearCache();
    }
  });

  describe('FaultCodeRepository Integration', () => {
    test('should find fault code by manufacturer and code', async () => {
      const result = await faultCodeRepository.findByManufacturerAndCode('ideal', 'F1');
      
      expect(result).toBeTruthy();
      expect(result.manufacturer).toBe('ideal');
      expect(result.fault_code).toBe('F1');
      expect(result.description).toContain('Ignition');
    });

    test('should handle invalid manufacturer gracefully', async () => {
      const result = await faultCodeRepository.findByManufacturerAndCode('invalid', 'F1');
      expect(result).toBeNull();
    });

    test('should cache results properly', async () => {
      // First call
      const start1 = Date.now();
      await faultCodeRepository.findByManufacturerAndCode('ideal', 'F1');
      const time1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      await faultCodeRepository.findByManufacturerAndCode('ideal', 'F1');
      const time2 = Date.now() - start2;

      // Cached call should be significantly faster
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('FaultCodeService Integration', () => {
    test('should find fault code with caching', async () => {
      const result = await faultCodeService.findFaultCode('F1', 'ideal');
      
      expect(result.found).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].manufacturer).toBe('ideal');
    });

    test('should normalize manufacturer names', async () => {
      const normalizedIdeal = faultCodeService.normalizeManufacturer('Ideal Boilers');
      const normalizedWorcester = faultCodeService.normalizeManufacturer('Worcester Bosch');
      
      expect(normalizedIdeal).toBe('ideal');
      expect(normalizedWorcester).toBe('worcester');
    });

    test('should extract fault codes from text', async () => {
      const text = 'My boiler is showing F22 and F28 error codes';
      const codes = faultCodeService.extractFaultCodesFromText(text);
      
      expect(codes).toContain('F22');
      expect(codes).toContain('F28');
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array(10).fill().map(() => 
        faultCodeService.findFaultCode('F1', 'ideal')
      );
      
      const results = await Promise.all(promises);
      
      // All results should be identical
      results.forEach(result => {
        expect(result.found).toBe(true);
        expect(result.matches).toHaveLength(1);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of requests within time limit', async () => {
      const start = Date.now();
      
      const promises = Array(100).fill().map((_, i) => 
        faultCodeService.findFaultCode(`F${i % 10}`, 'ideal')
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      // Should complete 100 requests in under 5 seconds
      expect(duration).toBeLessThan(5000);
    }, 10000);

    test('should maintain cache efficiency under load', async () => {
      // Fill cache
      await Promise.all([
        faultCodeService.findFaultCode('F1', 'ideal'),
        faultCodeService.findFaultCode('F2', 'ideal'),
        faultCodeService.findFaultCode('F3', 'ideal')
      ]);

      const stats = faultCodeService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      const originalFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      try {
        const result = await faultCodeService.findFaultCode('F1', 'ideal');
        // Should still return a valid response structure
        expect(result).toHaveProperty('found');
        expect(result).toHaveProperty('matches');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should validate input parameters', async () => {
      const invalidResults = await Promise.all([
        faultCodeService.findFaultCode(null, 'ideal'),
        faultCodeService.findFaultCode('', 'ideal'),
        faultCodeService.findFaultCode('F1', null),
        faultCodeService.getFaultCode(null, 'F1'),
        faultCodeService.getFaultCode('ideal', null)
      ]);

      invalidResults.forEach(result => {
        if (result === null) {
          expect(result).toBeNull();
        } else {
          expect(result.found).toBe(false);
        }
      });
    });
  });
});
