# SPEC-008: Invoices & Payments

**Feature Goal:** Implement comprehensive invoice generation and payment processing system with support for partial payments, refunds, reservation deposits, order payments, and secure financial operations across all three applications.

**Priority:** P0 (Core MVP - Required for financial operations)

**Dependencies:** 
- SPEC-001 (Authentication, Users & Roles)
- SPEC-004 (Customers)
- SPEC-005 (Orders)
- SPEC-006 (Reservations)
- SPEC-007 (POS)

---

## Scope

This specification covers:
- Invoice generation and lifecycle management
- Payment recording and allocation for orders and reservations
- Multiple payment methods (cash, card, bank transfer, cheque)
- Partial payment support with accurate balance tracking
- Refund processing (full and partial)
- Reservation deposit integration and conversion
- Payment idempotency and concurrency protection
- Financial audit trail and reporting
- Integration boundaries for future installment payments

This specification **does NOT** cover:
- Installment plans and schedules (SPEC-009)
- Letters/receipt printing (SPEC-010)
- Financial reporting and analytics (SPEC-013)
- External payment provider implementations (future expansion)

These domains will integrate with the payment system through clean boundaries.

---

## User Roles

| Role | Payment Permissions |
|------|-------------------|
| `super_admin` | Full payment operations across all branches, refund authorization |
| `branch_manager` | Full payment operations for own branch, refund authorization |
| `cashier` | Record payments, view payment status (branch-scoped) |
| `accountant` | View all payments and financial data, generate reports |
| `inventory_clerk` | View payment status (read-only) |
| `customer` | View own invoices and payment history only |

---

## Invoice Lifecycle

### State Diagram

```
DRAFT ──► ISSUED ──► PARTIALLY_PAID ──► PAID
             │              │            │
             │              │            ▼
             ▼              ▼      OVERPAID (if allowed)
         CANCELLED      CANCELLED       │
                                       ▼
                                   REFUNDED
```

### State Definitions

| Status | Description | Who Can Set | Customer Visible |
|--------|-------------|-------------|------------------|
| `draft` | Invoice being prepared | System | No |
| `issued` | Invoice generated and ready for payment | System | Yes |
| `partially_paid` | Some payment received, balance remains | System | Yes |
| `paid` | Fully paid, no balance remaining | System | Yes |
| `overpaid` | Payment exceeds invoice amount | System | Yes |
| `cancelled` | Invoice cancelled before full payment | Staff | Yes |
| `refunded` | Full or partial refund issued | Staff | Yes |
## 8. Payment API

### 8.1 Create Payment
- **Endpoint**: `POST /api/payments`
- **Permission**: `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Request**:
```json
{
  "idempotencyKey": "string",
  "invoiceId": "uuid",
  "amount": "number",
  "method": "cash|card|bank_transfer|cheque",
  "reference": "string?",
  "externalTransactionId": "string?",
  "providerId": "string?",
  "cashDetails": {
    "amountReceived": "number?",
    "change": "number?"
  }
}
```
- **Response**: Payment with allocation details

### 8.2 List Payments
- **Endpoint**: `GET /api/payments`
- **Permission**: `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Query**: Customer, invoice, date range, method, status, pagination
- **Response**: Paginated payment list

### 8.3 Get Payment
- **Endpoint**: `GET /api/payments/:id`
- **Permission**: `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN` + branch scoping
- **Response**: Payment with allocation and audit history

### 8.4 Confirm Payment
- **Endpoint**: `PATCH /api/payments/:id/confirm`
- **Permission**: `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Request**: Confirmation details and external transaction ID
- **Response**: Updated payment status

### 8.5 Cancel Payment
- **Endpoint**: `PATCH /api/payments/:id/cancel`
- **Permission**: `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Request**: Cancellation reason
- **Response**: Updated payment status

## 9. Refund API

### 9.1 Create Refund
- **Endpoint**: `POST /api/refunds`
- **Permission**: `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Request**:
```json
{
  "paymentId": "uuid",
  "amount": "number",
  "reason": "string",
  "method": "cash|card|bank_transfer|original"
}
```
- **Response**: Refund with updated payment allocation

### 9.2 List Refunds
- **Endpoint**: `GET /api/refunds`
- **Permission**: `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Query**: Payment, invoice, customer, date range, pagination
- **Response**: Paginated refund list

