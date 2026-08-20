# SPEC-014: Integration & API Management

**Feature Goal:** Implement centralized integration and API management infrastructure providing standardized external service integration, webhook handling, API security, and provider abstraction without duplicating business domain logic.

**Priority:** P1 (Core Infrastructure - Required for external service connectivity and API standardization)

**Dependencies:**
- SPEC-001 (Authentication & Roles)
- SPEC-008 (Invoices & Payments) - for payment provider integration
- SPEC-012 (Notifications & Communication) - for communication provider integration
- SPEC-013 (System Administration & Configuration) - for integration configuration

**Applications:**
- E-commerce Website: Public API consumption with security controls
- Admin Dashboard: Integration management and monitoring interface
- Desktop POS: Backend API connectivity with offline synchronization

## 1. Scope

This specification covers:
- Internal API standards and versioning strategy
- External service provider abstraction and integration
- Webhook infrastructure for inbound provider notifications
- API key management and secure authentication
- Integration health monitoring and logging
- Retry mechanisms and idempotency controls
- Rate limiting and security protections
- Provider configuration and secret management
- Integration audit trail and compliance
- API documentation and developer experience
- Cross-application API consistency
- Third-party integration testing frameworks

This specification **does NOT** cover:
- Business domain logic implementation (owned by respective specifications)
- User authentication and RBAC (handled by SPEC-001)
- Payment processing logic (owned by SPEC-008)
- Notification templates and delivery logic (owned by SPEC-012)
- System configuration management (owned by SPEC-013)
- Reporting and analytics (owned by SPEC-011)
- Alternative backend implementations or separate API services

## 2. Architecture Principles

### 2.1 Single Backend Authority
All applications communicate with one authoritative backend:
```
E-commerce Website ─┐
Admin Dashboard ────┼─► Backend API ─► PostgreSQL Database
Desktop POS ────────┘
```

### 2.2 Provider Abstraction
External integrations use provider-agnostic interfaces:
```
Business Domain ─► Integration Interface ─► Provider Adapter ─► External API
```

### 2.3 Configuration Separation
- Business configuration: SPEC-013 (System Administration)
- Integration secrets: Secure environment/secret management
- Provider settings: Non-sensitive operational configuration
## 3. User Roles

**Branch Staff (cashier, sales_staff):**
- Access to public and authenticated API endpoints (branch-scoped)
- View integration status for operational awareness
- No integration configuration or management access

**Branch Admin (branch_admin):**
- Integration status monitoring for branch operations
- Integration configuration viewing (branch-scoped)
- Basic integration health and connectivity information
- No provider secret or system-wide integration management

**Inventory Clerk (inventory_clerk):**
- Supplier integration status and connectivity
- Purchase-related external service monitoring
- No integration configuration or secret management

**Accountant (accountant):**
- Financial integration monitoring and status
- Payment provider connectivity information
- Integration audit trail access (financial operations)
- No integration configuration or secret management

**Super Admin (super_admin):**
- Full integration management and configuration
- Provider secret and credential management
- System-wide integration monitoring and control
- Integration testing and troubleshooting capabilities
- API key management and webhook configuration

## 4. Internal API Standards

### 4.1 API Versioning Strategy
**Version Format:**
- URL-based versioning: `/api/v1/`, `/api/v2/`
- Major version for breaking changes
- Minor updates within same major version maintain backward compatibility

**Version Management:**
- Default version (latest) accessible via `/api/` without version prefix
- Explicit version specification recommended for production integrations
- Deprecation notices provided 6 months before version sunset
- Migration guides provided for breaking changes

### 4.2 HTTP Method Standards
**Standardized Usage:**
- `GET`: Retrieve resources (idempotent, cacheable)
- `POST`: Create resources or non-idempotent operations
- `PUT`: Full resource replacement (idempotent)
- `PATCH`: Partial resource updates (idempotent)
- `DELETE`: Resource deletion (idempotent)

### 4.3 Request/Response Format
**Request Standards:**
```typescript
interface APIRequest {
  // Headers
  'Content-Type': 'application/json';
  'Authorization': 'Bearer <token>';
  'X-Correlation-ID'?: string;
  'X-Idempotency-Key'?: string;
  'X-Branch-Context'?: string;
  
  // Body (for POST/PUT/PATCH)
  body?: Record<string, any>;
}
```

**Response Standards:**
```typescript
interface APIResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    correlationId: string;
    timestamp: string;
    version: string;
  };
}

interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    correlationId: string;
    timestamp: string;
  };
}
```

### 4.4 Pagination Standards
**Query Parameters:**
- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field and direction (`field:asc` or `field:desc`)
- `filter`: JSON-encoded filter criteria

**Response Format:**
```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    sort?: string;
    filters?: Record<string, any>;
  };
}
```

### 4.5 Error Handling Standards
**HTTP Status Codes:**
- `200`: Successful GET, PUT, PATCH
- `201`: Successful POST (resource created)
- `204`: Successful DELETE or operation with no content
- `400`: Bad request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `409`: Conflict (duplicate resource, business rule violation)
- `422`: Unprocessable entity (semantic validation errors)
- `429`: Too many requests (rate limiting)
- `500`: Internal server error
- `502`: Bad gateway (external service error)
- `503`: Service unavailable (maintenance, overload)

## 5. Data Model

### 5.1 Integration Management Entities

#### ExternalProvider Entity
- id (UUID, primary key)
- providerKey (VARCHAR(50), unique) // 'stripe', 'sendgrid', 'twilio'
- providerName (VARCHAR(100)) // Human-readable name
- category (enum: 'payment', 'email', 'sms', 'whatsapp', 'push', 'storage')
- isEnabled (BOOLEAN, default false)
- configuration (JSON) // Non-sensitive provider settings
- healthStatus (enum: 'healthy', 'degraded', 'unhealthy', 'unknown')
- lastHealthCheck (TIMESTAMP, nullable)
- createdAt/updatedAt timestamps

