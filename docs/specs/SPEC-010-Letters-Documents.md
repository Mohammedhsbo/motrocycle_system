# SPEC-010: Letters & Document Management

**Feature Goal:** Implement comprehensive letter and document management for motorcycle delivery confirmation, enabling clear tracking of handover status and receipt confirmation workflows.

**Priority:** P0 (Core MVP - Required for order completion and delivery tracking)

**Dependencies:**
- SPEC-001 (Authentication & Roles)
- SPEC-002 (Motorcycles)
- SPEC-004 (Customers)
- SPEC-005 (Orders)
- SPEC-006 (Reservations)
- SPEC-008 (Invoices & Payments)
- SPEC-009 (Installments & Financing)

**Applications:**
- E-commerce Website: Customer letter status and document access
- Admin Dashboard: Letter management and oversight
- Desktop POS: Primary letter workflow for cashiers and reception staff

## 1. Scope

This specification covers:
- Letter creation and lifecycle management
- Motorcycle delivery confirmation workflow
- Receipt status tracking (issued vs. actually received)
- Document generation and storage
- Letter search and filtering for operational staff
- Integration with orders, reservations, and financial domains
- Branch-scoped letter management
- Complete audit trail for delivery processes

This specification **does NOT** cover:
- Order processing (SPEC-005)
- Payment processing (SPEC-008)
- Installment management (SPEC-009)  
- Document signing/e-signature platforms
- Notification infrastructure
- Report generation and analytics
- Physical document printing drivers

## 2. User Roles

**Customer:**
- View own letter status and documents
- Download delivery documents
- View motorcycle handover status

**Cashier/Reception (cashier):**
- Create letters manually if needed
- View pending receipt letters (primary workflow)
- Confirm motorcycle receipt from customers
- Search and filter letters
- Generate and print documents

**Sales Staff (sales_staff):**
- View branch letters
- Confirm motorcycle receipt
- Access letter details and history

**Branch Admin (branch_admin):**
- Full letter management within branch
- Cancel letters when permitted
- Override letter status if needed
- Access letter audit history

**Super Admin (super_admin):**
- Full access to all letters across branches
- System-wide letter management
- Configure letter parameters
## 3. Functional Requirements

### 3.1 Letter Creation
- Auto-create letter when order reaches `awaiting_delivery` status
- Manual letter creation by authorized staff
- Link letter to customer, motorcycle, and transaction (order/reservation)
- Generate unique letter number per branch
- Set default letter type and initial status
- Record creating user and timestamp

### 3.2 Letter Lifecycle Management
- Track letter status transitions per business rules
- Distinguish between "letter issued" and "customer received motorcycle"
- Support manual recording of non-receipt by staff
- Enable receipt confirmation when customer actually receives motorcycle
- Maintain complete status history with timestamps and actors

### 3.3 Unreceived Letter Tracking
- Identify letters in `issued` or `not_received` status
- Calculate days pending since issue date
- Display clear indicators for pending motorcycle receipts
- Filter and sort by pending status
- Alert staff to long-pending deliveries

### 3.4 Receipt Confirmation Workflow
- Authorize receipt confirmation to designated roles only
- Record actual receipt timestamp and confirming employee
- Prevent duplicate receipt confirmations
- Update letter status to `received`
- Trigger downstream order completion if applicable

### 3.5 Document Generation and Storage
- Generate printable delivery documents with letter details
- Include customer, motorcycle, and transaction information
- Store generated documents securely with access controls
- Support document versioning and regeneration
- Maintain document metadata and creation history

## 4. Data Model Requirements

### 4.1 Letter Entity
From DATABASE_DESIGN.md Letter table:
- id (UUID, primary key)
- letterNumber (VARCHAR(30), unique)
- customerId (UUID, foreign key to Customer)
- motorcycleId (UUID, foreign key to Motorcycle)
- orderId (UUID, foreign key to Order, nullable)
- reservationId (UUID, foreign key to Reservation, nullable)
- type (VARCHAR(20))
- status (VARCHAR(20), default 'issued')
- issuedAt (TIMESTAMP)
- confirmedAt (TIMESTAMP, nullable)
- userId (UUID, foreign key to User - creator)
- notes (TEXT)
- createdAt/updatedAt timestamps

Additional fields needed:
- branchId (UUID, foreign key to Branch)
- confirmedBy (UUID, foreign key to User, nullable)
- expectedDeliveryDate (DATE, nullable)
- documentStorageRef (VARCHAR(255), nullable)