### 9.3 Get Refund
- **Endpoint**: `GET /api/refunds/:id`
- **Permission**: `BRANCH_ADMIN`, `SUPER_ADMIN` + branch scoping
- **Response**: Refund with original payment details

## 10. Payment Allocation API

### 10.1 Allocate Payment
- **Endpoint**: `POST /api/payments/:id/allocations`
- **Permission**: `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Request**: Target invoice and allocation amount
- **Response**: Updated payment allocation

### 10.2 Get Payment Allocation
- **Endpoint**: `GET /api/payments/:id/allocations`
- **Permission**: `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Response**: All allocations for the payment
## 11. Customer Financial API

### 11.1 Get Customer Invoices
- **Endpoint**: `GET /api/customers/:id/invoices`
- **Permission**: Customer (own data), `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Query**: Status, date range, pagination
- **Response**: Customer's invoices with payment status

### 11.2 Get Customer Payments
- **Endpoint**: `GET /api/customers/:id/payments`
- **Permission**: Customer (own data), `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Query**: Date range, method, pagination
- **Response**: Customer's payment history

### 11.3 Get Customer Financial Summary
- **Endpoint**: `GET /api/customers/:id/financial-summary`
- **Permission**: Customer (own data), `SALES_STAFF`, `BRANCH_ADMIN`, `SUPER_ADMIN`
- **Response**: Total owed, total paid, outstanding balance

## 12. Validation Rules

### 12.1 Invoice Validation
- Invoice number must be unique system-wide
- Invoice total must be positive
- Branch must exist and user must have access
- Customer must exist
- Order/Reservation reference must exist if provided
- Invoice items must have valid motorcycle references
- All amounts must use DECIMAL(12,2) precision

### 12.2 Payment Validation
- Payment amount must be positive
- Payment amount cannot exceed remaining invoice balance unless overpayment allowed
- Cash payments require amountReceived >= amount
- Change calculation: amountReceived - amount
- Payment method must be valid enum value
- External transaction ID must be unique per provider
- Idempotency key must be unique within 24 hours

### 12.3 Refund Validation
- Refund amount must be positive
- Refund amount cannot exceed payment amount - previous refunds
- Only completed payments can be refunded
- Refund reason is required
- Refund method must match original payment method or be explicitly allowed

### 12.4 Data Type Validation (Zod)
```typescript
const InvoiceSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  customerId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  branchId: z.string().uuid(),
  status: z.enum(['draft', 'issued', 'partially_paid', 'paid', 'overpaid', 'cancelled', 'refunded']),
  totalAmount: z.number().positive(),
  paidAmount: z.number().min(0),
  remainingAmount: z.number().min(0),
  issueDate: z.date(),
  dueDate: z.date().optional(),
  items: z.array(InvoiceItemSchema)
});

const PaymentSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'bank_transfer', 'cheque']),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded']),
  reference: z.string().optional(),
  externalTransactionId: z.string().optional(),
  providerId: z.string().optional(),
  idempotencyKey: z.string(),
  cashDetails: CashDetailsSchema.optional()
});
```
## 13. Error Handling

### 13.1 Error Codes
- `INVOICE_NOT_FOUND`: Invoice does not exist or no access
- `PAYMENT_NOT_FOUND`: Payment does not exist or no access
- `INVALID_PAYMENT_AMOUNT`: Payment exceeds allowed balance
- `DUPLICATE_PAYMENT`: Idempotency conflict detected
- `INVALID_INVOICE_STATUS`: Operation not allowed in current status
- `INVALID_PAYMENT_STATUS`: Payment state prevents operation
- `REFUND_EXCEEDS_PAYMENT`: Refund amount exceeds available balance
- `DUPLICATE_REFUND`: Concurrent refund attempt detected
- `UNAUTHORIZED_REFUND`: User lacks refund permissions
- `BRANCH_ACCESS_VIOLATION`: Cross-branch access denied
- `INVALID_PAYMENT_METHOD`: Unsupported payment method
- `PROVIDER_VERIFICATION_FAILED`: External payment verification failed
- `CONCURRENT_UPDATE_CONFLICT`: Database optimistic lock failure
- `INVOICE_NUMBER_CONFLICT`: Duplicate invoice number generated
- `CASH_CALCULATION_ERROR`: Invalid cash amount or change

