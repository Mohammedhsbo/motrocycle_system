# SPEC-009: Installments & Financing

**Feature Goal:** Implement motorcycle financing through installment plans, enabling customers to purchase motorcycles with structured payment schedules, down payments, and flexible terms.

**Priority:** P0 (Core MVP - Customer financing capability)

**Dependencies:** 
- SPEC-001 (Authentication & Roles)
- SPEC-004 (Customers)
- SPEC-005 (Orders) 
- SPEC-006 (Reservations)
- SPEC-008 (Invoices & Payments)

**Applications:**
- E-commerce Website: Customer financing portal and account management
- Admin Dashboard: Financing management, approval workflow, overdue tracking
- Desktop POS: Quick financing setup, installment payment processing

## 1. Scope

This specification covers:
- Financing contract creation and management
- Installment plan generation and scheduling
- Down payment handling and validation
- Payment allocation to installments through SPEC-008
- Installment status lifecycle (upcoming → due → paid/overdue)
- Early settlement and financing completion
- Customer financing history and statements
- Admin financing oversight and approvals
- POS integration for financing workflows

This specification **does NOT** cover:
- Payment processing engine (SPEC-008)
- Invoice generation (SPEC-008)
- Customer management (SPEC-004)
- Order processing (SPEC-005)
- Interest calculation formulas (configurable)
- Credit scoring or approval algorithms
- External financing provider integrations
- Debt collection workflows

## 2. User Roles

**Customer:**
- View own financing contracts and installment schedules
- View payment history and remaining balances
- Request early settlement (if permitted)

**Sales Staff (cashier/sales_staff):**
- Create financing contracts for orders
- Record installment payments through SPEC-008
- View customer financing summaries
- Process early settlements

**Branch Admin (branch_admin):**
- Approve financing contracts (if approval required)
- Manage overdue installments
- Access branch financing reports
- Configure financing terms
**Super Admin (super_admin):**
- Full access to all financing data across branches
- Configure system-wide financing parameters
- Override financing rules and approvals

## 3. Functional Requirements

### 3.1 Financing Contract Creation
- Create financing contract from confirmed order
- Specify total amount, down payment, installment count
- Calculate financing amount (total - down payment)
- Set installment frequency (monthly/quarterly/custom)
- Generate unique financing contract number
- Link to customer, order, and motorcycle
- Record creating user and branch

### 3.2 Installment Schedule Generation
- Auto-generate installment records on contract creation
- Calculate individual installment amounts with proper rounding
- Set due dates based on frequency and start date
- Handle edge cases (month-end dates, leap years)
- Ensure total installments equal financing amount exactly

### 3.3 Down Payment Processing
- Validate down payment against minimum/maximum rules
- Record down payment as standard payment through SPEC-008
- Link down payment to financing contract
- Update order balance after down payment

### 3.4 Installment Payment Allocation
- Route installment payments through SPEC-008 payment system
- Allocate payments to specific installments
- Support partial installment payments
- Automatically update installment status after payment
- Handle overpayments and early settlement

### 3.5 Status Management
- Track financing contract status (active/completed/defaulted/cancelled)
- Manage individual installment status (upcoming/due/paid/overdue)
- Automatic status transitions based on due dates and payments
- Background processing for status updates

## 4. Data Model Requirements

### 4.1 FinancingContract Entity
From DATABASE_DESIGN.md InstallmentPlan table:
- id (UUID, primary key)
- customerId (UUID, foreign key to Customer)
- orderId (UUID, foreign key to Order)  
- totalAmount (DECIMAL(12,2))
- downPayment (DECIMAL(12,2), default 0)
- numberOfInstallments (INTEGER)
- interestRate (DECIMAL(5,2), default 0)
- startDate (DATE)
- status (VARCHAR(20), default 'active')
- createdAt/updatedAt timestamps

