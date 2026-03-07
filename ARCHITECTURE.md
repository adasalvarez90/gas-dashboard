# Application Architecture

This project follows a domain-oriented architecture using Angular, NgRx, and Firebase.

The architecture separates responsibilities into clearly defined layers.

The goal is to keep business logic isolated from UI and persistence.

---

# High Level Structure

The project is divided into the following main layers:


pages → UI screens
components → reusable UI blocks
store → application state (NgRx)
services → persistence layer (Firestore access)
domain → business logic engines
models → shared domain models
docs → domain documentation


---

# UI Layer

UI lives inside:


/pages
/components


Responsibilities:

• Rendering UI  
• Handling user interaction  
• Dispatching NgRx actions  
• Subscribing to Facades

UI **must not contain business logic**.

All calculations must happen inside the domain layer.

---

# State Management

State is managed using NgRx.

Each entity has its own store module:


/store/contract
/store/tranche
/store/deposit
/store/commission-payment
/store/advisor
/store/commission-config


Each store module contains:


model
actions
reducer
selectors
effects
facade


---

# Facade Pattern

UI interacts only with **facades**, not directly with the store.

Example:


ContractFacade
TrancheFacade
DepositFacade
CommissionPaymentFacade


Facades expose:


observables for UI
commands to dispatch actions


Example usage:


this.contractFacade.contracts$
this.contractFacade.createContract()


---

# Persistence Layer

All Firestore operations are isolated in services.

Location:


/services


Examples:


contract-firestore.service.ts
deposit-firestore.service.ts
tranche-firestore.service.ts
commission-payment-firestore.service.ts


Rules:

Firestore services must only perform CRUD operations.

They must not contain business logic.

---

# Domain Layer

Business logic lives inside the domain layer.

Location:


/domain/engines


Examples:


commission-engine.service.ts
role-resolver.service.ts
deposit-orchestrator.service.ts


Domain services are responsible for:

• financial calculations  
• commission generation  
• tranche funding logic  
• payment schedule creation  

Domain services **must not access Firestore directly**.

They operate only with models and return calculated results.

---

# Domain Models

Shared interfaces are stored in:


/models


Examples:


CommissionPaymentDraft
CommissionRoleSplit


These models represent intermediate calculations before persistence.

---

# Commission System Flow

The commission system follows this flow:


Deposit Created
↓
DepositOrchestrator updates tranche
↓
If tranche becomes funded
↓
CommissionEngine generates commission drafts
↓
Drafts are persisted as CommissionPayment


This ensures deterministic commission generation.

---

# Contract Lifecycle

Contract creation:


Create contract
↓
Create first tranche
↓
Create deposits
↓
Tranche becomes funded
↓
Contract startDate = fundedAt
↓
Commissions generated


Contract duration is always:


12 months from fundedAt


---

# Tranche System

Contracts may contain multiple tranches.


Tranche 1 → initial investment
Tranche 2 → annex contribution
Tranche 3 → annex contribution


Each tranche generates its own commission obligations.

---

# Deposit System

Deposits accumulate until a tranche becomes funded.


totalDeposited >= tranche.amount


At this moment:


funded = true
fundedAt = depositDate


And commission generation is triggered.

---

# Commission System

Commissions are generated once per funded tranche.

Two schemes exist:


Scheme A
Scheme B


Commissions are distributed using the **CommissionConfig matrix**.

Each generated payment is stored as:


CommissionPayment


These records represent financial obligations.

---

# Design Principles

The project follows these principles:

1. UI contains no business logic
2. Domain layer performs all calculations
3. Store manages state only
4. Services interact with Firestore
5. Domain engines never access persistence directly

This keeps the system maintainable and testable.