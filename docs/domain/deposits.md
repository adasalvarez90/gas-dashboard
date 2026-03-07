# Deposits Domain

Deposits represent money transfers from the investor.

Deposits fund a tranche.

---

# Deposit Fields


contractUid
trancheUid
amount
depositedAt


---

# Deposit Rules

Deposits accumulate into the tranche.

Example:


Tranche amount = 100,000

Deposit 30,000
Deposit 30,000
Deposit 40,000


Result:


totalDeposited = 100,000
funded = true


---

# Deposit Restrictions

Deposits must follow these rules:

1. Amount must be greater than zero.

2. Deposits cannot exceed tranche amount.

3. Deposits cannot occur if the tranche is already funded.

4. Deposits cannot occur if the contract is cancelled.

---

# Funding Trigger

When a deposit causes the tranche to reach the required capital:


totalDeposited >= amount


Then:


funded = true
fundedAt = depositedAt


At this moment the commission engine must run.