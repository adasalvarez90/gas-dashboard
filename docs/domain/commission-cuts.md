# Commission Cuts / Summary Page

A dedicated page for commission cuts that aggregates commissions by advisor (asesora) and provides PDF export. Payment actions are **not** performed in the contract view; see commissions.md.

---

# Contract Commissions View — Informative Only

The commission screen within a contract must be **purely informative**. The system must remove:

- The action to pay each commission individually
- The action to pay the general cut (corte general)

That view is read-only; no payment actions are available there.

---

# Commission Cuts Summary — By Advisor

The summary page groups commissions **by advisor (asesora)**.

## Aggregation Logic

- Each advisor can have **multiple commissions** in a single cut, from one or many contracts.
- Commissions may come from **new contracts** (immediate) or **old contracts** (recurring).
- Multiple contracts can accumulate in a single cut.

## What the User Sees per Advisor

| Field | Description |
|-------|-------------|
| Advisor name | Name of the asesora |
| Total for cut | Accumulated commissions for the selected cut |
| Breakdown | List of individual commissions |
| Type | **Nueva (immediata)** or **Vieja (recurrente)** per commission |
| Contracts | Can span N contracts |

## Data Selection

The system must:

1. Find all contracts that have commissions for the **specified cut**.
2. From those contracts, extract all advisors who have commission payments in that cut.
3. Aggregate commissions per advisor from those contracts.

---

# Filters

The user can consult:

- **By cut**: Current cut, or any cut going backwards in time.
- **By advisor**: A specific advisor or **all advisors**.

---

# PDF Export

The system must be able to generate a PDF breakdown that can be downloaded and sent by email.

## Export Options

| Option | Description |
|-------|-------------|
| **General breakdown** | All advisors that are owed in the specified cut |
| **Per advisor** | Individual breakdown for one selected advisor |

Each PDF must include: advisor name(s), total for the cut, commission breakdown, type per commission (nueva/vieja), contract reference(s).

---

# Commission Status

Each commission has a **status** so the user knows who must take action: the user or the advisor (asesora).

| Status | Description |
|--------|-------------|
| **Pendiente** | Initial state when commission is generated |
| **Desglose enviado** | User has sent the breakdown to the advisor |
| **Enviada a pago** | User has attached the invoice; ready for accounting to pay |
| **Pagada** | Payment completed; receipt attached |

---

# Status Workflow

1. Commission is generated → status **Pendiente**.
2. User downloads the cut breakdown and sends it to the advisor → status **Desglose enviado**.
3. Advisor generates their invoice and sends it to the user.
4. User attaches the invoice to the breakdown → status **Enviada a pago**.
5. Accounting pays; user attaches the payment receipt → status **Pagada**.

---

# File Attachments (Per Commission)

The breakdown includes multiple commissions from different contracts. Status applies to **each commission individually**.

- **Invoice (factura)**: Linked to each commission. Required to move from Desglose enviado → Enviada a pago.
- **Payment receipt (comprobante de pago)**: Linked to each commission. Required to move from Enviada a pago → Pagada.

---

# Cut Schedule and Deadlines

Cut dates are **7** and **21** (depending on when the tranche is funded, per yield payment schedule in contracts.md).

## Timezone Rule (System-wide)

All business dates must be interpreted in **America/Mexico_City**:

- Contract signature date
- Tranche signed/registered dates
- Deposit date
- Commission due date and cut date
- Deadline checks for overdue status

Date-only fields must be normalized before saving so they do not shift by timezone when read from the database.

## Timeline

| Step | Actor | Deadline |
|------|-------|----------|
| Send breakdown | User | Day 7 or 21 of the cut |
| Generate invoice | Advisor | **2 business days after cut date** |
| Pay invoice | User | 2 business days after receiving invoice |

## Late Invoice Rule

If the advisor does **not** generate the invoice within the 2-business-day limit:

- That commission is **not** paid in the current cut.
- It is paid in the **next corresponding cut** — the same cut day (7 or 21) in the **next month**.

Examples:

- Cut March 7, 2026 → next cut = **April 7, 2026**
- Cut June 21, 2026 → next cut = **July 21, 2026**

The next cut amount may change, **accumulating** the unpaid commissions that were deferred due to the late invoice.

---

# Visual Alerts for Unpaid Commissions

The system must highlight commissions that have **not** been paid on time with an **error or warning color**, so the user can quickly identify which commissions are overdue.

---

# Advisor Compliance

The system must show the user which advisors are **not meeting** the established deadlines (e.g., did not generate the invoice on time).

This may be displayed on the same breakdown (desglose) screen or on a separate screen. The purpose is to identify advisors who did not submit their invoice within the 2-business-day limit.