#### Integration Entity
- id (UUID, primary key)
- providerId (UUID, foreign key to ExternalProvider)
- integrationName (VARCHAR(100))
- isActive (BOOLEAN, default true)
- configuration (JSON) // Integration-specific non-sensitive settings
- rateLimitConfig (JSON) // Rate limiting configuration
- retryConfig (JSON) // Retry and timeout configuration
- healthMetrics (JSON) // Performance and reliability metrics
- lastSuccessfulRequest (TIMESTAMP, nullable)
- lastFailedRequest (TIMESTAMP, nullable)
- consecutiveFailures (INTEGER, default 0)
- createdBy (UUID, foreign key to User)
- createdAt/updatedAt timestamps
#### APIKey Entity
- id (UUID, primary key)
- keyName (VARCHAR(100))
- keyHash (VARCHAR(256)) // Hashed API key for secure storage
- keyPrefix (VARCHAR(10)) // First few characters for identification
- scope (JSON) // Permitted operations and resources
- isActive (BOOLEAN, default true)
- expiresAt (TIMESTAMP, nullable)
- lastUsedAt (TIMESTAMP, nullable)
- usageCount (INTEGER, default 0)
- createdBy (UUID, foreign key to User)
- createdAt/updatedAt timestamps

#### WebhookEndpoint Entity
- id (UUID, primary key)
- providerId (UUID, foreign key to ExternalProvider)
- endpointUrl (VARCHAR(500)) // Generated webhook URL
- webhookSecret (VARCHAR(100)) // For signature verification
- eventTypes (JSON) // Array of subscribed event types
- isActive (BOOLEAN, default true)
- signatureAlgorithm (VARCHAR(20)) // 'hmac-sha256', etc.
- maxRetries (INTEGER, default 3)
- retryIntervalSeconds (INTEGER, default 300)
- createdAt/updatedAt timestamps

#### IntegrationLog Entity
- id (UUID, primary key)
- integrationId (UUID, foreign key to Integration)
- operationType (VARCHAR(50)) // 'request', 'webhook', 'retry'
- direction (enum: 'outbound', 'inbound')
- correlationId (VARCHAR(100))
- externalRequestId (VARCHAR(100), nullable)
- httpMethod (VARCHAR(10), nullable)
- requestUrl (TEXT, nullable)
- requestHeaders (JSON, nullable) // Redacted sensitive headers
- requestBody (TEXT, nullable) // Redacted sensitive data
- responseStatus (INTEGER, nullable)
- responseHeaders (JSON, nullable)
- responseBody (TEXT, nullable) // Redacted sensitive data
- duration (INTEGER) // Milliseconds
- retryAttempt (INTEGER, default 0)
- errorCode (VARCHAR(50), nullable)
- errorMessage (TEXT, nullable)
- createdAt (TIMESTAMP)

#### IntegrationAudit Entity
- id (UUID, primary key)
- action (VARCHAR(50)) // 'provider_enabled', 'key_created', 'webhook_updated'
- entityType (VARCHAR(50)) // 'provider', 'integration', 'api_key', 'webhook'
- entityId (UUID)
- previousValue (JSON, nullable) // Redacted sensitive data
- newValue (JSON, nullable) // Redacted sensitive data
- reason (TEXT, nullable)
- performedBy (UUID, foreign key to User)
- performedAt (TIMESTAMP)
- ipAddress (VARCHAR(45), nullable)
- userAgent (TEXT, nullable)

## 6. Integration Categories & Provider Abstractions

### 6.1 Payment Provider Integration
**Interface Definition:**
```typescript
interface PaymentProvider {
  // Payment operations
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
  confirmPayment(paymentId: string): Promise<PaymentStatus>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  
  // Webhook support
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): WebhookEvent;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  customerId: string;
  orderId?: string;
  paymentMethod: PaymentMethodType;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}
```

**Provider Implementations:**
- Stripe adapter
- PayPal adapter
- Square adapter
- Local/regional payment gateway adapters
- Test/mock provider for development

### 6.2 Communication Provider Integration
**Email Provider Interface:**
```typescript
interface EmailProvider {
  sendEmail(request: EmailRequest): Promise<EmailResponse>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseDeliveryEvent(payload: string): DeliveryEvent;
}

interface EmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateVariables?: Record<string, any>;
}
```

**SMS Provider Interface:**
```typescript
interface SMSProvider {
  sendSMS(request: SMSRequest): Promise<SMSResponse>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseDeliveryEvent(payload: string): DeliveryEvent;
}

interface SMSRequest {
  to: string;
  message: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
}
```

### 6.3 File Storage Provider Integration
**Storage Provider Interface:**
```typescript
interface StorageProvider {
  uploadFile(request: UploadRequest): Promise<UploadResponse>;
  downloadFile(key: string): Promise<DownloadResponse>;
  generatePresignedUrl(key: string, operation: 'get' | 'put', expiresIn?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileMetadata(key: string): Promise<FileMetadata>;
  listFiles(prefix?: string, maxKeys?: number): Promise<FileList>;
}

interface UploadRequest {
  key: string;
  content: Buffer | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}
```

### 6.4 WhatsApp Business Provider Integration
**WhatsApp Provider Interface:**
```typescript
interface WhatsAppProvider {
  sendTemplateMessage(request: WhatsAppTemplateRequest): Promise<WhatsAppResponse>;
  getMessageStatus(messageId: string): Promise<MessageStatus>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): WhatsAppEvent;
}

interface WhatsAppTemplateRequest {
  to: string;
  templateName: string;
  templateLanguage: string;
  templateVariables?: string[];
  templateComponents?: WhatsAppComponent[];
}
```
## 7. Webhook Infrastructure

### 7.1 Inbound Webhook Processing
**Webhook Endpoint Structure:**
- Base URL: `/webhooks/{providerKey}/{integrationId}`
- Authentication: Provider-specific signature verification
- Content-Type: `application/json` (configurable per provider)
- Maximum payload size: 10MB (configurable)