Additional fields needed:
- contractNumber (VARCHAR(30), unique)
- branchId (UUID, foreign key to Branch)
- createdBy (UUID, foreign key to User)
- approvedBy (UUID, foreign key to User, nullable)
- approvedAt (TIMESTAMP, nullable)
- completedAt (TIMESTAMP, nullable)
### 4.2 Installment Entity  
From DATABASE_DESIGN.md Installment table:
- id (UUID, primary key)
- planId (UUID, foreign key to FinancingContract)
- dueDate (DATE)
- amount (DECIMAL(12,2))
- paidAmount (DECIMAL(12,2), default 0)
- status (VARCHAR(20), default 'upcoming')
- paidAt (TIMESTAMP, nullable)
- createdAt/updatedAt timestamps

Additional fields needed:
- installmentNumber (INTEGER)
- remainingAmount (DECIMAL(12,2), computed: amount - paidAmount)

### 4.3 Status Enums (from BUSINESS_RULES.md)

**FinancingContract Status:**
- `active`: Contract active with pending installments
- `completed`: All installments paid, contract fulfilled  
- `defaulted`: Missed payments exceed threshold
- `cancelled`: Contract terminated early

**Installment Status:**
- `upcoming`: Due date not yet reached
- `due`: Due date reached, payment expected
- `paid`: Installment fully paid
- `overdue`: Due date passed, payment not received

### 4.4 Relationships
- FinancingContract → Customer (many-to-one)
- FinancingContract → Order (one-to-one)  
- FinancingContract → Branch (many-to-one)
- FinancingContract → User (created_by, approved_by)
- Installment → FinancingContract (many-to-one)
- Payment → Installment (many-to-one via allocation, SPEC-008)

## 5. Business Rules

### 5.1 Status Transitions (from BUSINESS_RULES.md)

**FinancingContract:**
```
active → completed (all installments paid)
active → defaulted (missed payments exceed threshold)  
active → cancelled (early settlement or cancellation)
```

**Installment:**
```
upcoming → due (due date reached)
due → paid (payment received)
due → overdue (due date passed)
overdue → paid (payment received)
```

### 5.2 Financial Rules
- Down payment cannot exceed total amount
- Financing amount = total amount - down payment  
- Sum of all installment amounts must equal financing amount exactly
- Rounding adjustment applied to final installment if needed
- Individual installment payments cannot exceed installment amount
- Partial payments update paidAmount, remainingAmount recalculated

### 5.3 Contract Rules
- One active financing contract per order maximum
- Contract number format: FIN-{branchCode}-{year}-{sequence}
- Contracts cannot be deleted, only cancelled
- Approval may be required based on amount thresholds
- Early settlement allowed unless explicitly prohibited
### 5.4 Payment Allocation Rules
- Payments allocated to oldest due installment first by default
- Specific installment allocation allowed if specified
- Overpayments can be applied to future installments
- Early settlement pays all remaining installments at once
- All payments processed through SPEC-008 payment system

## 6. RBAC & Permissions

Using roles from SPEC-001 Authentication:

**View Financing:**
- Customer: Own contracts only
- sales_staff: Branch customers only  
- branch_admin: Branch contracts only
- accountant: Branch contracts (read-only)
- super_admin: All contracts

**Create Financing:**
- sales_staff: Within branch
- branch_admin: Within branch
- super_admin: Any branch

**Approve Financing:**
- branch_admin: Branch contracts only
- super_admin: All contracts

**Record Payments:**
- sales_staff: Branch contracts
- branch_admin: Branch contracts  
- super_admin: All contracts

**Early Settlement:**
- branch_admin: Branch contracts
- super_admin: All contracts

**Cancel/Default:**
- branch_admin: Branch contracts only
- super_admin: All contracts

## 7. API Endpoints

### 7.1 Financing Contract API

#### Create Financing Contract
- **Endpoint**: `POST /api/financing-contracts`
- **Permission**: `sales_staff`, `branch_admin`, `super_admin`
- **Request**:
```json
{
  "orderId": "uuid",
  "customerId": "uuid", 
  "totalAmount": "number",
  "downPayment": "number",
  "numberOfInstallments": "number",
  "interestRate": "number?",
  "startDate": "string (ISO date)",
  "frequency": "monthly|quarterly"
}
```
- **Response**: Created financing contract with installment schedule

