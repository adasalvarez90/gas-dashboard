# Deposits Domain

Deposits represent money transfers from the investor.

Deposits fund a tranche.

---

# Deposit Fields

- contractUid
- trancheUid
- amount
- depositedAt
- **sourceAccount** — Account from which the deposit is made. The user must select it when registering the deposit.

---

# Source Account Selection

When registering a deposit, the user **must select the source account**.

- If the account matches one of the contract's client accounts (funding or returns), the deposit is valid.
- If the account is **not** one of those specified in the contract, the user must select the option **"No especificada en el contrato"** (Not specified in contract).

## When account is "No especificada en el contrato"

1. **Visual alert**: The system shows the deposit with an error or warning color.
2. **Excluded from funding**: The deposit is **not** counted toward tranche funding (`totalDeposited`). Only deposits with a valid contract-specified account contribute to funding.
3. **Other deposits**: The user can continue registering other deposits (respecting the tranche amount limit as usual).
4. **Tranche cannot be funded**: The tranche **cannot** become funded while any deposit has "No especificada en el contrato".
5. **Resolution**: The user must resolve this before funding can occur:
   - **Option A**: Update the contract to include the account and the investor re-signs. Original dates are preserved.
   - **Option B**: Return the deposit and the investor makes a new deposit from the account specified in the contract.

## Editing and deleting

For deposits with "No especificada en el contrato", the user can:
- **Edit** the deposit: amount, date, and source account.
- **Delete** the deposit.

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

`totalDeposited` includes only deposits whose source account is one of the contract's client accounts (not "No especificada en el contrato").

When the sum of valid deposits causes the tranche to reach the required capital:

totalDeposited >= amount

Then:


funded = true
fundedAt = depositedAt


At this moment the commission engine must run.