**Processing Pipeline:**
```
External Provider Request
           ↓
Rate Limiting & Basic Validation
           ↓
Signature Verification
           ↓
Idempotency Check
           ↓
Event Persistence
           ↓
Business Domain Processing
           ↓
Response (200 OK)
```

**Webhook Security:**
- HTTPS-only endpoints
- Provider signature verification (HMAC-SHA256, etc.)
- Timestamp validation (within 5-minute window)
- Replay protection via event ID tracking
- IP allowlist validation where provider supports it
- Rate limiting per provider and endpoint

### 7.2 Webhook Event Processing
**Event Storage:**
```typescript
interface WebhookEvent {
  id: string;
  providerId: string;
  eventType: string;
  eventId: string; // Provider's unique event ID
  payload: Record<string, any>;
  signature: string;
  timestamp: Date;
  processed: boolean;
  processingAttempts: number;
  lastProcessingError?: string;
  createdAt: Date;
}
```

**Processing Strategy:**
- Immediate response to webhook (within 5 seconds)
- Asynchronous event processing via background jobs
- Retry failed processing with exponential backoff
- Dead letter queue for permanently failed events
- Duplicate event detection and handling

### 7.3 Outbound Webhook System
**Event Subscription Management:**
```typescript
interface WebhookSubscription {
  id: string;
  targetUrl: string;
  eventTypes: string[];
  secretKey: string;
  isActive: boolean;
  deliveryAttempts: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: 'success' | 'failed';
  retryCount: number;
  maxRetries: number;
}
```

**Delivery Processing:**
- Reliable event delivery with retry mechanism
- Signature generation for webhook security
- Delivery status tracking and monitoring
- Configurable retry policies and backoff strategies
- Webhook endpoint health checking and circuit breaker

## 8. API Security & Authentication

### 8.1 API Key Management
**Key Generation:**
- Cryptographically secure random key generation
- Format: `api_live_` or `api_test_` prefix + base64 encoded random bytes
- Secure hashing (bcrypt) for database storage
- Display full key only once during creation

**Key Scoping:**
```typescript
interface APIKeyScope {
  resources: string[]; // ['orders', 'customers', 'payments']
  actions: string[];   // ['read', 'write', 'delete']
  branches?: string[]; // Branch-specific access
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
}
```

**Key Validation Process:**
- Extract key from Authorization header (`Bearer api_live_...`)
- Verify key format and extract hash portion
- Compare hash against stored key hashes
- Validate key expiration and active status
- Enforce scope restrictions and rate limits
- Update last used timestamp and usage metrics

### 8.2 OAuth 2.0 Integration (Future)
**Authorization Server Configuration:**
- Client credentials flow for server-to-server
- Authorization code flow for user-delegated access
- Token introspection and validation
- Scope-based permission management
- Refresh token rotation and security

### 8.3 Request Security
**Security Headers:**
- `X-Correlation-ID`: Request tracing and debugging
- `X-Idempotency-Key`: Duplicate request prevention
- `X-Request-ID`: Unique request identification
- `User-Agent`: Client identification and monitoring
- `X-Forwarded-For`: Client IP for rate limiting and audit

**Input Validation:**
- JSON schema validation for request bodies
- Query parameter type and format validation
- File upload validation (type, size, content scanning)
- SQL injection and XSS prevention
- Business rule validation integration

## 9. Integration Health & Monitoring

### 9.1 Health Check System
**Provider Health Metrics:**
```typescript
interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime: number; // milliseconds
  successRate: number; // percentage over last 24 hours
  errorRate: number;
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
  };
  uptime: {
    day: number;    // percentage
    week: number;
    month: number;
  };
}
```

**Health Check Implementation:**
- Lightweight health check endpoints for each provider
- Periodic health checks (every 5 minutes)
- Circuit breaker integration for failing providers
- Health status caching with TTL
- Alert generation for prolonged outages

### 9.2 Performance Monitoring
**Integration Metrics:**
- Request count (successful, failed, total)
- Response time percentiles (p50, p95, p99)
- Error rate and error type distribution
- Retry attempt frequency and success rates
- Webhook processing latency and failure rates
- Rate limiting hit frequency and throttling events

**Monitoring Dashboard:**
- Real-time integration status overview
- Provider performance comparison
- Historical trend analysis
- Alert configuration and management
- Integration usage analytics and reporting

### 9.3 Alerting & Notifications
**Alert Conditions:**
- Provider failure rate exceeding threshold (>5% over 15 minutes)
- Response time degradation (>2 seconds p95)
- Consecutive health check failures (>3 in 15 minutes)
- Webhook processing queue backup (>100 pending events)
- Rate limit threshold approaching (>80% of limit)
- Authentication failure spike (>10 failures per minute)

**Alert Delivery:**
- Integration with SPEC-012 notification system
- Email alerts for critical issues
- SMS alerts for urgent operational problems
- In-app dashboard notifications for status updates
- Webhook delivery for external monitoring systems
## 10. Retry, Idempotency & Error Handling

### 10.1 Retry Strategy
**Retry Configuration:**
```typescript
interface RetryConfig {
  maxAttempts: number;      // Maximum retry attempts (default: 3)
  baseDelay: number;        // Initial delay in milliseconds (default: 1000)
  maxDelay: number;         // Maximum delay cap (default: 30000)
  backoffMultiplier: number; // Exponential backoff factor (default: 2)
  jitterRange: number;      // Random jitter percentage (default: 0.1)
  retryableStatusCodes: number[]; // HTTP status codes to retry (default: [429, 502, 503, 504])
  retryableErrors: string[]; // Error types to retry
}
```

**Retry Logic Implementation:**
- Exponential backoff with jitter to prevent thundering herd
- Circuit breaker integration to prevent cascading failures
- Retry attempt tracking and limiting
- Permanent failure detection and dead letter handling
- Contextual retry decisions based on operation type