### 4.2 Letter Document Entity
- id (UUID, primary key)
- letterId (UUID, foreign key to Letter)
- documentType (VARCHAR(50)) // 'delivery', 'receipt', etc.
- fileName (VARCHAR(255))
- fileSize (INTEGER)
- mimeType (VARCHAR(100))
- storageRef (VARCHAR(500)) // S3 key or file path
- version (INTEGER, default 1)
- createdBy (UUID, foreign key to User)
- createdAt (TIMESTAMP)

### 4.3 Letter History Entity
- id (UUID, primary key)
- letterId (UUID, foreign key to Letter)
- action (VARCHAR(50)) // 'created', 'issued', 'confirmed', 'cancelled'
- fromStatus (VARCHAR(20), nullable)
- toStatus (VARCHAR(20), nullable)
- actorId (UUID, foreign key to User)
- reason (VARCHAR(500), nullable)
- notes (TEXT, nullable)
- createdAt (TIMESTAMP)
### 4.4 Status Enums (from BUSINESS_RULES.md)

**Letter Status:**
- `issued`: Letter created and issued, awaiting receipt
- `received`: Customer confirmed receipt of motorcycle
- `not_received`: Explicitly recorded as not received

**Letter Type:**
- `receipt`: Customer receiving motorcycle document
- `delivery`: Motorcycle delivery confirmation document

### 4.5 Relationships
- Letter → Customer (many-to-one)
- Letter → Motorcycle (many-to-one)
- Letter → Order (many-to-one, nullable)
- Letter → Reservation (many-to-one, nullable)
- Letter → Branch (many-to-one)
- Letter → User (created_by, confirmed_by)
- LetterDocument → Letter (many-to-one)
- LetterHistory → Letter (many-to-one)
- LetterHistory → User (actor)

## 5. Business Rules

### 5.1 Status Transitions (from BUSINESS_RULES.md)

**Letter Status Flow:**
```
issued → received (customer confirms receipt)
issued → not_received (employee records non-receipt)
not_received → received (issue resolved)
```

### 5.2 Letter Creation Rules
- Auto-creation triggered when order status becomes `awaiting_delivery`
- Manual creation allowed by authorized roles (cashier+)
- Letter number format: LTR-{branchCode}-{year}-{sequence}
- Each letter must link to valid customer and motorcycle
- Order or reservation reference required where applicable
- Default type based on transaction context

### 5.3 Receipt Confirmation Rules
- Only authorized roles can confirm receipt (cashier+)
- Receipt confirmation requires letter in `issued` or `not_received` status
- Confirmation timestamp recorded with confirming user
- Once `received`, status cannot be reversed
- Receipt confirmation may trigger order completion
- Duplicate confirmations prevented by system design

### 5.4 Document Generation Rules
- Documents generated on-demand with current letter data
- Historical document versions preserved when regenerated
- Document access limited by letter access permissions
- Generated documents stored securely with metadata
- Document generation failures logged and recoverable

### 5.5 Branch Scoping Rules
- Letters belong to the branch where they were created
- Staff can only access letters from their assigned branches
- Super admin can access all branches
- Letter numbering sequences maintained per branch
- Cross-branch letter transfers not supported

## 6. RBAC & Permissions

Using roles from SPEC-001 Authentication:

**View Letters:**
- Customer: Own letters only
- cashier: Branch letters only
- sales_staff: Branch letters only
- branch_admin: Branch letters only
- accountant: Branch letters (read-only)
- super_admin: All letters

**Create Letters:**
- cashier: Within branch
- sales_staff: Within branch  
- branch_admin: Within branch
- super_admin: Any branch

**Confirm Receipt:**
- cashier: Branch letters
- sales_staff: Branch letters
- branch_admin: Branch letters
- super_admin: All letters

**Cancel Letters:**
- branch_admin: Branch letters only
- super_admin: All letters

**Generate Documents:**
- cashier: Branch letters
- sales_staff: Branch letters
- branch_admin: Branch letters
- super_admin: All letters

**View Audit History:**
- branch_admin: Branch letters only
- super_admin: All letters
## 7. API Endpoints

### 7.1 Letter Management API

#### Create Letter
- **Endpoint**: `POST /api/letters`
- **Permission**: `cashier`, `sales_staff`, `branch_admin`, `super_admin`
- **Request**:
```json
{
  "customerId": "uuid",
  "motorcycleId": "uuid",
  "orderId": "uuid?",
  "reservationId": "uuid?",
  "type": "receipt|delivery",
  "expectedDeliveryDate": "string (ISO date)?",
  "notes": "string?"
}
```
- **Response**: Created letter with generated number and initial status

