# AI Prompts for Development

This file contains reusable prompts for working with AI assistants such as Cursor.

These prompts assume the AI has access to:

AI_CONTEXT.md  
ARCHITECTURE.md  
typescript-rules.md  
docs/domain/*  

The prompts help generate code consistent with the architecture and business rules of this project.

---

# 1 Generate Commission Engine

Prompt:

Implement the CommissionEngine service.

Context:

Commissions are generated when a tranche becomes fully funded.

Inputs:

Contract  
Tranche  
CommissionConfig matrix  

Output:

CommissionPaymentDraft[]

The engine must:

1. Determine the commission scheme (A or B)
2. Calculate the total commission percentage
3. Split commission across advisor roles using CommissionConfig
4. Generate payment schedule according to the scheme
5. Return all payments as CommissionPaymentDraft records

Rules:

Follow the architecture described in ARCHITECTURE.md.
Business rules are described in docs/domain/commissions.md.

The service must not access Firestore.

---

# 2 Implement Deposit Orchestrator

Prompt:

Implement DepositOrchestratorService.

Responsibilities:

1. Register deposits for a tranche
2. Update tranche.totalDeposited
3. Detect when tranche becomes funded
4. Set tranche.funded and tranche.fundedAt
5. If first tranche is funded:
   set contract.startDate and contract.endDate
6. Trigger commission generation

Use:

CommissionEngine
RoleResolver

The orchestrator may call Firestore services.

---

# 3 Generate Commission Schedule

Prompt:

Given a contract and a tranche, generate the complete commission schedule.

Rules:

Scheme A:
4% immediate
5% recurring across remaining contract months.

Scheme B:
4% immediate
Remaining paid month 6 or month 12 depending on funding date.

Return:

CommissionPaymentDraft[]

Reference:

docs/domain/commission-calculation-examples.md.

---

# 4 Validate Deposit Rules

Prompt:

Implement validation logic for deposits.

Rules:

Deposits must follow these constraints:

• amount must be greater than zero  
• tranche must not already be funded  
• contract must not be cancelled  
• totalDeposited must not exceed tranche amount  

If deposit completes funding:

set tranche.funded = true  
set tranche.fundedAt = depositedAt  

Then trigger commission generation.

---

# 5 Cancel Contract

Prompt:

Implement contract cancellation logic.

When a contract is cancelled:

1. Update contract.accountStatus = CANCELLED
2. Mark all future unpaid commissions as cancelled
3. Do not modify already paid commissions

This operation must not delete financial records.

---

# 6 Generate New Tranche

Prompt:

Create logic for generating a new tranche.

Rules:

A new tranche may only be created if the previous tranche is funded.

Sequence logic:

sequence = max(existing.sequence) + 1

Fields:

contractUid  
amount  
totalDeposited = 0  
funded = false  

Return the created tranche.

---

# 7 Resolve Advisor Roles

Prompt:

Implement role resolution logic.

Inputs:

Contract.roles  
CommissionConfig matrix  

Output:

CommissionRoleSplit[]

Each split must include:

role  
advisorUid  
percent  

The percent comes from CommissionConfig depending on the investment source.

Reference:

docs/domain/roles.md.

---

# 8 Commission Calculation Example

Prompt:

Using the examples in docs/domain/commission-calculation-examples.md, verify that the generated payment schedule is correct.

Ensure:

annex contributions distribute recurring commissions across remaining months.

---

# Best Practice

When generating code:

Follow the architecture described in ARCHITECTURE.md.

Respect:

• domain layer separation  
• NgRx store patterns  
• Firestore services isolation  
• deterministic financial calculations