### 13.2 Error Response Format
```json
{
  "error": {
    "code": "INVALID_PAYMENT_AMOUNT",
    "message": "Payment amount exceeds remaining balance",
    "details": {
      "paymentAmount": 50000,
      "remainingBalance": 30000,
      "invoiceId": "uuid"
    }
  }
}
```

## 14. Business Rules

### 14.1 Financial Invariants
- `invoice.paidAmount <= invoice.totalAmount` (unless overpayment explicitly allowed)
- `payment.refundedAmount <= payment.amount`
- `invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount`
- All monetary calculations use exact decimal arithmetic
- No negative amounts allowed except for adjustments
- Invoice totals are immutable once issued

### 14.2 Status Transition Rules
**Invoice Status Transitions:**
- `draft` → `issued` (by SALES_STAFF+)
- `issued` → `partially_paid` (automatic on first payment < total)
- `partially_paid` → `paid` (automatic when payment = remaining)
- `paid` → `overpaid` (automatic when payment > remaining, if allowed)
- Any status → `cancelled` (by BRANCH_ADMIN+, only if no payments)
- `paid`/`overpaid` → `refunded` (automatic on full refund)

**Payment Status Transitions:**
- `pending` → `completed` (by system/provider confirmation)
- `pending` → `failed` (by system/provider)
- `pending` → `cancelled` (by user before completion)
- `completed` → `refunded` (automatic on full refund)
- `completed` → `partially_refunded` (automatic on partial refund)

### 14.3 Branch Scoping Rules
- Users can only access invoices/payments from their assigned branches
- `SUPER_ADMIN` can access all branches
- Cross-branch invoice transfers not supported
- Payment allocation limited to same-branch invoices

### 14.4 Audit Requirements
- All financial state changes must be logged
- Audit records include actor, timestamp, old/new values
- Audit logs are immutable and retention-protected
- Failed operations are also audited for security

## 15. Edge Cases

### 15.1 Concurrent Payment Scenarios
- Multiple users paying same invoice simultaneously
- Payment and refund operations on same payment
- Invoice cancellation during payment processing
- Reservation-to-order conversion during payment

### 15.2 System Recovery Scenarios
- Payment created but confirmation failed
- Provider webhook received before payment confirmed
- Duplicate webhook delivery handling
- Network timeout during refund processing

### 15.3 Data Integrity Scenarios
- Invoice deleted after payment created (prevent)
- Customer deleted with outstanding invoices (prevent)
- Branch deactivated with pending payments (handle gracefully)
- Payment provider disabled mid-transaction
## 16. Security & Privacy

### 16.1 Data Access Controls
- Customers access only own financial records
- Branch-level isolation enforced at database level
- Payment details masked in logs (card numbers, etc.)
- PII in financial records subject to GDPR/privacy rules
- Audit logs protected from unauthorized modification

### 16.2 Payment Security
- Idempotency keys prevent duplicate charges
- External provider integration uses secure authentication
- Webhook signatures validated before processing
- Sensitive payment data not stored locally when avoidable
- Cash handling requires proper audit trail

### 16.3 Authorization Matrix
| Operation | Customer | Sales Staff | Branch Admin | Super Admin |
|-----------|----------|-------------|--------------|-------------|
| View own invoices | ✓ | ✓ | ✓ | ✓ |
| View other invoices | ✗ | Branch only | Branch only | ✓ |
| Create invoice | ✗ | ✓ | ✓ | ✓ |
| Record payment | ✗ | ✓ | ✓ | ✓ |
| Refund payment | ✗ | ✗ | ✓ | ✓ |
| Cancel invoice | ✗ | ✗ | ✓ | ✓ |
| View audit logs | ✗ | Limited | Branch only | ✓ |

## 17. Acceptance Criteria

### 17.1 Core Requirements
- [ ] Invoice numbers are unique and sequential per branch
- [ ] Invoice financial snapshots preserve historical accuracy
- [ ] Payments can be recorded safely with idempotency
- [ ] Multiple partial payments are supported correctly
- [ ] Remaining balance calculations are always accurate
- [ ] Payment allocation prevents exceeding invoice totals
- [ ] Concurrent payment attempts don't corrupt data
- [ ] Refunds cannot exceed original payment amounts
- [ ] Duplicate refunds are prevented by system design

