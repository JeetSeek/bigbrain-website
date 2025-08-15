# Service Architecture Documentation

## Overview

BoilerBrain follows a layered architecture pattern with clear separation of concerns. The application is structured into presentation, service, repository, and data layers.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  (React Components, UI, User Interface) │
├─────────────────────────────────────────┤
│            Service Layer                │
│   (Business Logic, Orchestration)      │
├─────────────────────────────────────────┤
│           Repository Layer              │
│     (Data Access, Caching)             │
├─────────────────────────────────────────┤
│             Data Layer                  │
│    (Supabase, External APIs)           │
└─────────────────────────────────────────┘
```

## Service Layer Components

### 1. FaultCodeService
**Purpose**: Manages boiler fault code operations with performance optimization.

**Key Features**:
- Lazy loading of fault code databases
- In-memory caching with TTL
- Input validation and normalization
- Manufacturer alias mapping
- Concurrent request handling

**Dependencies**:
- `FaultCodeRepository` for database operations
- `faultCodeUtils` for parsing and searching
- JSON fault code databases

**Example Usage**:
```javascript
const faultCodeService = new FaultCodeService();
await faultCodeService.ensureInitialized();

const result = await faultCodeService.findFaultCode('F22', 'ideal');
```

### 2. ConversationStateManager
**Purpose**: Manages chat session state with validation and cleanup.

**Key Features**:
- Session state validation and repair
- Automatic cleanup of expired sessions
- SessionStorage persistence
- State schema enforcement
- Performance monitoring

**State Schema**:
```javascript
{
  manufacturer: string?,
  model: string?,
  systemType: string?,
  faultCodes: array,
  symptoms: array,
  attemptedFixes: array,
  conversationStage: string,
  messageCount: number,
  topicsCovered: object,
  lastDiagnosis: object?,
  completeHistory: array
}
```

### 3. CSRFService
**Purpose**: Provides secure CSRF token management with database persistence.

**Key Features**:
- Database-backed token storage
- Automatic token expiration
- Periodic cleanup of expired tokens
- Error handling and fallback

**Security Model**:
- Tokens expire after 1 hour
- Stored in `csrf_tokens` table
- Automatic cleanup every hour
- Cryptographically secure token generation

## Repository Layer

### BaseRepository
**Purpose**: Provides common database operations and caching.

**Features**:
- CRUD operations with error handling
- Built-in caching mechanism
- Query optimization
- Pagination support
- Connection management

**Methods**:
- `findBy(criteria, options)` - Find records by criteria
- `findOneBy(criteria, options)` - Find single record
- `findById(id, options)` - Find by primary key
- `create(data)` - Create new record
- `update(id, data)` - Update existing record
- `delete(id)` - Delete record
- `count(criteria)` - Count matching records

### FaultCodeRepository
**Purpose**: Specialized repository for fault code operations.

**Additional Features**:
- Manufacturer-specific queries
- Full-text search capabilities
- Bulk import operations
- Statistics generation
- Performance optimizations

## Data Flow

### 1. User Request Flow
```
User Input → React Component → Service Layer → Repository Layer → Database
                    ↓
User Interface ← Service Layer ← Repository Layer ← Database Response
```

### 2. Chat Message Flow
```
User Message → ChatDock Component → ConversationStateManager → Chat API
                    ↓
AI Response ← MessageBubble ← Enhanced System Prompt ← LLM Service
```

### 3. Fault Code Lookup Flow
```
Fault Code Query → FaultCodeService → Cache Check → FaultCodeRepository
                        ↓                    ↓
Formatted Response ← Business Logic ← Database Query ← Supabase
```

## Caching Strategy

### Multi-Level Caching
1. **Service Level**: In-memory caching with TTL
2. **Repository Level**: Query result caching
3. **Database Level**: Supabase connection pooling
4. **Browser Level**: SessionStorage for user state

### Cache Configuration
```javascript
{
  maxSize: 1000,        // Maximum cache entries
  ttl: 300000,          // 5 minutes TTL
  cleanupInterval: 3600000  // 1 hour cleanup
}
```

## Error Handling Strategy

### Error Boundary Pattern
- Global error boundary catches React errors
- Component-level error boundaries for isolated failures
- Graceful degradation with fallback UI
- Error reporting to logging service

### Service Layer Errors
```javascript
try {
  const result = await service.operation();
  return result;
} catch (error) {
  console.error('Service operation failed:', error);
  // Return safe fallback or rethrow with context
  throw new ServiceError('Operation failed', error);
}
```

### Repository Layer Errors
```javascript
try {
  const { data, error } = await this.supabase.operation();
  if (error) throw new DatabaseError(error.message);
  return data;
} catch (error) {
  console.error('Database operation failed:', error);
  throw error;
}
```

## Performance Optimizations

### 1. Lazy Loading
- Services initialize only when first used
- Dynamic imports for large datasets
- Progressive data loading

### 2. Caching
- Multi-level caching strategy
- Cache invalidation on updates
- Memory-efficient cache management

### 3. Connection Pooling
- Supabase connection reuse
- Request batching where possible
- Timeout management

### 4. Code Splitting
- Dynamic imports for routes
- Component-level code splitting
- Vendor bundle optimization

## Security Considerations

### 1. CSRF Protection
- Database-backed CSRF tokens
- Token validation middleware
- Automatic token rotation

### 2. Input Validation
- Schema validation at service layer
- SQL injection prevention
- XSS protection

### 3. Authentication
- Supabase Auth integration
- Row Level Security (RLS)
- API key management

## Monitoring and Observability

### 1. Performance Metrics
- Cache hit rates
- Response times
- Error rates
- Database query performance

### 2. Business Metrics
- Chat session duration
- Fault code lookup success rate
- User engagement metrics

### 3. System Health
- Database connection status
- Service availability
- Memory usage
- Cache efficiency

## Scalability Considerations

### 1. Horizontal Scaling
- Stateless service design
- External session storage
- Load balancer compatibility

### 2. Database Scaling
- Read replicas for queries
- Connection pooling
- Query optimization

### 3. Caching Scaling
- Redis for distributed caching
- CDN for static assets
- Edge caching for API responses

## Development Guidelines

### 1. Service Development
- Single responsibility principle
- Dependency injection
- Comprehensive error handling
- Unit test coverage

### 2. Repository Development
- Extend BaseRepository
- Implement caching
- Add input validation
- Document query patterns

### 3. Testing Strategy
- Unit tests for services
- Integration tests for repositories
- End-to-end tests for user flows
- Performance tests for critical paths
