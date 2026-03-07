# Financial Safety Rules

This document defines critical financial protections that must always be respected by the system.

These rules prevent inconsistencies, duplicated commissions, incorrect calculations, and data corruption.

All developers and AI-generated code must follow these rules.

---

# 1 Commission Generation Must Be Idempotent

Commission generation must never run twice for the same tranche.

Before generating commissions, the system must verify that no commission records already exist.

Example validation:

if commissionPayments exist where trancheUid = X
→ do not generate again

This prevents duplicated financial obligations.

---

# 2 Commission Records Must Never Be Deleted

Commission payments represent financial history.

They must **never be deleted**.

Instead:

cancelled = true

This preserves historical auditability.

---

# 3 Paid Commissions Cannot Be Modified

If a commission payment has:

paid = true

The record must be immutable.

Allowed changes:

none.

If corrections are required, they must be done through adjustment entries.

---

# 4 Deposits Cannot Exceed Tranche Amount

Validation rule:

totalDeposited + deposit.amount <= tranche.amount

If this condition fails, the deposit must be rejected.

This prevents overfunding errors.

---

# 5 Tranche Funding Must Happen Only Once

When:

totalDeposited >= tranche.amount

The system must:

set funded = true  
set fundedAt = depositDate

This must only happen once.

After a tranche becomes funded:

Deposits are no longer allowed.

---

# 6 Contract Start Date Is Determined by Funding

A contract does not start when it is signed.

A contract starts when the **first tranche becomes fully funded**.

contract.startDate = tranche1.fundedAt

contract.endDate = startDate + 12 months

---

# 7 Commission Calculations Must Be Deterministic

Given the same inputs:

Contract  
Tranche  
CommissionConfig  

The commission engine must always produce the same output.

This ensures reproducibility and auditability.

---

# 8 All Financial Values Must Be Stored as Numbers

Money must always be stored as numbers.

Example:

100000

Formatting (currency symbols, commas) must only occur in the UI.

Never store formatted values in the database.

---

# 9 Avoid Floating Point Accumulation Errors

Recurring commissions may create rounding issues.

Example:

5000 / 12 = 416.666...

The system must ensure the final installment corrects rounding differences so that:

sum(all installments) = total expected commission

---

# 10 Contract Cancellation Must Not Remove History

When a contract is cancelled:

future unpaid commissions must be marked as:

cancelled = true

Already paid commissions remain unchanged.

No financial records should be deleted.

---

# 11 Commission Payment Dates Must Follow the Contract Timeline

Commission payments must never exceed the contract end date.

Example:

contract.startDate = Jan 15 2026

contract.endDate = Jan 15 2027

No commission payment should exist after Jan 15 2027.

---

# 12 Financial Records Must Be Traceable

Each commission payment must include:

contractUid  
trancheUid  
advisorUid  
role  

This ensures every payment can be traced back to its origin.

---

# 13 Firestore Writes Must Be Atomic for Financial Events

Critical operations must be executed atomically when possible.

Example operations:

• deposit creation  
• tranche funding  
• commission generation  

This prevents inconsistent states.

---

# 14 Domain Calculations Must Not Depend on Firestore

Financial calculations must be pure functions.

Domain engines must never query Firestore.

All data must be passed as inputs.

This ensures calculations remain deterministic and testable.

---

# Summary

Financial system invariants:

• commissions cannot duplicate  
• deposits cannot overfund  
• paid commissions cannot change  
• financial records cannot disappear  
• calculations must be deterministic  

Breaking these rules may corrupt financial data.