### 17.2 Integration Requirements
- [ ] Reservation deposits convert to payment records seamlessly
- [ ] Order financial data integrates without duplication
- [ ] POS receives authoritative backend payment results
- [ ] Branch isolation enforced across all operations
- [ ] Customer data access limited to appropriate scope
- [ ] Future installments can integrate without domain redesign

### 17.3 Operational Requirements
- [ ] Financial operations are fully auditable
- [ ] System handles network failures gracefully
- [ ] Provider webhooks process idempotently
- [ ] Cash handling calculations are accurate
- [ ] Invoice/payment search performs adequately
- [ ] Real-time updates reflect in relevant UIs

## 18. Test Requirements

### 18.1 Unit Tests
- Invoice number generation and uniqueness
- Payment allocation calculations
- Status transition validation
- Business rule enforcement
- Validation schema compliance
- Error code generation

### 18.2 Integration Tests
- End-to-end payment flows
- Reservation deposit conversion
- Order payment processing
- Cross-domain data consistency
- Provider webhook handling
- Concurrent operation safety

### 18.3 Security Tests
- Branch isolation verification
- Customer data access controls
- Payment authorization checks
- Audit trail completeness
- Idempotency protection
- Input validation and sanitization

### 18.4 Performance Tests
- Payment processing under load
- Invoice/payment search performance
- Concurrent payment handling
- Database query optimization
- Large dataset pagination
- Real-time event delivery
## 19. Dependencies

### 19.1 Internal Dependencies
- **SPEC-001**: User roles, permissions, branch scoping
- **SPEC-004**: Customer entity and validation
- **SPEC-005**: Order entity and financial totals
- **SPEC-006**: Reservation entity and deposit handling
- **SPEC-007**: POS integration requirements
- **Shared**: Database connection, authentication middleware
- **Shared**: Audit logging system
- **Shared**: Real-time event system (Socket.IO)

### 19.2 External Dependencies
- Database system with ACID transaction support
- Decimal/numeric data type for financial calculations
- Optional: External payment provider APIs
- Optional: SMS/email system for payment notifications
- Logging and monitoring infrastructure

### 19.3 Future Integration Points
- **SPEC-009 Installments**: Payment allocation for installment schedules
- **SPEC-011 Reports**: Financial reporting and analytics
- **SPEC-014 Accounting**: Journal entries and ledger integration

## 20. Implementation Tasks

### 20.1 Database Layer
**TASK-001: Financial Database Schema**
- **Owner**: Backend Developer
- **Dependencies**: SPEC-001, SPEC-004, SPEC-005, SPEC-006
- **Description**: Create Invoice, Payment, PaymentAllocation, Refund tables with indexes
- **Acceptance Criteria**:
  - All tables created with proper relationships
  - Unique constraints on invoice numbers and payment references
  - Indexes on common query patterns
  - Decimal fields for monetary values
  - Audit timestamp fields
- **Testing**: Schema validation, constraint testing, index performance

**TASK-002: Financial Sequence Generators**
- **Owner**: Backend Developer  
- **Dependencies**: TASK-001
- **Description**: Implement thread-safe invoice and payment number generation
- **Acceptance Criteria**:
  - Invoice numbers follow INV-{branchCode}-{year}-{sequence} format
  - Payment references are unique system-wide
  - Concurrent generation doesn't create duplicates
  - Branch-specific sequences maintained
- **Testing**: Concurrency tests, uniqueness validation

### 20.2 Shared Components
**TASK-003: Financial Type Definitions**
- **Owner**: Backend Developer
- **Dependencies**: None
- **Description**: Create TypeScript interfaces and Zod schemas for financial entities
- **Acceptance Criteria**:
  - Complete type definitions for all entities
  - Validation schemas with proper constraints
  - Enum definitions for statuses and methods
  - Export shared types for frontend consumption
- **Testing**: Type checking, validation schema tests