#### List Letters
- **Endpoint**: `GET /api/letters`
- **Permission**: Role-based branch filtering
- **Query**: customer, motorcycle, status, type, date range, pending only, pagination
- **Response**: Paginated letter list with summary data

#### Get Letter Details
- **Endpoint**: `GET /api/letters/:id`
- **Permission**: Role-based access control
- **Response**: Full letter details with customer, motorcycle, and transaction info

#### Update Letter
- **Endpoint**: `PATCH /api/letters/:id`
- **Permission**: `branch_admin`, `super_admin`
- **Request**: Updatable fields (notes, expected delivery date)
- **Response**: Updated letter

### 7.2 Letter Status API

#### Confirm Receipt
- **Endpoint**: `PATCH /api/letters/:id/confirm-receipt`
- **Permission**: `cashier`, `sales_staff`, `branch_admin`, `super_admin`
- **Request**: 
```json
{
  "confirmedAt": "string (ISO datetime)",
  "notes": "string?"
}
```
- **Response**: Letter with updated status and confirmation details

#### Record Non-Receipt
- **Endpoint**: `PATCH /api/letters/:id/record-non-receipt`
- **Permission**: `cashier`, `sales_staff`, `branch_admin`, `super_admin`
- **Request**: 
```json
{
  "reason": "string",
  "notes": "string?"
}
```
- **Response**: Letter with `not_received` status

#### Cancel Letter
- **Endpoint**: `PATCH /api/letters/:id/cancel`
- **Permission**: `branch_admin`, `super_admin`
- **Request**: Cancellation reason and notes
- **Response**: Cancelled letter status

### 7.3 Document Management API

#### Generate Document
- **Endpoint**: `POST /api/letters/:id/documents`
- **Permission**: Role-based letter access
- **Request**:
```json
{
  "documentType": "delivery|receipt",
  "regenerate": "boolean?"
}
```
- **Response**: Document metadata with download URL

#### Get Document
- **Endpoint**: `GET /api/letters/:id/documents/:documentId`
- **Permission**: Role-based letter access
- **Response**: Document file download

#### List Letter Documents
- **Endpoint**: `GET /api/letters/:id/documents`
- **Permission**: Role-based letter access
- **Response**: List of documents with metadata

### 7.4 History and Audit API

#### Get Letter History
- **Endpoint**: `GET /api/letters/:id/history`
- **Permission**: `branch_admin`, `super_admin` (+ branch scoping)
- **Response**: Complete letter history with actor details

#### Search Letters
- **Endpoint**: `GET /api/letters/search`
- **Permission**: Role-based branch filtering
- **Query**: letter number, customer name/phone, VIN, order number, status
- **Response**: Matching letters with summary data
### 7.5 Customer Letter API

#### Get Customer Letters
- **Endpoint**: `GET /api/customers/:id/letters`
- **Permission**: Customer (own), staff (branch), admin (all)
- **Query**: status, type, date range, pagination
- **Response**: Customer's letters with status and document access

## 8. Integration Requirements

### 8.1 Order Integration
- Auto-create letter when order status transitions to `awaiting_delivery`
- Letter receipt confirmation may trigger order completion
- Display order details in letter information
- Handle order cancellation scenarios with existing letters

### 8.2 Reservation Integration  
- Support letters for reservation-based transactions
- Link reservation payments and deposits to letter context
- Handle reservation-to-order conversion with letter continuity

### 8.3 Financial Integration (SPEC-008/SPEC-009)
- Display payment status and remaining balances in letter details
- Show installment information for financed purchases
- Access invoice and payment history through letter context
- No duplicate financial calculations or data storage

### 8.4 Motorcycle Integration
- Display complete motorcycle details (brand, model, VIN, etc.)
- Show motorcycle status and availability
- Link to motorcycle history and previous letters

### 8.5 Customer Integration
- Display customer contact information and addresses
- Access customer purchase history through letter context
- Support customer authentication for own letter access

## 9. Critical Business Workflow

### 9.1 Pending Receipt Identification
The system must clearly identify letters where:
- Letter status is `issued` or `not_received`
- Customer has NOT actually received the motorcycle
- Days since issue date exceed thresholds

**Desktop App Requirements:**
- Prominent "Pending Receipts" section or filter
- Clear visual indicators for overdue deliveries  
- Quick access to confirm receipt action
- Display customer contact information for follow-up