#### List Financing Contracts  
- **Endpoint**: `GET /api/financing-contracts`
- **Permission**: Role-based branch filtering
- **Query**: customer, status, branch, date range, pagination
- **Response**: Paginated contract list with summary data

#### Get Financing Contract
- **Endpoint**: `GET /api/financing-contracts/:id`  
- **Permission**: Role-based access control
- **Response**: Full contract details with installment schedule

#### Update Financing Status
- **Endpoint**: `PATCH /api/financing-contracts/:id/status`
- **Permission**: `branch_admin`, `super_admin`
- **Request**: New status and reason
- **Response**: Updated contract
#### Approve Financing Contract
- **Endpoint**: `PATCH /api/financing-contracts/:id/approve`
- **Permission**: `branch_admin`, `super_admin`
- **Request**: Approval notes and effective date
- **Response**: Approved contract with updated status

### 7.2 Installment API

#### List Installments
- **Endpoint**: `GET /api/financing-contracts/:contractId/installments`
- **Permission**: Contract access permissions
- **Query**: status, due date range, pagination  
- **Response**: Installment list with payment status

#### Get Installment Details
- **Endpoint**: `GET /api/installments/:id`
- **Permission**: Contract access permissions
- **Response**: Installment with payment history and allocations

#### Record Installment Payment
- **Endpoint**: `POST /api/installments/:id/payments`
- **Permission**: `sales_staff`, `branch_admin`, `super_admin`  
- **Request**: Payment details (routes to SPEC-008)
- **Response**: Updated installment with payment confirmation

#### Early Settlement
- **Endpoint**: `POST /api/financing-contracts/:id/settle`
- **Permission**: `branch_admin`, `super_admin`
- **Request**: Settlement amount and payment details
- **Response**: Settlement confirmation with updated contract status

### 7.3 Customer Financing API

#### Get Customer Financing Summary
- **Endpoint**: `GET /api/customers/:id/financing-summary`
- **Permission**: Customer (own), staff (branch), admin (all)
- **Response**:
```json
{
  "activeContracts": "number",
  "totalFinanced": "number", 
  "totalPaid": "number",
  "totalRemaining": "number",
  "nextInstallment": {
    "id": "uuid",
    "dueDate": "string",
    "amount": "number"
  },
  "overdueInstallments": "number",
  "overdueAmount": "number"
}
```

#### Get Customer Financing History  
- **Endpoint**: `GET /api/customers/:id/financing-contracts`
- **Permission**: Customer (own), staff (branch), admin (all)
- **Query**: status, date range, pagination
- **Response**: Customer's financing contracts with summary data

## 8. Integration with SPEC-008 Payments

### 8.1 Payment Flow
1. Installment payment initiated via API
2. Payment request sent to SPEC-008 payment system
3. Payment processed and confirmed via SPEC-008
4. Payment allocation created linking Payment to Installment
5. Installment status and amounts updated
6. Contract status updated if all installments paid

### 8.2 Down Payment Integration
1. Down payment recorded as standard Payment via SPEC-008
2. Payment linked to financing contract (not specific installment)
3. Order balance updated to reflect down payment
4. Remaining order amount matches financing amount

### 8.3 Payment Allocation Entity
Additional entity needed to link SPEC-008 payments to installments:
```typescript
PaymentAllocation {
  id: UUID;
  paymentId: UUID; // FK to SPEC-008 Payment
  installmentId: UUID; // FK to Installment
  amount: number; // Allocated amount
  createdAt: Date;
}
```
### 8.4 Idempotency
- Payment allocation operations must be idempotent  
- Retry of allocation request should not create duplicate allocations
- Use unique payment-installment combination for deduplication
- Leverage SPEC-008 payment idempotency mechanisms

## 9. Validation Rules

### 9.1 Contract Validation
- Total amount must be positive
- Down payment must be >= 0 and <= total amount
- Number of installments must be between 1 and system maximum
- Interest rate must be >= 0
- Start date cannot be in the past
- Customer and order must exist and be accessible
- Order must not have existing active financing contract

### 9.2 Installment Payment Validation  
- Payment amount must be positive
- Payment cannot exceed installment remaining amount
- Installment must be in 'due' or 'overdue' status
- Payment allocation must sum correctly
- Contract must be in 'active' status