**TASK-004: Financial Business Logic**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001, TASK-003
- **Description**: Implement core financial calculations and state transitions
- **Acceptance Criteria**:
  - Payment allocation logic
  - Remaining balance calculations
  - Status transition validation
  - Refund amount validation
  - Business rule enforcement
- **Testing**: Unit tests for all calculation methods

### 20.3 API Layer
**TASK-005: Invoice Management API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001, TASK-002, TASK-004
- **Description**: Implement invoice CRUD operations and lifecycle management
- **Acceptance Criteria**:
  - Create, read, update invoice endpoints
  - Invoice numbering and status management
  - Integration with orders and reservations
  - Branch scoping and permissions
  - Error handling and validation
- **Testing**: API integration tests, permission tests

**TASK-006: Payment Processing API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001, TASK-005
- **Description**: Implement payment creation, confirmation, and allocation
- **Acceptance Criteria**:
  - Payment creation with idempotency
  - Payment status management
  - Automatic invoice balance updates
  - Cash payment handling
  - Payment allocation logic
- **Testing**: Payment flow tests, idempotency tests
**TASK-007: Refund Management API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-006
- **Description**: Implement refund creation, processing, and tracking
- **Acceptance Criteria**:
  - Refund creation with authorization checks
  - Partial and full refund support
  - Refund amount validation
  - Payment status updates
  - Audit trail generation
- **Testing**: Refund validation tests, authorization tests

**TASK-008: Customer Financial Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, TASK-006, SPEC-004
- **Description**: Implement customer financial history and summary APIs
- **Acceptance Criteria**:
  - Customer invoice listing
  - Customer payment history
  - Financial summary calculations
  - Privacy and access controls
  - Performance optimization
- **Testing**: Data access tests, performance tests

### 20.4 Integration Layer
**TASK-009: Reservation Deposit Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-006, SPEC-006
- **Description**: Convert reservation deposits to payment records
- **Acceptance Criteria**:
  - Seamless deposit-to-payment conversion
  - Maintain payment traceability
  - Handle reservation-to-order transitions
  - Prevent duplicate payment records
  - Preserve audit history
- **Testing**: Integration tests with reservation system

**TASK-010: Order Payment Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, SPEC-005
- **Description**: Generate invoices from orders and handle order payments
- **Acceptance Criteria**:
  - Automatic invoice generation from orders
  - Order financial snapshot preservation
  - Payment allocation to order invoices
  - Order status synchronization
  - POS integration support
- **Testing**: End-to-end order payment tests

**TASK-011: Provider Integration Framework**
- **Owner**: Backend Developer
- **Dependencies**: TASK-006
- **Description**: Create abstraction layer for external payment providers
- **Acceptance Criteria**:
  - Provider interface definition
  - Webhook handling framework
  - Transaction verification
  - Idempotent webhook processing
  - Provider status reconciliation
- **Testing**: Mock provider tests, webhook tests

### 20.5 Concurrency & Security
**TASK-012: Financial Transaction Safety**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, TASK-006, TASK-007
- **Description**: Implement database transactions and concurrency controls
- **Acceptance Criteria**:
  - ACID transaction boundaries
  - Optimistic locking for financial updates
  - Deadlock prevention and recovery
  - Idempotency key management
  - Concurrent operation validation
- **Testing**: Concurrency stress tests, transaction tests

**TASK-013: Financial Audit System**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, TASK-006, TASK-007
- **Description**: Implement comprehensive audit logging for financial operations
- **Acceptance Criteria**:
  - All state changes logged
  - Immutable audit records
  - Actor and timestamp tracking
  - Change detail capture
  - Query and export capabilities
- **Testing**: Audit completeness tests, integrity tests

### 20.6 User Interface Layer
**TASK-014: Admin Invoice Management**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-005, TASK-008
- **Description**: Build admin dashboard for invoice management
- **Acceptance Criteria**:
  - Invoice listing with search/filter
  - Invoice detail view with payment history
  - Invoice status management
  - Payment allocation interface
  - Responsive design for tablet/desktop
- **Testing**: UI component tests, user workflow tests

**TASK-015: Admin Payment & Refund Management**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-006, TASK-007
- **Description**: Build admin interfaces for payment and refund operations
- **Acceptance Criteria**:
  - Payment recording interface
  - Payment status tracking
  - Refund request and approval workflow
  - Financial summary dashboards
  - Permission-based UI elements