### 9.2 Receipt Confirmation Process
1. Customer arrives to collect motorcycle
2. Staff searches for customer letter (by name, phone, or VIN)
3. System displays letter details and pending status
4. Staff verifies customer identity and motorcycle details
5. Staff confirms actual motorcycle handover
6. System updates letter status to `received`
7. Order completion may be triggered automatically
8. Receipt confirmation logged in audit trail

### 9.3 Non-Receipt Recording
1. Staff determines customer has not received motorcycle
2. Staff records non-receipt with reason
3. System updates letter status to `not_received`  
4. Status remains visible in pending receipts list
5. Follow-up actions can be taken
6. Later receipt confirmation still possible

## 10. Validation Rules

### 10.1 Letter Creation Validation
- Customer must exist and be accessible to user
- Motorcycle must exist and be accessible to user
- Order/reservation reference must be valid if provided
- Letter type must be valid enum value
- Expected delivery date cannot be in the past
- User must have permission for target branch

### 10.2 Status Transition Validation
- Receipt confirmation requires `issued` or `not_received` status
- Non-receipt recording requires `issued` status
- Cancelled letters cannot be confirmed or updated
- Status transitions must follow business rules exactly
- Only authorized users can perform status changes

### 10.3 Document Generation Validation
- Letter must exist and be accessible to user
- Document type must be supported
- Storage system must be available
- Previous document versions handled correctly
- File size and format constraints enforced
### 10.4 Data Type Validation (Zod)
```typescript
const LetterSchema = z.object({
  id: z.string().uuid(),
  letterNumber: z.string().min(1),
  customerId: z.string().uuid(),
  motorcycleId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
  branchId: z.string().uuid(),
  type: z.enum(['receipt', 'delivery']),
  status: z.enum(['issued', 'received', 'not_received']),
  issuedAt: z.date(),
  confirmedAt: z.date().optional(),
  expectedDeliveryDate: z.date().optional(),
  userId: z.string().uuid(),
  confirmedBy: z.string().uuid().optional(),
  notes: z.string().optional()
});

const LetterDocumentSchema = z.object({
  id: z.string().uuid(),
  letterId: z.string().uuid(),
  documentType: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  storageRef: z.string().min(1),
  version: z.number().int().positive(),
  createdBy: z.string().uuid()
});
```

## 11. Error Handling

### 11.1 Error Codes
- `LETTER_NOT_FOUND`: Letter does not exist or no access
- `CUSTOMER_NOT_FOUND`: Referenced customer does not exist
- `MOTORCYCLE_NOT_FOUND`: Referenced motorcycle does not exist
- `ORDER_NOT_FOUND`: Referenced order does not exist
- `INVALID_LETTER_STATUS`: Operation not allowed in current status
- `ALREADY_CONFIRMED`: Letter receipt already confirmed
- `ALREADY_CANCELLED`: Letter is cancelled, operation not allowed
- `UNAUTHORIZED_CONFIRMATION`: User lacks receipt confirmation permission
- `BRANCH_ACCESS_VIOLATION`: Cross-branch access denied
- `DOCUMENT_GENERATION_FAILED`: Unable to generate document
- `DOCUMENT_NOT_FOUND`: Referenced document does not exist
- `STORAGE_ERROR`: Document storage operation failed
- `INVALID_STATUS_TRANSITION`: Status change violates business rules
- `CONCURRENT_UPDATE_CONFLICT`: Simultaneous status change detected
- `DUPLICATE_LETTER_NUMBER`: Letter number already exists

### 11.2 Error Response Format
```json
{
  "error": {
    "code": "INVALID_LETTER_STATUS", 
    "message": "Cannot confirm receipt of cancelled letter",
    "details": {
      "letterId": "uuid",
      "currentStatus": "cancelled",
      "requestedOperation": "confirm_receipt"
    }
  }
}
```

## 12. Concurrency & Transactions

### 12.1 Critical Sections
- Receipt confirmation with status updates
- Document generation and storage
- Letter number generation
- Status transitions with audit logging
- Concurrent receipt confirmations

### 12.2 Transaction Boundaries
- **Receipt Confirmation**: Status update + history record + order completion trigger
- **Letter Creation**: Letter creation + number generation + initial history
- **Document Generation**: Document creation + storage + metadata update
- **Status Transitions**: Status change + history logging + downstream notifications

### 12.3 Idempotency Requirements
- Receipt confirmation must be idempotent (retry-safe)
- Document generation retries should not create duplicates
- Letter creation with same parameters should detect duplicates
- Status transition retries should handle gracefully

### 12.4 Locking Strategy
- Optimistic locking for letter updates with version fields
- Row-level locking for receipt confirmation operations
- Unique constraints prevent duplicate letter numbers
- Database transactions ensure consistency
## 13. Document Management