### 9.3 Data Type Validation (Zod)
```typescript
const FinancingContractSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string().min(1),
  customerId: z.string().uuid(),
  orderId: z.string().uuid(),
  branchId: z.string().uuid(),
  totalAmount: z.number().positive(),
  downPayment: z.number().min(0),
  numberOfInstallments: z.number().int().min(1).max(120),
  interestRate: z.number().min(0).max(100),
  startDate: z.date(),
  status: z.enum(['active', 'completed', 'defaulted', 'cancelled']),
  createdBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional()
});

const InstallmentSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  installmentNumber: z.number().int().positive(),
  dueDate: z.date(),
  amount: z.number().positive(),
  paidAmount: z.number().min(0),
  status: z.enum(['upcoming', 'due', 'paid', 'overdue']),
  paidAt: z.date().optional()
});
```

## 10. Error Handling

### 10.1 Error Codes
- `FINANCING_NOT_FOUND`: Contract does not exist or no access
- `INSTALLMENT_NOT_FOUND`: Installment does not exist or no access
- `INVALID_CONTRACT_AMOUNT`: Total amount validation failed
- `INVALID_DOWN_PAYMENT`: Down payment exceeds limits
- `INVALID_INSTALLMENT_COUNT`: Number of installments outside range
- `ORDER_ALREADY_FINANCED`: Order has existing active financing
- `CONTRACT_NOT_ACTIVE`: Operation requires active contract status
- `INSTALLMENT_ALREADY_PAID`: Cannot pay fully paid installment
- `PAYMENT_EXCEEDS_BALANCE`: Payment exceeds remaining amount
- `UNAUTHORIZED_APPROVAL`: User lacks approval permissions
- `BRANCH_ACCESS_VIOLATION`: Cross-branch access denied
- `CONCURRENT_PAYMENT_CONFLICT`: Simultaneous payment processing
- `SETTLEMENT_NOT_ALLOWED`: Early settlement not permitted
- `INVALID_FINANCING_STATUS`: Operation not allowed in current status
### 10.2 Error Response Format
```json
{
  "error": {
    "code": "PAYMENT_EXCEEDS_BALANCE",
    "message": "Payment amount exceeds installment remaining balance", 
    "details": {
      "paymentAmount": 5000,
      "remainingBalance": 3000,
      "installmentId": "uuid"
    }
  }
}
```

## 11. Business Edge Cases

### 11.1 Rounding Scenarios
- Financing amount ÷ installments yields non-integer result
- Final installment adjusted to ensure exact total
- Maximum adjustment limited to prevent customer confusion
- All calculations use DECIMAL(12,2) precision

### 11.2 Date Edge Cases  
- Start date on month-end (e.g., Jan 31) with monthly frequency
- February leap year handling for due dates
- Weekend/holiday due date adjustments (if required)
- Contract creation near month boundaries

### 11.3 Payment Edge Cases
- Overpayment exceeding single installment
- Payment received before installment due date  
- Multiple partial payments for same installment
- Concurrent payment attempts on same installment
- Network timeout during payment processing

### 11.4 Status Edge Cases
- Contract completion with outstanding refunds
- Default recovery after overdue payments received
- Cancellation with partial payments made
- Order cancellation after financing created

## 12. Concurrency & Transactions

### 12.1 Critical Sections
- Contract creation with installment generation
- Payment allocation to installment balances
- Status transitions with balance calculations
- Early settlement with multiple installment updates
- Concurrent payments on same contract

### 12.2 Transaction Boundaries
- **Contract Creation**: Single transaction for contract + all installments
- **Payment Processing**: Payment creation (SPEC-008) + allocation + installment update
- **Status Updates**: Contract status + all affected installment statuses
- **Early Settlement**: Payment + all remaining installment updates + contract completion

### 12.3 Locking Strategy
- Row-level locking on installment records during payment
- Optimistic locking with version fields for contract updates
- Deadlock prevention through consistent lock ordering
- Timeout handling with graceful failure recovery

## 13. Background Processing