### 10.2 Idempotency Management
**Idempotency Key Generation:**
- Client-provided idempotency keys for critical operations
- Server-generated keys for internal operations
- Key format: UUID v4 or deterministic hash of operation parameters
- Key scope: Operation type + entity identifier + user context

**Idempotency Storage:**
```typescript
interface IdempotencyRecord {
  key: string;
  operationType: string;
  entityId?: string;
  userId?: string;
  requestHash: string;
  responseStatus: number;
  responseBody: string;
  expiresAt: Date;
  createdAt: Date;
}
```

**Duplicate Request Handling:**
- Exact match returns cached response (same status and body)
- Partial match (different parameters) returns 409 Conflict
- Expired idempotency records allow operation retry
- Automatic cleanup of expired idempotency records

### 10.3 Error Classification & Handling
**Error Categories:**
- **Transient Errors**: Network timeouts, rate limits, temporary service unavailability
- **Permanent Errors**: Authentication failures, invalid requests, resource not found
- **Business Errors**: Insufficient funds, duplicate records, validation failures
- **System Errors**: Internal server errors, database connectivity issues

**Error Response Standardization:**
```typescript
interface IntegrationError {
  code: string;           // Standardized error code
  category: 'transient' | 'permanent' | 'business' | 'system';
  message: string;        // Human-readable error description
  retryable: boolean;     // Whether operation should be retried
  retryAfter?: number;    // Suggested retry delay in seconds
  provider?: string;      // Source provider identifier
  externalCode?: string;  // Original provider error code
  correlationId: string;  // Request correlation identifier
  timestamp: Date;
}
```

## 11. API Endpoints

### 11.1 Integration Management API

#### List Integrations
- **Endpoint**: `GET /api/admin/integrations`
- **Permission**: `branch_admin`, `super_admin`
- **Query**: category, status, provider, health_status
- **Response**: Integration list with health metrics and status

#### Get Integration Details
- **Endpoint**: `GET /api/admin/integrations/:id`
- **Permission**: `branch_admin`, `super_admin`
- **Response**: Complete integration configuration and health information

#### Update Integration Configuration
- **Endpoint**: `PATCH /api/admin/integrations/:id`
- **Permission**: `super_admin`
- **Request**: Configuration updates and operational parameters
- **Response**: Updated integration configuration

#### Test Integration Connectivity
- **Endpoint**: `POST /api/admin/integrations/:id/test`
- **Permission**: `branch_admin`, `super_admin`
- **Request**: Test operation type and parameters
- **Response**: Test results and connectivity status

### 11.2 Provider Management API

#### List External Providers
- **Endpoint**: `GET /api/admin/providers`
- **Permission**: `branch_admin`, `super_admin`
- **Response**: Available providers with configuration status

#### Enable/Disable Provider
- **Endpoint**: `PATCH /api/admin/providers/:key/toggle`
- **Permission**: `super_admin`
- **Request**: Enable/disable flag with configuration
- **Response**: Updated provider status

#### Get Provider Health
- **Endpoint**: `GET /api/admin/providers/:key/health`
- **Permission**: `branch_admin`, `super_admin`
- **Response**: Current health status and performance metrics

### 11.3 API Key Management API

#### Create API Key
- **Endpoint**: `POST /api/admin/api-keys`
- **Permission**: `super_admin`
- **Request**:
```json
{
  "keyName": "Partner Integration Key",
  "scope": {
    "resources": ["orders", "customers"],
    "actions": ["read", "write"],
    "branches": ["branch-uuid-1"]
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```
- **Response**: Generated API key (shown only once) and metadata

#### List API Keys
- **Endpoint**: `GET /api/admin/api-keys`
- **Permission**: `super_admin`
- **Response**: API key list with usage metrics (keys redacted)

#### Revoke API Key
- **Endpoint**: `DELETE /api/admin/api-keys/:id`
- **Permission**: `super_admin`
- **Response**: Revocation confirmation

### 11.4 Webhook Management API

#### List Webhook Endpoints
- **Endpoint**: `GET /api/admin/webhooks`
- **Permission**: `super_admin`
- **Response**: Webhook endpoints with delivery statistics

#### Create Webhook Endpoint
- **Endpoint**: `POST /api/admin/webhooks`
- **Permission**: `super_admin`
- **Request**: Provider, event types, and configuration
- **Response**: Created webhook endpoint URL and secret

#### Test Webhook Delivery
- **Endpoint**: `POST /api/admin/webhooks/:id/test`
- **Permission**: `super_admin`
- **Request**: Test event payload
- **Response**: Delivery test results

### 11.5 Integration Logging API

#### Get Integration Logs
- **Endpoint**: `GET /api/admin/integrations/:id/logs`
- **Permission**: `branch_admin`, `super_admin`
- **Query**: date_range, operation_type, status, limit, offset
- **Response**: Paginated integration log entries with redacted sensitive data

#### Get Log Entry Details
- **Endpoint**: `GET /api/admin/integration-logs/:logId`
- **Permission**: `branch_admin`, `super_admin`
- **Response**: Complete log entry with request/response details (redacted)

### 11.6 Health & Monitoring API

#### Get Integration Health Dashboard
- **Endpoint**: `GET /api/admin/integrations/health`
- **Permission**: `branch_admin`, `super_admin`
- **Response**: System-wide integration health and performance metrics

#### Get Provider Performance Metrics
- **Endpoint**: `GET /api/admin/providers/:key/metrics`
- **Permission**: `branch_admin`, `super_admin`
- **Query**: time_range, granularity
- **Response**: Historical performance data and trends

## 12. Validation & Business Rules