### 13.1 Document Storage
- Use S3-compatible storage for document files
- Store metadata and references in database
- Implement secure document URLs with time-limited access
- Support multiple document versions per letter
- Maintain document creation audit trail

### 13.2 Document Content
Generated documents must include:

**Header Section:**
- Company/dealership information
- Letter number and date
- Document type and purpose

**Customer Information:**
- Customer name and contact details
- Customer ID and address
- Identification references

**Motorcycle Information:**
- Brand, model, year, color
- VIN and stock number
- Motorcycle specifications
- Current status

**Transaction Details:**
- Order number and date
- Reservation reference (if applicable)
- Invoice number and payment status
- Financing contract details (if applicable)

**Delivery Information:**
- Expected delivery date
- Actual delivery date (when confirmed)
- Delivery location or pickup details
- Special instructions or notes

**Legal Section:**
- Handover acknowledgement statement
- Customer signature area
- Employee signature area  
- Date and witness fields
- Terms and conditions reference

### 13.3 Document Versioning
- Maintain version numbers for regenerated documents
- Preserve historical document versions
- Track regeneration reasons and actors
- Prevent silent document replacements
- Provide version history access

### 13.4 Document Security
- Authenticate all document access requests
- Apply role-based document permissions
- Generate temporary URLs for secure access
- Log all document access attempts
- Encrypt documents at rest where required

## 14. Search & Filtering

### 14.1 Desktop App Search (Primary Workflow)
**Quick Search Bar:**
- Letter number (exact match)
- Customer name (partial match)
- Customer phone (partial match)
- Motorcycle VIN (exact match)
- Order number (exact match)

**Advanced Filters:**
- Status (multi-select: issued, received, not_received)
- Type (receipt, delivery)
- Date range (created, issued, confirmed)
- Days pending (overdue thresholds)
- Branch (if cross-branch access)
- Motorcycle brand/model

### 14.2 Performance Requirements
- Letter search results within 1 second
- Pending receipt filters optimized for real-time use
- Support pagination for large result sets
- Database indexes on common search fields
- Cached customer and motorcycle summary data

### 14.3 Sorting Options
- Issue date (newest/oldest first)
- Confirmation date
- Days pending (highest priority first)
- Customer name (alphabetical)
- Letter number (sequential)

## 15. Real-Time Features

### 15.1 Status Updates
If Socket.IO is available, broadcast letter events:
- `letter.created` - New letter issued
- `letter.confirmed` - Receipt confirmed
- `letter.not_received` - Non-receipt recorded
- `letter.cancelled` - Letter cancelled

### 15.2 Event Payloads
```json
{
  "type": "letter.confirmed",
  "data": {
    "letterId": "uuid",
    "letterNumber": "LTR-001-2024-0001", 
    "customerId": "uuid",
    "motorcycleId": "uuid",
    "confirmedBy": "uuid",
    "confirmedAt": "2024-01-15T14:30:00Z"
  },
  "branch": "uuid"
}
```

### 15.3 Audience & Authorization
- Events scoped to relevant branch users
- Customer events limited to own letters
- Admin events include cross-branch where permitted
- Real-time updates for pending receipt dashboards
## 16. Acceptance Criteria

### 16.1 Core Requirements
- [ ] Letters auto-created when orders reach `awaiting_delivery` status
- [ ] Manual letter creation by authorized staff members
- [ ] Clear distinction between "letter issued" and "customer received"
- [ ] Pending receipt letters prominently displayed in Desktop App
- [ ] Receipt confirmation updates letter status appropriately
- [ ] Non-receipt status can be recorded with reasons
- [ ] Letter details show complete customer and motorcycle information
- [ ] Financial information integrated from appropriate domains

### 16.2 Workflow Requirements
- [ ] Cashier can quickly identify unreceived motorcycles
- [ ] Search functionality finds letters by multiple criteria
- [ ] Receipt confirmation workflow is intuitive and secure
- [ ] Days pending calculation alerts staff to overdue deliveries
- [ ] Letter history maintains complete audit trail
- [ ] Document generation produces complete delivery documents

### 16.3 Integration Requirements
- [ ] Order completion triggered by letter receipt confirmation
- [ ] Reservation letters maintain transaction continuity
- [ ] Financial data displays current payment and installment status
- [ ] Motorcycle details reflect current status and specifications
- [ ] Customer data access follows privacy and branch scoping rules