### 13.1 Status Update Jobs
- **Frequency**: Daily (configurable)
- **Function**: Update installment status based on due dates
  - `upcoming` → `due` when due date reached
  - `due` → `overdue` when past due date
- **Implementation**: Batch processing with pagination
- **Error Handling**: Individual installment failures don't stop batch
- **Audit**: Log all status changes with timestamps
### 13.2 Contract Completion Detection
- **Trigger**: After each installment payment
- **Function**: Check if all installments paid, update contract status
- **Implementation**: Synchronous check during payment processing
- **Side Effects**: Contract status → `completed`, completion timestamp

### 13.3 Default Detection (Future)
- **Frequency**: Weekly (configurable)
- **Function**: Identify contracts exceeding overdue threshold
- **Implementation**: Configurable rules engine
- **Actions**: Status update, notification triggers
- **Note**: Default thresholds and actions not defined in current business rules

## 14. Search & Filtering

### 14.1 Admin Financing Search
**Contracts:**
- Contract number (exact match)
- Customer name/phone (partial match)  
- Order number (exact match)
- Motorcycle VIN (exact match)
- Branch (dropdown)
- Status (multi-select)
- Amount range
- Start date range
- Due date range

**Installments:**
- Contract number
- Customer name/phone
- Status (multi-select)
- Due date range
- Amount range
- Overdue only (checkbox)

### 14.2 Performance Requirements
- Contract search results within 2 seconds
- Installment queries support pagination
- Overdue installment queries optimized with indexes
- Customer summary calculations cached where possible

### 14.3 Sorting Options
- Contract: creation date, start date, amount, status
- Installments: due date, amount, status, payment date

## 15. Security & Privacy

### 15.1 Data Access Controls
- Customers access only their own financing data
- Branch staff limited to branch customers
- Payment details masked in audit logs
- Sensitive financial calculations server-side only

### 15.2 Branch Isolation
- Contract queries filtered by user's branch access
- Cross-branch contract access requires super_admin role
- Payment allocation respects branch boundaries
- Reporting and analytics branch-scoped

### 15.3 Audit Trail
All financing operations logged:
- Contract creation, approval, status changes
- Installment payments and allocations  
- Early settlements and cancellations
- Manual adjustments and overrides
- Status transition triggers (automatic/manual)

Audit records include:
- User ID, timestamp, branch ID
- Entity type and ID
- Previous and new values  
- Reason/notes where applicable
- IP address and session info
## 16. Acceptance Criteria

### 16.1 Core Requirements
- [ ] Financing contract can be created from confirmed order
- [ ] Installment schedule generates with correct amounts and dates
- [ ] Down payment processes through SPEC-008 payment system
- [ ] Individual installment payments allocate correctly
- [ ] Partial installment payments supported and tracked
- [ ] Contract and installment status transitions work automatically
- [ ] Early settlement pays all remaining installments
- [ ] Customer can view own financing history and balances
- [ ] Staff can search and filter financing contracts effectively

### 16.2 Financial Accuracy
- [ ] Total installment amounts equal financing amount exactly  
- [ ] Rounding adjustments preserve penny accuracy
- [ ] Payment allocations cannot exceed installment balances
- [ ] Contract balances remain consistent after all operations
- [ ] Concurrent payments don't corrupt financial data
- [ ] Early settlement calculations are accurate

### 16.3 Integration Requirements
- [ ] Down payments integrate seamlessly with SPEC-008
- [ ] Installment payments route through SPEC-008 properly
- [ ] Payment allocation links maintained correctly
- [ ] Order relationships preserved throughout lifecycle
- [ ] Customer data access follows SPEC-004 patterns
- [ ] Branch isolation enforced per SPEC-001

### 16.4 Operational Requirements
- [ ] Background jobs update installment status correctly
- [ ] Overdue installments identified automatically
- [ ] Contract completion detected and processed
- [ ] Audit trail captures all significant operations
- [ ] Performance requirements met for search and reporting
- [ ] Concurrency conflicts handled gracefully

## 17. Test Requirements

### 17.1 Unit Tests
- Contract number generation and uniqueness
- Installment schedule calculation and rounding
- Payment allocation logic and validation
- Status transition rules and triggers
- Business rule enforcement
- Edge case handling (dates, amounts, concurrency)