### 12.1 Integration Configuration Validation
```typescript
const IntegrationConfigSchema = z.object({
  providerId: z.string().uuid(),
  integrationName: z.string().min(1).max(100),
  isActive: z.boolean(),
  configuration: z.record(z.any()),
  rateLimitConfig: z.object({
    requestsPerMinute: z.number().min(1).max(10000),
    burstLimit: z.number().min(1).max(1000)
  }).optional(),
  retryConfig: z.object({
    maxAttempts: z.number().min(0).max(10),
    baseDelay: z.number().min(100).max(60000),
    maxDelay: z.number().min(1000).max(300000)
  }).optional()
});

const APIKeyCreateSchema = z.object({
  keyName: z.string().min(1).max(100),
  scope: z.object({
    resources: z.array(z.string()),
    actions: z.array(z.enum(['read', 'write', 'delete'])),
    branches: z.array(z.string().uuid()).optional()
  }),
  expiresAt: z.date().optional()
});
```

### 12.2 Security Validation Rules
**API Key Validation:**
- Key format must match expected pattern
- Scope restrictions must align with user permissions
- Expiration date cannot exceed maximum allowed period (1 year)
- Branch scope must match user's accessible branches

**Webhook Configuration:**
- Webhook URLs must use HTTPS protocol
- Event type subscriptions must match provider capabilities
- Secret keys must meet minimum entropy requirements
- Endpoint URLs must be publicly accessible and valid

**Integration Security:**
- Provider credentials never stored in plain text
- Sensitive configuration values encrypted at rest
- Audit trail maintained for all security-related changes
- Failed authentication attempts logged and monitored
### 12.3 Rate Limiting & Throttling
**Rate Limit Configuration:**
- Per-API key rate limiting with configurable windows
- Per-IP rate limiting for public endpoints
- Per-provider rate limiting for external service calls
- Burst capacity allowing temporary limit exceeding
- Graceful degradation when limits are approached

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

## 13. Integration Testing Framework

### 13.1 Mock Provider System
**Mock Provider Implementation:**
- Configurable response scenarios (success, failure, timeout)
- Request validation and assertion capabilities
- Webhook event simulation and delivery
- Performance characteristic simulation (latency, failure rates)
- Integration test isolation and repeatability

**Mock Configuration:**
```typescript
interface MockProviderConfig {
  providerId: string;
  scenarios: {
    [operation: string]: {
      responseStatus: number;
      responseBody: any;
      delay?: number;
      failureRate?: number;
    };
  };
  webhookEvents: Array<{
    eventType: string;
    payload: any;
    delay?: number;
  }>;
}
```

### 13.2 Integration Test Suite
**Test Categories:**
- **Provider Adapter Tests**: Interface compliance and error handling
- **Webhook Processing Tests**: Signature verification, idempotency, event processing
- **Authentication Tests**: API key validation, scope enforcement, rate limiting
- **Retry Logic Tests**: Exponential backoff, circuit breaker, dead letter handling
- **Security Tests**: Input validation, access control, audit trail integrity

**Automated Test Pipeline:**
- Integration test execution in isolated environment
- Mock provider validation and response verification
- End-to-end workflow testing with all provider types
- Performance testing under load and failure conditions
- Security vulnerability scanning and validation

## 14. Performance & Scalability

### 14.1 Performance Optimization
**Caching Strategy:**
- Integration configuration caching (5-minute TTL)
- Provider health status caching (1-minute TTL)
- API key validation caching (30-second TTL)
- Rate limit counter caching with distributed consistency
- Idempotency record caching for recent operations

**Connection Management:**
- HTTP connection pooling for external providers
- Connection reuse and keep-alive optimization
- Timeout configuration per provider type
- Circuit breaker integration for failing services
- Load balancing across multiple provider endpoints

### 14.2 Scalability Considerations
**Horizontal Scaling:**
- Stateless integration processing architecture
- Distributed rate limiting with Redis-based counters
- Background job processing for webhook events
- Database read replicas for integration monitoring
- CDN integration for API documentation and assets

**Resource Management:**
- Memory optimization for large webhook payloads
- Disk space management for integration logs
- Database indexing for performance-critical queries
- Background cleanup jobs for expired records
- Monitoring and alerting for resource utilization

## 15. Security & Compliance

### 15.1 Data Security
**Sensitive Data Handling:**
- Encryption at rest for integration configuration
- Encryption in transit for all external communications
- Secure key derivation for API key hashing
- Redaction of sensitive data in logs and audit trails
- Secure deletion of expired credentials and keys

**Access Control:**
- Role-based access control for integration management
- Branch-scoped access restrictions where applicable
- API key scope enforcement and validation
- Webhook endpoint access control and validation
- Audit trail for all security-sensitive operations

### 15.2 Compliance Requirements
**Data Protection:**
- GDPR compliance for customer data in integrations
- PCI DSS compliance for payment provider integrations
- Data retention policies for integration logs
- Right to deletion for customer-related integration data
- Cross-border data transfer restrictions compliance

**Audit & Monitoring:**
- Complete audit trail for integration configuration changes
- Security event logging and monitoring
- Failed authentication attempt tracking
- Unauthorized access attempt detection and alerting
- Compliance reporting and evidence collection

## 16. Error Handling & Troubleshooting

### 16.1 Error Code Standardization
**Integration Error Codes:**
- `PROVIDER_UNAVAILABLE`: External service temporarily unavailable
- `PROVIDER_TIMEOUT`: External service request timeout
- `AUTHENTICATION_FAILED`: Provider authentication credentials invalid
- `INVALID_SIGNATURE`: Webhook signature verification failed
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `DUPLICATE_REQUEST`: Idempotency key conflict detected
- `INVALID_WEBHOOK_EVENT`: Webhook event format invalid
- `CONFIGURATION_MISSING`: Required integration configuration not found
- `UNSUPPORTED_OPERATION`: Requested operation not supported by provider
- `NETWORK_FAILURE`: Network connectivity issue

**Error Response Format:**
```typescript
interface IntegrationErrorResponse {
  error: {
    code: string;
    message: string;
    category: 'transient' | 'permanent' | 'configuration' | 'security';
    retryable: boolean;
    retryAfter?: number;
    details?: {
      providerId?: string;
      operation?: string;
      correlationId: string;
      timestamp: string;
    };
  };
}
```

