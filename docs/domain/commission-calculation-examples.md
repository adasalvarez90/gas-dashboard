# Commission Calculation Examples

This document contains real examples of how commissions must be calculated.

The purpose of this document is to help developers and AI assistants understand the expected financial behavior of the system.

All calculations assume the tranche is fully funded.

---

# Scheme A

Scheme A has the following rules:

Total commission = **9% of tranche capital**

Distribution:

Immediate payment = **4%**

Recurring commission = **5% divided across the contract duration**

Contract duration is **12 months from contract startDate**.

---

# Example 1 — Standard Investment

Investment:

100,000 MXN

Commission:

9%

Total commission:

9,000 MXN

Distribution:

Immediate commission


4% of 100,000 = 4,000


Recurring commission


5% of 100,000 = 5,000


Recurring payments:


5,000 / 12 months = 416.66 per month


Payment schedule:

Month 1 → 416.66  
Month 2 → 416.66  
Month 3 → 416.66  
...  
Month 12 → 416.66

---

# Example 2 — Annex Contribution in Month 3

Initial investment:

100,000 MXN

Contract started:

January 1

Recurring payments:


416.66 per month


After two months:

February payment → 416.66  
March payment → 416.66

Investor adds another:

100,000 MXN

This creates a **new tranche**.

Immediate commission:


4% of 100,000 = 4,000


Recurring commission:


5% of 100,000 = 5,000


Remaining contract duration:

10 months

Recurring payments:


5,000 / 10 = 500 per month


New combined payment starting month 3:


416.66 + 500 = 916.66


---

# Example 3 — Annex Contribution in Month 11

Initial investment:

100,000 MXN

Recurring payments:


416.66 per month


Investor adds another:

100,000 MXN

This occurs in month 11.

Remaining contract duration:

1 month

Recurring commission:


5,000 / 1 = 5,000


Final payment month 12:


416.66 + 5,000 = 5,416.66


---

# Scheme B

- 4% commission **immediate**.
- The **extra** (depending on yield) is paid in the **sixth month of the contract term**.

Additional commission depends on yield offered:

Yield → Extra Commission

- 16% yield → +4%
- 17% yield → +3%
- 18% yield → +2%
- 19% yield → +1%
- 20% yield → +0%

Example: yield 16% → total commission 8% (4% immediate + 4% at month 6).

Annex rule:

- **Annex before month 6** of the contract term: 4% immediate; extra (by yield) paid at **month 6** (together with the original tranche if applicable).
- **Annex from month 6 onward** of the contract term: 4% immediate; remaining (by yield) paid at **month 12** of the contract term.

---

# Example — Scheme B Annex Before Month 6

Investment: 100,000. Immediate: 4% = 4,000. Remaining (e.g. 4%): 4,000. If annex occurs before month 6, the remaining payment occurs at **month 6**.

---

# Example — Scheme B Annex After Month 6

If annex occurs from month 6 onward, remaining commission is paid at **month 12**.

---

# Commission Generation Rule

Commissions are generated **when the tranche becomes fully funded**.

Trigger:


totalDeposited >= tranche.amount


At that moment:

CommissionEngine must generate all commission obligations.

These obligations are saved as CommissionPayment records.

---

# Commission Cancellation

If a contract is cancelled:

All **future unpaid commissions must be marked as cancelled**.


cancelled = true


Already paid commissions remain unchanged.