### 16.4 Technical Requirements
- [ ] Concurrent receipt confirmations handled safely
- [ ] Document storage and retrieval performs reliably
- [ ] Letter numbering generates unique sequential numbers
- [ ] Branch isolation enforced across all operations
- [ ] Real-time updates reflect in relevant user interfaces
- [ ] System performance meets search and display requirements

## 17. Test Requirements

### 17.1 Unit Tests
- Letter number generation and uniqueness
- Status transition validation and rules
- Receipt confirmation logic
- Document generation and versioning
- Business rule enforcement
- Branch scoping and access controls

### 17.2 Integration Tests
- Order-to-letter workflow integration
- Letter receipt to order completion flow
- Financial data display accuracy
- Customer and motorcycle data integration
- Document storage and retrieval
- Real-time event broadcasting

### 17.3 Workflow Tests
- End-to-end letter creation and confirmation
- Pending receipt identification and processing
- Search and filtering functionality
- Document generation and access
- Multi-user concurrent receipt confirmation
- Cross-branch access control validation

### 17.4 Performance Tests
- Letter search response times under load
- Document generation and storage performance
- Large dataset pagination and filtering
- Concurrent user operations
- Database query optimization
- Real-time event delivery latency

## 18. Security & Privacy

### 18.1 Data Access Controls
- Customers access only their own letters and documents
- Branch staff limited to branch letters
- Financial information masked based on role permissions
- Document access requires proper authentication
- Audit trails protected from unauthorized modification

### 18.2 Document Security
- Generated documents stored with access controls
- Temporary URLs for secure document download
- Document versioning prevents unauthorized changes
- File type and size validation prevents abuse
- Encryption at rest for sensitive documents

### 18.3 Branch Isolation
- Letter queries filtered by user branch access
- Cross-branch letter access requires super_admin role
- Letter creation limited to user's assigned branches
- Document generation respects branch boundaries
- Audit logs maintain branch attribution
## 19. Dependencies

### 19.1 Internal Dependencies
- **SPEC-001**: User authentication, roles, branch scoping
- **SPEC-002**: Motorcycle entity and specifications
- **SPEC-004**: Customer entity and contact information
- **SPEC-005**: Order entity and lifecycle integration
- **SPEC-006**: Reservation entity and transaction history
- **SPEC-008**: Financial data display (payments, invoices)
- **SPEC-009**: Financing information display (installments)
- **Shared**: Database transactions and audit logging
- **Shared**: Document storage system (S3-compatible)
- **Shared**: Real-time event system (Socket.IO)

### 19.2 External Dependencies
- Database system with ACID transactions
- S3-compatible object storage for documents
- Document generation library (PDF/HTML)
- Optional: Notification system for delivery alerts
- Optional: Printing subsystem for physical documents

### 19.3 Future Integration Points
- **SPEC-011 Reports**: Letter and delivery analytics
- **SPEC-012 Notifications**: Delivery alerts and reminders
- **Digital Signatures**: Electronic document signing
- **Customer Portal**: Enhanced delivery tracking
- **Mobile Apps**: Delivery confirmation on mobile devices

## 20. Implementation Tasks

### 20.1 Database Layer
**TASK-001: Letters Database Schema**
- **Owner**: Backend Developer
- **Dependencies**: SPEC-001, SPEC-002, SPEC-004, SPEC-005, SPEC-006
- **Description**: Create Letter, LetterDocument, LetterHistory tables with proper indexes
- **Acceptance Criteria**:
  - All tables created with relationships and constraints
  - Unique constraints on letter numbers
  - Indexes on common query patterns (status, customer, motorcycle)
  - Foreign key constraints to referenced entities
  - Audit timestamp fields included
- **Testing**: Schema validation, constraint testing, index performance

**TASK-002: Letter Number Generation**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001
- **Description**: Implement thread-safe letter number generation
- **Acceptance Criteria**:
  - Letter numbers follow LTR-{branchCode}-{year}-{sequence} format
  - Branch-specific sequences maintained
  - Concurrent generation produces unique numbers
  - Integration with existing numbering patterns
- **Testing**: Concurrency tests, uniqueness validation

### 20.2 Shared Components  
**TASK-003: Letter Type Definitions**
- **Owner**: Backend Developer
- **Dependencies**: None
- **Description**: Create TypeScript interfaces and Zod schemas for letter entities
- **Acceptance Criteria**:
  - Complete type definitions for letters and documents
  - Validation schemas with business rule constraints
  - Status and type enum definitions
  - Shared types exported for frontend consumption
- **Testing**: Type checking, validation schema tests

