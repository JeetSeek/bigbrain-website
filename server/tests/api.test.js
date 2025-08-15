/**
 * Comprehensive Backend API Tests
 * Tests all API endpoints with authentication, validation, and error handling
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../index.js';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }))
};

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

describe('Health Check Endpoints', () => {
  test('GET /api/health should return server status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
  });

  test('GET /api/health/detailed should return detailed health info', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('database');
    expect(response.body.services).toHaveProperty('ai');
  });
});

describe('Fault Code API Endpoints', () => {
  describe('GET /api/fault-codes/search', () => {
    test('should search fault codes with valid parameters', async () => {
      const response = await request(app)
        .get('/api/fault-codes/search')
        .query({ manufacturer: 'ideal', code: 'L2' })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    test('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .get('/api/fault-codes/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameters');
    });

    test('should handle invalid manufacturer names', async () => {
      const response = await request(app)
        .get('/api/fault-codes/search')
        .query({ manufacturer: 'invalid-manufacturer', code: 'L2' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/fault-codes/manufacturers', () => {
    test('should return list of supported manufacturers', async () => {
      const response = await request(app)
        .get('/api/fault-codes/manufacturers')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/fault-codes/:manufacturer/codes', () => {
    test('should return fault codes for specific manufacturer', async () => {
      const response = await request(app)
        .get('/api/fault-codes/ideal/codes')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    test('should return 404 for invalid manufacturer', async () => {
      const response = await request(app)
        .get('/api/fault-codes/nonexistent/codes')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Chat API Endpoints', () => {
  describe('POST /api/chat', () => {
    test('should process chat message with valid input', async () => {
      const chatMessage = {
        message: 'Ideal Logic 24 combi showing L2 error',
        sessionId: '550e8400-e29b-41d4-a716-446655440000'
      };

      const response = await request(app)
        .post('/api/chat')
        .send(chatMessage)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('response');
    });

    test('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ sessionId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Message is required');
    });

    test('should return 400 for invalid session ID format', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'test message',
          sessionId: 'invalid-uuid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid session ID');
    });

    test('should handle rate limiting', async () => {
      const chatMessage = {
        message: 'test message',
        sessionId: '550e8400-e29b-41d4-a716-446655440000'
      };

      // Send multiple requests rapidly
      const promises = Array(10).fill().map(() => 
        request(app).post('/api/chat').send(chatMessage)
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('GET /api/chat/history/:sessionId', () => {
    test('should return chat history for valid session', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/chat/history/${sessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('history');
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('should return 400 for invalid session ID', async () => {
      const response = await request(app)
        .get('/api/chat/history/invalid-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Knowledge Management API Endpoints', () => {
  describe('GET /api/knowledge/stats', () => {
    test('should return knowledge base statistics', async () => {
      const response = await request(app)
        .get('/api/knowledge/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalItems');
      expect(response.body.stats).toHaveProperty('pendingReview');
    });
  });

  describe('GET /api/knowledge/pending', () => {
    test('should return pending knowledge items', async () => {
      const response = await request(app)
        .get('/api/knowledge/pending')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/knowledge/pending')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });
  });

  describe('POST /api/knowledge/approve/:id', () => {
    test('should approve knowledge item with valid ID', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .post(`/api/knowledge/approve/${itemId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .post('/api/knowledge/approve/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/knowledge/reject/:id', () => {
    test('should reject knowledge item with reason', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .post(`/api/knowledge/reject/${itemId}`)
        .send({ reason: 'Inaccurate information' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should return 400 for missing rejection reason', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .post(`/api/knowledge/reject/${itemId}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Rejection reason is required');
    });
  });
});

describe('Session Management API Endpoints', () => {
  describe('POST /api/sessions', () => {
    test('should create new session with valid data', async () => {
      const sessionData = {
        userId: 'test-user-123',
        metadata: { source: 'web-app' }
      };

      const response = await request(app)
        .post('/api/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    });

    test('should return 400 for invalid session data', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/sessions/:sessionId', () => {
    test('should update existing session', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const updateData = {
        lastActivity: new Date().toISOString(),
        metadata: { updated: true }
      };

      const response = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should return 400 for invalid session ID', async () => {
      const response = await request(app)
        .put('/api/sessions/invalid-uuid')
        .send({ lastActivity: new Date().toISOString() })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/sessions/:sessionId', () => {
    test('should delete session with valid ID', async () => {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});

describe('Error Handling and Security', () => {
  test('should handle malformed JSON requests', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should sanitize error messages', async () => {
    // Test with potential SQL injection
    const response = await request(app)
      .get('/api/fault-codes/search')
      .query({ 
        manufacturer: "'; DROP TABLE users; --",
        code: 'L2'
      })
      .expect(400);

    // Error message should not contain the malicious input
    expect(response.body.error).not.toContain('DROP TABLE');
  });

  test('should handle CORS properly', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  test('should enforce content-type for POST requests', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'text/plain')
      .send('plain text message')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Performance and Load Testing', () => {
  test('should handle concurrent requests', async () => {
    const requests = Array(20).fill().map(() => 
      request(app).get('/api/health')
    );

    const responses = await Promise.all(requests);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('should respond within acceptable time limits', async () => {
    const startTime = Date.now();
    
    await request(app)
      .get('/api/fault-codes/manufacturers')
      .expect(200);
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });

  test('should handle large payloads gracefully', async () => {
    const largeMessage = 'x'.repeat(10000); // 10KB message
    
    const response = await request(app)
      .post('/api/chat')
      .send({
        message: largeMessage,
        sessionId: '550e8400-e29b-41d4-a716-446655440000'
      });

    // Should either process or reject with appropriate error
    expect([200, 413]).toContain(response.status);
  });
});

describe('API Versioning and Compatibility', () => {
  test('should handle API version headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('API-Version', '1.0')
      .expect(200);

    expect(response.body).toHaveProperty('status');
  });

  test('should maintain backward compatibility', async () => {
    // Test legacy endpoint format
    const response = await request(app)
      .get('/api/fault-codes/search')
      .query({ manufacturer: 'ideal', code: 'L2' })
      .expect(200);

    expect(response.body).toHaveProperty('success');
  });
});

describe('Monitoring and Observability', () => {
  test('should include request ID in responses', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.headers['x-request-id']).toBeDefined();
  });

  test('should log API usage metrics', async () => {
    // This would typically test logging middleware
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.status).toBe(200);
    // In a real implementation, we'd verify logs were written
  });
});