### 16.2 Troubleshooting Tools
**Diagnostic Capabilities:**
- Integration health check and connectivity testing
- Request/response logging with sensitive data redaction
- Performance metric analysis and trending
- Error pattern analysis and alerting
- Configuration validation and compatibility checking

**Administrative Tools:**
- Manual retry for failed operations
- Integration configuration export/import
- Provider status override for emergency situations
- Bulk webhook event reprocessing
- Integration performance profiling and optimization
## 17. Dependencies

### 17.1 Internal Dependencies
- **SPEC-001**: User authentication, roles, branch scoping for API access control
- **SPEC-008**: Payment domain integration for payment provider abstraction
- **SPEC-012**: Notification domain integration for communication provider abstraction
- **SPEC-013**: Configuration management for integration settings and provider configuration
- **Shared**: Database infrastructure for integration data and audit trails
- **Shared**: Background job processing for webhook events and async operations
- **Shared**: Caching infrastructure (Redis) for rate limiting and performance optimization

### 17.2 External Dependencies
- External service provider APIs (payment, email, SMS, WhatsApp, storage)
- TLS/SSL certificates for secure webhook endpoints
- DNS resolution and network connectivity for external service access
- Time synchronization services for webhook timestamp validation
- Monitoring and alerting infrastructure for integration health tracking

### 17.3 Future Integration Points
- **Enterprise Service Bus**: Integration with enterprise messaging systems
- **API Gateway**: Advanced API management and traffic control
- **Identity Providers**: SAML/OIDC integration for enterprise authentication
- **Blockchain Services**: Cryptocurrency payment and verification integrations
- **IoT Platforms**: Device connectivity and sensor data integration
- **AI/ML Services**: Intelligent automation and decision support integrations

## 18. Test Requirements

### 18.1 Integration Testing
**Provider Integration Tests:**
- Mock provider implementation and response validation
- Error scenario testing and recovery validation
- Timeout and retry logic verification
- Circuit breaker functionality and recovery testing
- Webhook signature verification and event processing

**API Security Tests:**
- API key authentication and scope validation
- Rate limiting enforcement and bypass prevention
- Input validation and injection attack prevention
- Authorization boundary testing and privilege escalation prevention
- Cross-origin request security and CORS policy validation

### 18.2 Performance Testing
**Load Testing:**
- High-volume API request handling capability
- Concurrent webhook processing performance
- Rate limiting accuracy under load
- Provider failover and recovery time testing
- Database performance under integration load

**Scalability Testing:**
- Horizontal scaling validation for integration processing
- Load balancing effectiveness across integration instances
- Cache performance and consistency validation
- Background job processing scalability
- Resource utilization optimization validation

### 18.3 Security Testing
**Vulnerability Assessment:**
- Input validation and sanitization effectiveness
- Authentication bypass attempt prevention
- Authorization boundary enforcement
- Sensitive data exposure prevention
- Cross-site scripting and injection attack prevention

**Compliance Testing:**
- GDPR data handling and deletion compliance
- PCI DSS compliance for payment integrations
- Audit trail completeness and integrity validation
- Data encryption and secure transmission verification
- Access control and privilege management validation

## 19. Implementation Tasks

### 19.1 Core Infrastructure
**TASK-001: Integration Infrastructure & Types**
- **Owner**: Backend Developer
- **Dependencies**: SPEC-001, SPEC-013
- **Description**: Create integration management entities and shared type definitions
- **Acceptance Criteria**:
  - All integration entity tables with proper relationships
  - Provider abstraction interfaces and contracts
  - Integration configuration schema and validation
  - Shared error types and response formats
  - TypeScript interfaces for all integration operations
- **Testing**: Entity validation, interface compliance, type safety

**TASK-002: API Standards & Versioning Framework**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001
- **Description**: Implement internal API standards and versioning infrastructure
- **Acceptance Criteria**:
  - URL-based versioning system with backward compatibility
  - Standardized request/response formats across all endpoints
  - Pagination, filtering, and sorting standards
  - Error response standardization and correlation ID tracking
  - API documentation generation and maintenance
- **Testing**: API standard compliance, versioning accuracy, documentation consistency

**TASK-003: Provider Abstraction Framework**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001, TASK-002
- **Description**: Implement provider-agnostic integration interfaces
- **Acceptance Criteria**:
  - Payment provider abstraction with multiple implementations
  - Communication provider abstraction (email, SMS, WhatsApp)
  - Storage provider abstraction with S3-compatible interface
  - Provider configuration and credential management
  - Provider health checking and status monitoring
- **Testing**: Provider interface compliance, abstraction layer validation, health checking

### 19.2 Security & Authentication
**TASK-004: API Key Management System**
- **Owner**: Backend Developer
- **Dependencies**: TASK-002, TASK-003
- **Description**: Implement secure API key generation, validation, and management
- **Acceptance Criteria**:
  - Cryptographically secure key generation and hashing
  - Scope-based access control and permission validation
  - Key lifecycle management (creation, rotation, revocation)
  - Usage tracking and rate limiting integration
  - Security audit trail for key operations
- **Testing**: Key security validation, scope enforcement, audit completeness

**TASK-005: Webhook Security Infrastructure**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003, TASK-004
- **Description**: Implement secure webhook processing with signature verification
- **Acceptance Criteria**:
  - Provider-specific signature verification algorithms
  - Timestamp validation and replay protection
  - Idempotency checking and duplicate event handling
  - Webhook endpoint management and configuration
  - Event persistence and processing pipeline
- **Testing**: Signature verification accuracy, replay protection, idempotency validation

**TASK-006: Rate Limiting & Throttling System**
- **Owner**: Backend Developer
- **Dependencies**: TASK-004, TASK-005
- **Description**: Implement distributed rate limiting and request throttling
- **Acceptance Criteria**:
  - Multi-tier rate limiting (per-key, per-IP, per-endpoint)
  - Distributed rate limiting with Redis backing
  - Burst capacity and graceful degradation
  - Rate limit header generation and client communication
  - Monitoring and alerting for rate limit violations