**TASK-004: Document Generation Engine**
- **Owner**: Backend Developer
- **Dependencies**: TASK-003
- **Description**: Implement document generation and storage system
- **Acceptance Criteria**:
  - Generate PDF/HTML documents with letter content
  - Template system for different document types
  - S3 storage integration with metadata tracking
  - Document versioning and regeneration support
- **Testing**: Document generation tests, storage integration tests

### 20.3 API Layer
**TASK-005: Letter Management API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-001, TASK-002, TASK-004
- **Description**: Implement letter CRUD operations and lifecycle management
- **Acceptance Criteria**:
  - Letter creation with auto-numbering
  - Status management and transition validation
  - Integration with orders and reservations
  - Branch scoping and permission enforcement
  - Complete error handling and validation
- **Testing**: API integration tests, permission validation

**TASK-006: Letter Status & Workflow API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005
- **Description**: Implement receipt confirmation and status management
- **Acceptance Criteria**:
  - Receipt confirmation with idempotency
  - Non-receipt recording with audit trail
  - Status transition validation
  - History tracking for all status changes
  - Concurrent operation safety
- **Testing**: Workflow tests, idempotency validation
**TASK-007: Letter Search & Filtering API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005
- **Description**: Implement comprehensive search and filtering capabilities
- **Acceptance Criteria**:
  - Multi-criteria search (customer, VIN, order, etc.)
  - Advanced filtering with status and date ranges
  - Performance optimized queries with proper indexing
  - Pagination and sorting support
  - Branch-scoped result filtering
- **Testing**: Search performance tests, filter accuracy validation

**TASK-008: Document Management API**
- **Owner**: Backend Developer
- **Dependencies**: TASK-004, TASK-005
- **Description**: Implement document generation, storage, and retrieval APIs
- **Acceptance Criteria**:
  - Document generation with versioning support
  - Secure document storage and retrieval
  - Access control for document downloads
  - Document metadata management
  - Error handling for storage failures
- **Testing**: Document API tests, access control validation

### 20.4 Integration Layer
**TASK-009: Order Lifecycle Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-006, SPEC-005
- **Description**: Integrate letter workflow with order lifecycle
- **Acceptance Criteria**:
  - Auto-create letters when orders reach `awaiting_delivery`
  - Receipt confirmation triggers order completion
  - Handle order cancellation with existing letters
  - Maintain order-letter relationship consistency
  - Support reservation-to-order letter continuity
- **Testing**: Order integration tests, lifecycle validation

**TASK-010: Financial Data Integration**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, SPEC-008, SPEC-009
- **Description**: Integrate financial information display in letter details
- **Acceptance Criteria**:
  - Display payment status and remaining balances
  - Show installment information for financed purchases
  - Access invoice and payment history
  - No duplication of financial calculations
  - Real-time financial status updates
- **Testing**: Financial integration tests, data consistency validation

**TASK-011: Concurrency & Transaction Safety**
- **Owner**: Backend Developer
- **Dependencies**: TASK-005, TASK-006, TASK-008
- **Description**: Implement database transactions and concurrency controls
- **Acceptance Criteria**:
  - ACID transaction boundaries for critical operations
  - Optimistic locking for letter updates
  - Idempotent receipt confirmation handling
  - Concurrent operation validation
  - Deadlock prevention and recovery
- **Testing**: Concurrency stress tests, transaction rollback validation

### 20.5 User Interface Layer
**TASK-012: Admin Letter Management**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-005, TASK-007
- **Description**: Build admin dashboard for letter management and oversight
- **Acceptance Criteria**:
  - Letter listing with search and filtering
  - Letter detail view with complete information
  - Status management controls
  - Document generation and download
  - Audit history display
  - Responsive design for tablet/desktop
- **Testing**: UI component tests, admin workflow validation

**TASK-013: Desktop Letters Workflow**
- **Owner**: Desktop Developer
- **Dependencies**: TASK-005, TASK-006, TASK-007
- **Description**: Build primary letters workflow for Desktop POS
- **Acceptance Criteria**:
  - Prominent pending receipts dashboard
  - Quick search and filtering interface
  - Clear visual indicators for overdue deliveries
  - Receipt confirmation workflow
  - Print/download document capabilities
  - Arabic/English RTL/LTR support
- **Testing**: Desktop workflow tests, UX validation

**TASK-014: Letter Details Integration**
- **Owner**: Desktop Developer
- **Dependencies**: TASK-010, TASK-013
- **Description**: Integrate complete customer, motorcycle, and financial information
- **Acceptance Criteria**:
  - Comprehensive letter detail display
  - Customer contact and identification information
  - Motorcycle specifications and status
  - Order and transaction details
  - Financial summary with payment status
  - Historical letter information