### 17.2 Integration Tests  
- End-to-end financing contract creation
- Payment processing through SPEC-008 integration
- Down payment and order balance updates
- Customer data access and privacy controls
- Background job processing and status updates
- Multi-user concurrent operation safety

### 17.3 Performance Tests
- Contract creation with large installment counts
- Payment processing under concurrent load
- Search and filtering with large datasets
- Customer summary calculation performance
- Background job execution times
- Database query optimization validation

### 17.4 Security Tests
- Branch isolation verification
- Customer data access controls
- Payment authorization checks
- Audit trail completeness and integrity
- Input validation and injection prevention
- Cross-domain data leakage prevention
## 18. Dependencies

### 18.1 Internal Dependencies  
- **SPEC-001**: User authentication, roles, branch scoping
- **SPEC-004**: Customer entity and access patterns
- **SPEC-005**: Order entity and lifecycle integration
- **SPEC-006**: Reservation deposit handling (optional integration)
- **SPEC-008**: Payment processing, allocation, and audit trail
- **Shared**: Database transactions and decimal arithmetic
- **Shared**: Background job scheduling infrastructure
- **Shared**: Audit logging and event system

### 18.2 External Dependencies
- Database with ACID transactions and DECIMAL support
- Background job processor (cron/scheduler)
- Optional: Notification system for due date alerts
- Optional: Reporting and analytics infrastructure

### 18.3 Future Integration Points
- **SPEC-010 Letters**: Financing agreement documents
- **SPEC-011 Reports**: Financing performance analytics  
- **SPEC-013 Accounting**: Journal entries for financing transactions
- **Credit Scoring**: External credit assessment integration
- **Collection Management**: Overdue account processing workflows

## 19. Implementation Tasks

### 19.1 Database Layer
**TASK-001: Financing Database Schema**
- **Owner**: Backend Developer
- **Dependencies**: SPEC-001, SPEC-004, SPEC-005, SPEC-008
- **Description**: Extend InstallmentPlan/Installment tables with additional fields and PaymentAllocation table
- **Acceptance Criteria**:
  - Contract and installment tables match specification
  - Proper foreign key constraints and indexes
  - Payment allocation table links to SPEC-008 payments
  - Unique constraints on contract numbers
  - Audit timestamp fields included
- **Testing**: Schema validation, constraint testing, performance indexes

**TASK-002: Contract Number Generation**  
- **Owner**: Backend Developer
- **Dependencies**: TASK-001
- **Description**: Implement thread-safe financing contract number generation
- **Acceptance Criteria**:
  - Contract numbers follow FIN-{branchCode}-{year}-{sequence} format
  - Branch-specific sequences maintained
  - Concurrent generation produces unique numbers
  - Integration with existing numbering patterns
- **Testing**: Concurrency tests, uniqueness validation

### 19.2 Shared Components
**TASK-003: Financing Type Definitions**
- **Owner**: Backend Developer  
- **Dependencies**: None
- **Description**: Create TypeScript interfaces and Zod schemas for financing entities
- **Acceptance Criteria**:
  - Complete type definitions for contracts and installments
  - Validation schemas with business rule constraints
  - Status enum definitions matching BUSINESS_RULES.md
  - Shared types exported for frontend consumption
- **Testing**: Type checking, validation schema tests

**TASK-004: Installment Calculation Engine**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003
- **Description**: Implement installment schedule generation and financial calculations
- **Acceptance Criteria**:
  - Accurate installment amount calculations with proper rounding
  - Due date generation based on frequency and start date
  - Edge case handling (month-end dates, leap years)
  - Exact total preservation across all installments
- **Testing**: Calculation accuracy tests, edge case validation
### 19.3 API Layer
**TASK-005: Contract Management API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001, TASK-002, TASK-004
- **Description**: Implement financing contract CRUD operations and lifecycle
- **Acceptance Criteria**:
  - Contract creation with installment schedule generation
  - Status management and approval workflow  
  - Branch scoping and permission enforcement
  - Search and filtering capabilities
  - Error handling and validation