- **Testing**: UI tests, permission-based rendering tests

**TASK-016: POS Payment Interface**
- **Owner**: Desktop Developer
- **Dependencies**: TASK-006, TASK-010, SPEC-007
- **Description**: Integrate payment processing into POS application
- **Acceptance Criteria**:
  - Payment method selection
  - Cash payment handling with change calculation
  - Payment confirmation and receipt
  - Real-time payment status updates
  - Offline payment queuing
- **Testing**: POS integration tests, offline handling tests

**TASK-017: Customer Payment History**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-008
- **Description**: Build customer-facing payment history interface
- **Acceptance Criteria**:
  - Invoice and payment listing
  - Payment status tracking
  - Download/print capabilities
  - Responsive mobile design
  - Privacy compliance
- **Testing**: Customer access tests, mobile responsiveness tests
## 21. Future Integration Boundaries

### 21.1 Installments Domain Integration Points
The payment system provides these integration points for future SPEC-009:

**Payment Allocation Extensions:**
- Support allocation to installment obligations
- Track installment payment schedules
- Handle partial installment payments
- Manage installment-specific payment statuses

**Invoice Extensions:**
- Support installment-based invoice generation
- Handle recurring invoice creation
- Manage installment payment due dates
- Track installment completion status

**API Extensions:**
- `POST /api/payments` - Accept installment allocation targets
- `GET /api/installments/:id/payments` - Payment history for installment
- `POST /api/installments/:id/invoices` - Generate installment invoice

### 21.2 Accounting Integration Points
Future accounting system integration through:
- Standardized journal entry format
- Chart of accounts mapping
- General ledger posting interface
- Financial period reconciliation
- Audit trail synchronization

### 21.3 Reporting Integration Points
Financial reporting system access through:
- Revenue recognition data
- Payment method analytics
- Customer payment patterns
- Branch financial performance
- Refund and adjustment tracking

## 22. Summary

SPEC-008 defines a comprehensive Invoices & Payments domain for the motorcycle dealership platform with the following key capabilities:

### 22.1 Core Features
- **Invoice Management**: Generation, numbering, lifecycle, and financial snapshots
- **Payment Processing**: Multi-method payments, allocation, and confirmation
- **Refund Handling**: Full and partial refunds with authorization controls
- **Financial Integration**: Seamless connection with Orders and Reservations
- **Audit Trail**: Complete logging of all financial operations

### 22.2 Invoice Lifecycle
`draft` → `issued` → `partially_paid` → `paid` → `overpaid` → `cancelled` → `refunded`

### 22.3 Payment Lifecycle  
`pending` → `completed` → `failed` → `cancelled` → `refunded` → `partially_refunded` → `reversed`

### 22.4 Key Architectural Decisions
- DECIMAL(12,2) for exact financial arithmetic
- Branch-scoped invoice numbering: INV-{branchCode}-{year}-{sequence}
- Idempotent payment operations with 24-hour key retention
- Immutable financial audit records
- Provider-agnostic payment abstraction
- Clean integration boundaries for future installments

### 22.5 Implementation Tasks Summary
**17 atomic tasks** organized across:
- **Database Layer**: Schema, sequences (2 tasks)
- **Shared Components**: Types, business logic (2 tasks)  
- **API Layer**: Invoice, payment, refund, customer APIs (4 tasks)
- **Integration Layer**: Reservations, orders, providers (3 tasks)
- **Security Layer**: Transactions, audit (2 tasks)
- **UI Layer**: Admin, POS, customer interfaces (4 tasks)

### 22.6 Dependencies
- SPEC-001 (Authentication), SPEC-004 (Customers), SPEC-005 (Orders), SPEC-006 (Reservations), SPEC-007 (POS)
- Database with ACID transactions and decimal arithmetic
- Optional payment provider APIs

### 22.7 Downstream Features
- **SPEC-009 Installments**: Will extend payment allocation for installment schedules
- **SPEC-011 Reports**: Financial analytics and reporting
- **SPEC-014 Accounting**: Journal entries and general ledger integration

### 22.8 Next Recommended Specification
**SPEC-009: Installments & Financing** - Building on the payment infrastructure to support motorcycle financing, installment plans, due date management, and collection workflows.