- **Testing**: Rate limit accuracy, distributed consistency, burst handling

### 19.3 Integration Processing
**TASK-007: Retry & Idempotency Framework**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003, TASK-005
- **Description**: Implement retry logic and idempotency management
- **Acceptance Criteria**:
  - Exponential backoff with jitter and circuit breaker integration
  - Idempotency key management and conflict resolution
  - Dead letter queue handling for permanent failures
  - Configurable retry policies per provider and operation
  - Integration with provider health monitoring
- **Testing**: Retry logic accuracy, idempotency conflict handling, failure recovery

**TASK-008: Integration Health & Monitoring**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003, TASK-006, TASK-007
- **Description**: Implement comprehensive integration health monitoring
- **Acceptance Criteria**:
  - Provider health checking and status tracking
  - Performance metric collection and analysis
  - Alert generation for degraded or failed integrations
  - Integration dashboard and monitoring interface
  - Historical health data and trend analysis
- **Testing**: Health check accuracy, metric collection, alert generation

**TASK-009: Integration Logging & Audit System**
- **Owner**: Backend Developer
- **Dependencies**: TASK-007, TASK-008
- **Description**: Implement comprehensive integration logging with sensitive data protection
- **Acceptance Criteria**:
  - Request/response logging with automatic data redaction
  - Audit trail for all integration configuration changes
  - Performance and error metric tracking
  - Log retention and cleanup policies
  - Search and filtering capabilities for troubleshooting
- **Testing**: Log completeness, data redaction accuracy, audit trail integrity
### 19.4 Provider-Specific Implementations
**TASK-010: Payment Provider Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003, TASK-007, SPEC-008
- **Description**: Implement payment provider integrations with SPEC-008 integration
- **Acceptance Criteria**:
  - Payment provider adapter implementations (Stripe, PayPal, etc.)
  - Payment initiation, confirmation, and refund operations
  - Webhook processing for payment status updates
  - Integration with SPEC-008 payment domain
  - Error handling and retry logic for payment operations
- **Testing**: Payment flow validation, webhook processing, SPEC-008 integration

**TASK-011: Communication Provider Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003, TASK-007, SPEC-012
- **Description**: Implement communication provider integrations with SPEC-012 integration
- **Acceptance Criteria**:
  - Email, SMS, WhatsApp provider adapter implementations
  - Message sending and delivery status tracking
  - Template processing and variable substitution
  - Integration with SPEC-012 notification system
  - Delivery failure handling and retry mechanisms
- **Testing**: Message delivery validation, template processing, SPEC-012 integration

**TASK-012: Storage Provider Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003, TASK-007
- **Description**: Implement file storage provider integrations
- **Acceptance Criteria**:
  - S3-compatible storage provider implementations
  - File upload, download, and deletion operations
  - Presigned URL generation for secure access
  - Metadata management and file organization
  - Storage quota and usage monitoring
- **Testing**: File operations validation, presigned URL security, quota enforcement

### 19.5 Testing & Quality Assurance
**TASK-013: Integration Test Framework**
- **Owner**: Backend Developer
- **Dependencies**: TASK-010, TASK-011, TASK-012
- **Description**: Implement comprehensive integration testing framework
- **Acceptance Criteria**:
  - Mock provider implementations for all integration types
  - Automated test suite for integration workflows
  - Performance testing under load and failure conditions
  - Security testing for authentication and authorization
  - End-to-end integration validation with business domains
- **Testing**: Test framework validation, mock accuracy, performance benchmarks

### 19.6 User Interface Layer
**TASK-014: Admin Integration Management Interface**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-008, TASK-009
- **Description**: Build comprehensive integration management dashboard
- **Acceptance Criteria**:
  - Integration status monitoring and health dashboard
  - Provider configuration and management interface
  - API key generation and management tools
  - Webhook configuration and testing interface
  - Integration log viewing and filtering capabilities
- **Testing**: Admin interface validation, configuration accuracy, monitoring display

**TASK-015: Integration Monitoring Dashboard**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-008, TASK-014
- **Description**: Build real-time integration monitoring and alerting interface
- **Acceptance Criteria**:
  - Real-time integration health and performance visualization
  - Historical trend analysis and reporting
  - Alert configuration and management interface
  - Integration troubleshooting and diagnostic tools
  - Performance metric analysis and optimization recommendations
- **Testing**: Monitoring accuracy, real-time updates, alert functionality

**TASK-016: API Documentation Interface**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-002, TASK-004
- **Description**: Build interactive API documentation and testing interface
- **Acceptance Criteria**:
  - Automatically generated API documentation from OpenAPI specs
  - Interactive API testing and exploration tools
  - Authentication and authorization examples
  - Code samples and integration guides
  - Versioning and migration documentation
- **Testing**: Documentation accuracy, interactive testing, code sample validation

**TASK-017: Desktop Integration Optimization**
- **Owner**: Desktop Developer
- **Dependencies**: TASK-002, TASK-006, TASK-007
- **Description**: Optimize integration performance and reliability for Desktop POS
- **Acceptance Criteria**:
  - Optimized API client for Desktop POS connectivity
  - Offline queue and sync mechanisms for critical operations
  - Connection retry and recovery logic
  - Local caching for frequently accessed data
  - Performance optimization for low-bandwidth connections
- **Testing**: Desktop connectivity validation, offline handling, performance optimization

## 20. Acceptance Criteria

### 20.1 Core Integration Infrastructure
- [ ] Single authoritative backend API serves all three applications
- [ ] Provider abstraction interfaces successfully decouple business logic from external services
- [ ] API versioning system maintains backward compatibility and migration paths
- [ ] External service failures cannot corrupt business transaction integrity
- [ ] Integration configuration separated from sensitive credential management
- [ ] All external communications use secure protocols and authentication

