# API Endpoints Documentation

## Overview

The BoilerBrain API provides endpoints for boiler diagnostic assistance, fault code lookup, and manual retrieval. All endpoints use JSON for request/response bodies and include CSRF protection for write operations.

## Base URL
- **Development**: `http://localhost:3204/api`
- **Production**: `https://your-domain.com/api`

## Authentication

The API uses CSRF tokens for security. For write operations, include the CSRF token in the `X-CSRF-Token` header.

### Get CSRF Token
```http
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "abc123def456..."
}
```

## Chat Endpoints

### Send Chat Message
Send a message to the AI diagnostic assistant.

```http
POST /api/chat
Content-Type: application/json
X-CSRF-Token: {csrf_token}
```

**Request Body:**
```json
{
  "message": "My boiler is showing F22 error code",
  "sessionId": "uuid-session-id",
  "context": {
    "manufacturer": "ideal",
    "model": "logic-30",
    "systemType": "combi"
  }
}
```

**Response:**
```json
{
  "response": "F22 typically indicates low water pressure...",
  "sessionId": "uuid-session-id",
  "context": {
    "manufacturer": "ideal",
    "faultCodes": ["F22"],
    "conversationStage": "diagnosing"
  },
  "suggestions": [
    "Check water pressure gauge",
    "Look for leaks in the system"
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request body
- `403` - Missing or invalid CSRF token
- `500` - Internal server error

### Session Management
Manage chat sessions for context persistence.

```http
POST /api/chat/session
Content-Type: application/json
X-CSRF-Token: {csrf_token}
```

**Request Body:**
```json
{
  "action": "create|update|get|delete",
  "sessionId": "uuid-session-id",
  "history": [...],
  "userName": "optional-user-name"
}
```

**Response:**
```json
{
  "sessionId": "uuid-session-id",
  "serverHistory": [...],
  "status": "active|expired|new",
  "lastActivity": "2024-01-01T12:00:00Z"
}
```

## Fault Code Endpoints

### Search Fault Codes
Search for fault codes across all manufacturers or specific manufacturer.

```http
GET /api/fault-codes/search?code=F22&manufacturer=ideal
```

**Query Parameters:**
- `code` (required) - Fault code to search for
- `manufacturer` (optional) - Limit search to specific manufacturer
- `limit` (optional) - Maximum results to return (default: 20)

**Response:**
```json
{
  "found": true,
  "matches": [
    {
      "manufacturer": "ideal",
      "fault_code": "F22",
      "description": "Low water pressure",
      "solution": "Check system pressure and top up if needed",
      "severity": "medium",
      "category": "pressure"
    }
  ],
  "total": 1
}
```

### Get Manufacturer Fault Codes
Get all fault codes for a specific manufacturer.

```http
GET /api/fault-codes/manufacturer/{manufacturer}
```

**Path Parameters:**
- `manufacturer` - Manufacturer name (e.g., 'ideal', 'worcester')

**Query Parameters:**
- `page` (optional) - Page number for pagination (default: 1)
- `limit` (optional) - Results per page (default: 50)

**Response:**
```json
{
  "manufacturer": "ideal",
  "faultCodes": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "pages": 3
  }
}
```

### Get Supported Manufacturers
Get list of all supported boiler manufacturers.

```http
GET /api/fault-codes/manufacturers
```

**Response:**
```json
{
  "manufacturers": [
    "ideal",
    "worcester",
    "vaillant",
    "baxi"
  ],
  "total": 4
}
```

## Manual Endpoints

### Search Manuals
Search for boiler manuals by manufacturer and model.

```http
GET /api/manuals/search?manufacturer=ideal&model=logic
```

**Query Parameters:**
- `manufacturer` (optional) - Manufacturer name
- `model` (optional) - Model name or partial name
- `type` (optional) - Manual type (installation, service, user)

**Response:**
```json
{
  "manuals": [
    {
      "id": "123",
      "manufacturer": "ideal",
      "model": "Logic 30",
      "type": "service",
      "url": "https://example.com/manual.pdf",
      "fileSize": "2.5MB",
      "lastUpdated": "2024-01-01"
    }
  ],
  "total": 1
}
```

### Download Manual
Get direct download link for a manual.

```http
GET /api/manuals/{id}/download
```

**Response:**
```json
{
  "downloadUrl": "https://secure-url.com/manual.pdf",
  "expiresAt": "2024-01-01T13:00:00Z",
  "filename": "ideal-logic-30-service-manual.pdf"
}
```

## Knowledge Base Endpoints

### Vector Search
Perform semantic search across the knowledge base.

```http
POST /api/knowledge/search
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "boiler not heating water",
  "limit": 10,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "content": "When a boiler fails to heat water...",
      "similarity": 0.85,
      "source": "troubleshooting-guide",
      "category": "heating-issues"
    }
  ],
  "total": 5
}
```

## Health Check Endpoints

### API Health
Check API server health and status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "ai": "operational",
    "cache": "active"
  },
  "uptime": "2d 5h 30m"
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "manufacturer",
    "issue": "required field missing"
  }
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Missing or invalid CSRF token"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests, please try again later",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "req-123-456"
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Chat endpoints**: 60 requests per minute per IP
- **Search endpoints**: 100 requests per minute per IP
- **Download endpoints**: 10 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## SDK Examples

### JavaScript/Node.js
```javascript
import BoilerBrainAPI from '@boilerbrain/api-client';

const client = new BoilerBrainAPI({
  baseURL: 'http://localhost:3204/api',
  apiKey: 'your-api-key'
});

// Search fault codes
const faultCodes = await client.faultCodes.search('F22', 'ideal');

// Send chat message
const response = await client.chat.send({
  message: 'Boiler not heating',
  sessionId: 'session-123'
});
```

### Python
```python
import boilerbrain

client = boilerbrain.Client(
    base_url='http://localhost:3204/api',
    api_key='your-api-key'
)

# Search fault codes
fault_codes = client.fault_codes.search(code='F22', manufacturer='ideal')

# Send chat message
response = client.chat.send(
    message='Boiler not heating',
    session_id='session-123'
)
```

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Chat, fault code, and manual endpoints
- CSRF protection implementation
- Rate limiting

### v1.1.0 (2024-02-01)
- Added vector search endpoints
- Enhanced error handling
- Performance improvements
- Session management enhancements