- **Testing**: API integration tests, permission validation

**TASK-006: Installment Payment Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, SPEC-008
- **Description**: Integrate installment payments with SPEC-008 payment system
- **Acceptance Criteria**:
  - Payment routing through SPEC-008 APIs
  - Payment allocation to installments
  - Installment status updates after payment
  - Idempotent allocation handling
  - Balance consistency validation  
- **Testing**: Payment integration tests, allocation accuracy

**TASK-007: Status Management System**
- **Owner**: Backend Developer
- **Dependencies**: TASK-006
- **Description**: Implement automatic status transitions and background processing
- **Acceptance Criteria**:
  - Background job for status updates (upcoming→due→overdue)  
  - Contract completion detection
  - Status transition validation and logging
  - Performance optimization for batch updates
  - Error handling and recovery
- **Testing**: Background job tests, status transition validation

**TASK-008: Customer Financing API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, TASK-006
- **Description**: Implement customer-facing financing history and summary APIs
- **Acceptance Criteria**:
  - Customer financing summary calculations
  - Contract and installment history
  - Privacy controls and data filtering
  - Performance optimization for summaries
  - Branch and role-based access control
- **Testing**: Customer data access tests, performance validation

### 19.4 Integration Layer
**TASK-009: Order Integration**
- **Owner**: Backend Developer  
- **Dependencies**: TASK-005, SPEC-005
- **Description**: Integrate financing contracts with order lifecycle
- **Acceptance Criteria**:
  - Contract creation from confirmed orders
  - Order balance updates after down payment
  - Order status synchronization
  - Handle order cancellation scenarios
  - Prevent duplicate financing contracts
- **Testing**: Order lifecycle integration tests

**TASK-010: Early Settlement Processing**
- **Owner**: Backend Developer
- **Dependencies**: TASK-006, TASK-008
- **Description**: Implement early settlement and contract completion
- **Acceptance Criteria**:
  - Calculate remaining balance for early settlement
  - Process settlement payment through SPEC-008
  - Update all remaining installments to paid
  - Complete contract and trigger completion workflow
  - Handle partial settlement scenarios
- **Testing**: Settlement calculation tests, completion workflow validation

**TASK-011: Concurrency & Transaction Safety**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, TASK-006, TASK-007
- **Description**: Implement database transactions and concurrency controls
- **Acceptance Criteria**:
  - ACID transaction boundaries for critical operations
  - Optimistic locking for financial updates
  - Deadlock prevention and recovery
  - Concurrent payment handling
  - Data consistency validation
- **Testing**: Concurrency stress tests, transaction rollback tests
### 19.5 User Interface Layer  
**TASK-012: Admin Financing Management**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-005, TASK-008
- **Description**: Build admin dashboard for financing contract management
- **Acceptance Criteria**:
  - Contract listing with search and filtering
  - Contract detail view with installment schedule
  - Approval workflow interface
  - Status management controls
  - Payment history and allocation views
  - Responsive design for tablet/desktop
- **Testing**: UI component tests, workflow validation

**TASK-013: Admin Installment Management**  
- **Owner**: Frontend Developer
- **Dependencies**: TASK-006, TASK-007
- **Description**: Build interfaces for installment payment and overdue management
- **Acceptance Criteria**:
  - Installment payment recording interface
  - Overdue installment dashboard
  - Payment allocation management
  - Early settlement processing
  - Real-time status updates
  - Bulk operations for overdue processing
- **Testing**: Payment interface tests, bulk operation validation

**TASK-014: POS Financing Integration**
- **Owner**: Desktop Developer
- **Dependencies**: TASK-005, TASK-006, SPEC-007
- **Description**: Integrate financing creation and payment into POS application
- **Acceptance Criteria**:
  - Financing contract creation from POS orders
  - Down payment processing integration
  - Installment payment recording
  - Customer financing summary display
  - Offline operation handling
  - Receipt printing for financing transactions
- **Testing**: POS integration tests, offline handling validation