### 20.2 Security & Authentication
- [ ] API key management provides secure generation, hashing, and scope validation
- [ ] Webhook signature verification prevents unauthorized event processing
- [ ] Rate limiting protects against abuse and prevents service overload
- [ ] Sensitive data redaction prevents credential exposure in logs
- [ ] Integration audit trail captures all security-relevant operations
- [ ] Access control restricts integration management to authorized users

### 20.3 Reliability & Performance
- [ ] Retry mechanisms handle transient failures with exponential backoff
- [ ] Idempotency prevents duplicate operations from corrupting business data
- [ ] Circuit breaker prevents cascading failures from affecting system stability
- [ ] Integration health monitoring provides real-time status and alerting
- [ ] Performance metrics enable optimization and capacity planning
- [ ] Background processing prevents external service delays from blocking operations

### 20.4 Domain Integration
- [ ] Payment providers integrate seamlessly with SPEC-008 without logic duplication
- [ ] Communication providers integrate with SPEC-012 notification system correctly
- [ ] Configuration integration with SPEC-013 maintains proper separation of concerns
- [ ] Business domains consume integration services through standardized interfaces
- [ ] Integration changes do not require modifications to business domain logic
- [ ] Cross-domain integration maintains data consistency and audit requirements

## 21. Future Enhancements

### 21.1 Advanced Integration Capabilities
- **Enterprise Service Bus**: Integration with enterprise messaging and workflow systems
- **GraphQL Gateway**: Unified GraphQL interface for complex data fetching requirements
- **Serverless Functions**: Event-driven integration processing with auto-scaling capabilities
- **API Marketplace**: Third-party integration discovery and self-service onboarding
- **Real-time Streaming**: WebSocket and Server-Sent Events for live data synchronization

### 21.2 Enhanced Security & Compliance
- **OAuth 2.0/OIDC**: Advanced authentication and authorization for partner integrations
- **Certificate Management**: Automated TLS certificate provisioning and rotation
- **Advanced Threat Protection**: Machine learning-based anomaly detection and prevention
- **Compliance Automation**: Automated compliance reporting and evidence collection
- **Zero-Trust Architecture**: Enhanced security model with continuous verification

### 21.3 Operational Excellence
- **Chaos Engineering**: Automated failure injection and resilience testing
- **Advanced Analytics**: Machine learning-powered integration optimization and prediction
- **Self-Healing Systems**: Automated recovery and remediation for common failures
- **Performance Optimization**: AI-driven performance tuning and resource optimization
- **Global Distribution**: Multi-region deployment with latency optimization

## 22. Summary

SPEC-014 defines a comprehensive Integration & API Management infrastructure that provides centralized external service connectivity, standardized API interfaces, and robust security controls while maintaining clear separation from business domain logic.

### 22.1 Core Capabilities
- **API Standardization**: Unified API standards, versioning, and documentation across all applications
- **Provider Abstraction**: Pluggable external service integrations with business logic isolation
- **Webhook Infrastructure**: Secure inbound event processing with signature verification and replay protection
- **Authentication & Security**: API key management, rate limiting, and comprehensive access controls
- **Health & Monitoring**: Real-time integration monitoring with alerting and performance analytics
- **Reliability Framework**: Retry mechanisms, idempotency, and circuit breaker protection
- **Audit & Compliance**: Complete integration audit trail with sensitive data protection

### 22.2 Integration Categories
**5 comprehensive integration types:**
- **Payment Providers**: Secure payment processing with multiple provider support (Stripe, PayPal, regional gateways)
- **Communication Providers**: Multi-channel messaging (email, SMS, WhatsApp) with delivery tracking
- **Storage Providers**: S3-compatible file storage with secure access and metadata management
- **Push Notification Services**: Cross-platform push notifications with device management
- **Enterprise Services**: Future-ready integration points for ERP, CRM, and business intelligence systems

### 22.3 API/Integration Architecture
**Layered architecture with clear separation:**
1. **Application Layer**: E-commerce, Admin Dashboard, Desktop POS applications
2. **API Gateway Layer**: Authentication, rate limiting, versioning, and request routing
3. **Business Domain Layer**: Domain-specific logic and data management (SPEC-005 through SPEC-013)
4. **Integration Layer**: Provider abstraction, webhook processing, and external communication
5. **External Provider Layer**: Third-party services and APIs with secure connectivity

### 22.4 Implementation Tasks Summary
**17 atomic tasks** organized across:
- **Core Infrastructure**: Integration entities, API standards, provider abstraction (3 tasks)
- **Security & Authentication**: API keys, webhooks, rate limiting (3 tasks)
- **Integration Processing**: Retry logic, health monitoring, logging (3 tasks)
- **Provider Implementations**: Payment, communication, storage integrations (3 tasks)
- **Testing & Quality**: Comprehensive test framework and validation (1 task)
- **User Interfaces**: Admin management, monitoring, documentation (3 tasks)
- **Optimization**: Desktop integration and performance tuning (1 task)

### 22.5 Dependencies
- SPEC-001 (Authentication) for API access control and user management
- SPEC-008 (Payments) for payment provider integration coordination
- SPEC-012 (Notifications) for communication provider integration
- SPEC-013 (Configuration) for integration settings and provider configuration
- Secure credential management system for external service authentication
- Background job processing infrastructure for asynchronous operations
- Distributed caching system (Redis) for rate limiting and performance optimization

### 22.6 Downstream Features
- **Enterprise Integration**: SAML/OIDC authentication and enterprise service bus connectivity
- **API Ecosystem**: Partner API programs and third-party developer platforms
- **Advanced Analytics**: Machine learning-powered integration optimization and insights
- **Global Deployment**: Multi-region integration processing with latency optimization
- **Blockchain Integration**: Cryptocurrency payments and distributed ledger connectivity
- **IoT Connectivity**: Device integration and sensor data processing capabilities

### 22.7 Next Recommended Specification
**SPEC-015: Deployment & DevOps Infrastructure** - Building on the complete application system to provide comprehensive deployment automation, monitoring, and operational excellence capabilities for production environments.