- **Testing**: Data integration tests, display accuracy validation

**TASK-015: Document Generation & Print**
- **Owner**: Desktop Developer
- **Dependencies**: TASK-008, TASK-013
- **Description**: Implement document generation and printing capabilities
- **Acceptance Criteria**:
  - Generate documents from letter data
  - Preview generated documents
  - Print documents using system printer
  - Download documents for sharing
  - Handle print queue and offline scenarios
- **Testing**: Document generation tests, print functionality validation

**TASK-016: Customer Letter Portal**
- **Owner**: Frontend Developer
- **Dependencies**: TASK-005, TASK-008
- **Description**: Build customer-facing letter status and document access
- **Acceptance Criteria**:
  - Customer letter listing with status
  - Letter detail view with delivery information
  - Document download access
  - Delivery status tracking
  - Mobile responsive design
  - Privacy controls and secure access
- **Testing**: Customer access tests, mobile responsiveness validation
## 21. Summary

SPEC-010 defines a comprehensive Letters & Document Management domain enabling clear tracking of motorcycle delivery status and receipt confirmation workflows with seamless integration across all existing domains.

### 21.1 Core Capabilities
- **Letter Lifecycle Management**: Creation, status tracking, and receipt confirmation
- **Unreceived Letter Tracking**: Clear identification of pending motorcycle deliveries
- **Document Generation**: Automated creation of delivery and receipt documents
- **Workflow Integration**: Seamless connection with orders, reservations, and financial data
- **Operational Interface**: Desktop-focused workflow for cashiers and reception staff
- **Complete Audit Trail**: Full history tracking for all letter operations

### 21.2 Letter Lifecycle
`issued` → `received` (customer confirms receipt) / `not_received` (employee records non-receipt) → `received` (issue resolved)

### 21.3 Unreceived Letter Workflow
Critical business requirement workflow:
1. Order reaches `awaiting_delivery` → Letter auto-created with `issued` status
2. Letter appears in "Pending Receipts" dashboard
3. Days pending calculated and displayed
4. Staff can search by customer/VIN/phone for quick access
5. Receipt confirmation updates status to `received`
6. Non-receipt can be recorded with `not_received` status
7. Follow-up actions remain visible until actual receipt

### 21.4 Receipt Confirmation Behavior
- **Authorization**: Only cashier+ roles can confirm receipt
- **Validation**: Letter must be in `issued` or `not_received` status
- **Idempotency**: Duplicate confirmations prevented by system design
- **Audit Trail**: Complete logging of confirmation with actor and timestamp
- **Integration**: Receipt confirmation may trigger order completion
- **Real-time Updates**: Status changes broadcast to relevant users

### 21.5 Key Technical Decisions
- Letter numbering: LTR-{branchCode}-{year}-{sequence}
- Branch-scoped access with role-based permissions
- S3-compatible document storage with database metadata
- Document versioning with historical preservation
- Optimistic locking for concurrent receipt confirmations
- Integration boundaries preserve domain separation

### 21.6 Implementation Tasks Summary
**16 atomic tasks** organized across:
- **Database Layer**: Schema and numbering (2 tasks)
- **Shared Components**: Types and document engine (2 tasks)
- **API Layer**: Management, workflow, search, document APIs (4 tasks)
- **Integration Layer**: Order lifecycle, financial data, concurrency (3 tasks)
- **UI Layer**: Admin, desktop workflow, customer portal (3 tasks)
- **Testing**: Comprehensive integration validation (2 tasks)

### 21.7 Dependencies
- SPEC-001 (Authentication), SPEC-002 (Motorcycles), SPEC-004 (Customers), SPEC-005 (Orders), SPEC-006 (Reservations), SPEC-008 (Payments), SPEC-009 (Installments)
- Database with ACID transactions
- S3-compatible object storage
- Document generation library
- Optional notification infrastructure

### 21.8 Downstream Features
- **SPEC-011 Reports**: Letter and delivery performance analytics
- **SPEC-012 Notifications**: Delivery alerts and reminder systems
- **Digital Signatures**: Electronic document signing capabilities
- **Mobile Integration**: Delivery confirmation via mobile applications
- **Advanced Tracking**: GPS and real-time delivery monitoring

### 21.9 Next Recommended Specification
**SPEC-011: Reports & Analytics** - Building on the complete operational data to provide comprehensive business intelligence, performance metrics, and regulatory reporting capabilities.