**TASK-015: Customer Financing Portal**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-008
- **Description**: Build customer-facing financing account management
- **Acceptance Criteria**:
  - Financing contract listing and details
  - Installment schedule and payment history
  - Payment status tracking
  - Early settlement request (if permitted)
  - Responsive mobile design
  - Privacy compliance and secure access
- **Testing**: Customer access tests, mobile responsiveness validation

### 19.6 Testing & Quality Assurance
**TASK-016: Financing Integration Tests**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005 through TASK-011
- **Description**: Comprehensive integration testing for financing domain
- **Acceptance Criteria**:  
  - End-to-end financing workflows tested
  - Payment system integration validated
  - Background job processing verified
  - Performance benchmarks established
  - Error scenarios and recovery tested
  - Data integrity validation across operations
- **Testing**: Full test suite execution, performance benchmarking

## 20. Future Extensions

### 20.1 Advanced Features
- **Variable Interest Rates**: Support for rate changes over time
- **Payment Holidays**: Temporary payment deferrals
- **Refinancing**: Contract modification and restructuring
- **Multiple Payment Methods**: Split payments across methods
- **Automatic Payments**: Recurring payment setup
- **Late Fees**: Configurable penalty calculations

### 20.2 Integration Opportunities  
- **Credit Bureau Integration**: Automated credit checks
- **Payment Gateway Integration**: Direct bank payment processing
- **SMS/Email Notifications**: Due date and overdue alerts
- **Collection Management**: Automated overdue workflows
- **Financial Reporting**: Advanced analytics and forecasting
- **Document Generation**: Contract and statement printing
## 21. Summary

SPEC-009 defines a comprehensive Installments & Financing domain enabling motorcycle purchase through structured payment plans with seamless integration to the existing payment infrastructure.

### 21.1 Core Capabilities
- **Contract Management**: Creation, approval, and lifecycle management
- **Installment Scheduling**: Automated schedule generation with accurate calculations
- **Payment Integration**: Seamless routing through SPEC-008 payment system  
- **Status Automation**: Background processing for due dates and overdue detection
- **Customer Service**: Self-service portal and comprehensive payment history
- **Admin Controls**: Full oversight with search, filtering, and management tools

### 21.2 Financing Lifecycle
`active` → `completed` (all paid) / `defaulted` (threshold exceeded) / `cancelled` (early settlement)

### 21.3 Installment Lifecycle
`upcoming` → `due` → `paid` / `overdue` → `paid`

### 21.4 Payment Integration
Financing payments flow through SPEC-008 with allocation tracking:
1. Installment payment initiated
2. Payment processed via SPEC-008  
3. Payment allocated to installment
4. Installment status updated
5. Contract status evaluated

### 21.5 Key Technical Decisions
- Contract numbering: FIN-{branchCode}-{year}-{sequence}
- DECIMAL(12,2) arithmetic for financial accuracy
- Payment allocation entity linking SPEC-008 payments to installments
- Background job processing for status transitions
- Branch-scoped access with role-based permissions
- Comprehensive audit trail for all operations

### 21.6 Implementation Tasks Summary
**16 atomic tasks** organized across:
- **Database Layer**: Schema, numbering (2 tasks)
- **Shared Components**: Types, calculations (2 tasks)
- **API Layer**: Contracts, payments, status, customer APIs (4 tasks)  
- **Integration Layer**: Orders, settlements, concurrency (3 tasks)
- **UI Layer**: Admin, POS, customer interfaces (3 tasks)
- **Testing**: Integration and quality assurance (1 task)

### 21.7 Dependencies  
- SPEC-001 (Authentication), SPEC-004 (Customers), SPEC-005 (Orders), SPEC-008 (Payments)
- Database with ACID transactions and decimal support
- Background job scheduling system
- Optional notification infrastructure

### 21.8 Downstream Features
- **SPEC-010 Letters**: Financing agreement document generation
- **SPEC-011 Reports**: Financing performance and overdue analytics  
- **SPEC-013 Accounting**: Financial journal entries and reconciliation
- **Credit Management**: Advanced scoring and collection workflows

### 21.9 Next Recommended Specification
**SPEC-010: Letters & Document Management** - Building on the order and financing infrastructure to support receipt generation, delivery confirmation, and document tracking workflows.