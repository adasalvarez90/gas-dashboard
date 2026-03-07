# TypeScript Development Rules

This document defines how TypeScript code must be written in this project.

These rules ensure the codebase remains consistent, maintainable, and predictable.

The project uses Angular, NgRx, and Firebase.

---

# General Principles

1. Business logic must never exist inside Angular components.

2. Components are only responsible for:
   - rendering UI
   - reacting to user actions
   - calling facades

3. All financial calculations must live inside the **domain layer**.

4. Firestore services must contain **only persistence logic**.

5. Domain services must never access Firestore directly.

---

# Angular Components

Components must remain thin.

They should:

• subscribe to observables  
• dispatch commands through facades  
• render UI  

Example:

```typescript
this.contractFacade.contracts$

Bad example (not allowed):

calculateCommission()

Calculations belong in the domain engines.

Facade Usage

UI must interact only with facades, not the store directly.

Example:

this.contractFacade.createContract(contract)

Not allowed:

store.dispatch(...)

Facades abstract NgRx complexity from the UI.

Store Responsibilities

NgRx store modules manage application state.

Each entity must have:

model
actions
reducer
selectors
effects
facade

Effects are responsible for:

• calling persistence services
• orchestrating async operations

Reducers must remain pure.

Firestore Services

Firestore services must contain only CRUD operations.

Example:

createContract
updateContract
deleteContract
getContracts

They must not contain:

• calculations
• business rules
• domain decisions

Domain Services

Domain services live in:

/domain/engines

Examples:

commission-engine.service
role-resolver.service
deposit-orchestrator.service

These services perform:

• financial calculations
• tranche funding logic
• commission generation
• payment scheduling

They must only operate on models and return computed results.

Domain Models

Intermediate models are stored in:

/models

Example:

CommissionPaymentDraft
CommissionRoleSplit

These represent temporary calculation results before persistence.

Financial Calculations

All financial logic must be deterministic.

Inputs must produce predictable outputs.

Example:

Contract
Tranche
CommissionConfig

Output:

CommissionPaymentDraft[]

This allows testing and validation.

Timestamp Standard

All timestamps must use Unix milliseconds.

Example:

Date.now()

Firestore timestamps should be converted to numbers.

Currency Rules

All money values must use numbers representing MXN.

Example:

100000

Formatting must only occur in the UI.

Commission Generation Pattern

Commission generation must follow this pattern:

Deposit created
↓
DepositOrchestrator updates tranche
↓
If tranche becomes funded
↓
CommissionEngine generates drafts
↓
Drafts persisted as CommissionPayment

This ensures financial consistency.

Defensive Programming

All domain engines must validate inputs.

Example:

if (!contract || !tranche) return []

Avoid throwing errors inside domain calculations.

Return safe results.

Code Readability

Prefer:

• clear variable names
• small functions
• deterministic logic

Avoid:

• deeply nested conditionals
• side effects inside calculations

Function Size

Functions should ideally remain under 40 lines.

If logic becomes complex, split into smaller functions.

Type Safety

Avoid any.

Always prefer explicit types.

Example:

CommissionPaymentDraft[]
Async Logic

Domain services should remain synchronous whenever possible.

Async operations belong in:

NgRx effects

or

Firestore services
Testing Strategy

Domain services must be easily testable.

Example:

commissionEngine.generateForTranche(...)

should work without Angular or Firebase.

Summary

Architecture responsibilities:

UI → components/pages

State → store

Persistence → services

Business Logic → domain engines

Following this structure ensures the system remains maintainable as it grows.