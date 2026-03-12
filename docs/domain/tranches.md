# Tranches Domain

A tranche represents a capital contribution within a contract.

Contracts may contain multiple tranches.

---

# When Is the First Tranche Created?

The **first tranche (sequence 1)** is created only when the contract is **signed** and has a **signature date** (and initial capital):

- If the contract is created **as signed** (with signature date and initial capital), the system creates the contract and the first tranche in one step. The tranche’s `signedAt` is set to the contract’s signature date.
- If the contract is created **as not signed**, no tranche is created. When the user later marks the contract as signed and enters the signature date and initial capital, the system then creates the first tranche (sequence 1) with that amount and `signedAt` = signature date.

Annex tranches (sequence 2+) are created manually by the user (only when the previous tranche is funded). Each tranche can have a `signedAt` (date the tranche/annex was signed) and optionally `registeredAt` (date registered in the system).

---

# Initial Tranche

The first tranche represents the original investment.

Example:


Tranche 1
amount: 100,000
signedAt: (contract signature date)


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
signedAt (optional; date the tranche/annex was signed)
registeredAt (optional; date registered in the system)
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