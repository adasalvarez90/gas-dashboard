# Tranches Domain

A tranche represents a capital contribution within a contract.

Contracts may contain multiple tranches.

---

# Initial Tranche

The first tranche represents the original investment.

Example:


Tranche 1
amount: 100,000


---

# Annex Contributions

Investors may add capital later.

This creates additional tranches.

Example:


Tranche 2
amount: 50,000


Each tranche generates its own commissions.

---

# Tranche Fields


contractUid
amount
totalDeposited
funded
fundedAt
sequence


---

# Funding Logic

A tranche becomes funded when:


totalDeposited >= amount


Example:


amount = 100,000

deposit 40,000
deposit 40,000
deposit 20,000


Now:


funded = true
fundedAt = timestamp


---

# Sequence

Tranches follow a sequence.


1 = initial investment
2 = first annex
3 = second annex


Sequence determines when the tranche was created relative to the contract timeline.

---

# Funding Impact

When a tranche becomes funded:

The system must generate commission obligations.