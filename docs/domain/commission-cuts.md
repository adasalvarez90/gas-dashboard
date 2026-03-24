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
| Type | **Diferida** or **Regular** — label explicitly when origin differs (helps more than only "Cuota 1, 2, 3") |
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

# View: Comisiones atrasadas / Requieren acción

A dedicated view or filter to show commissions that:

- Require user or advisor action
- Are overdue (desglose not sent, invoice not received, payment pending past deadline)
- Were deferred to the current cut

---

# PDF Export

The system must be able to generate a PDF breakdown that can be downloaded and sent by email.

## Export Options

| Option | Description |
|-------|-------------|
| **General breakdown** | All advisors that are owed in the specified cut |
| **Per advisor** | Individual breakdown for one selected advisor |

Each PDF must include: advisor name(s), total for the cut, commission breakdown, type per commission (regular/diferida), contract reference(s).

**Multiple advisors in same contract:** The user sends the breakdown to **each advisor separately**. If one advisor is late, it does **not** affect the others. Each advisor’s commission is handled independently.

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

**The user can attach the invoice to a late commission at any time** — there is no restriction. Exceptions are possible (see Deferred & Exception Rules).

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
| Send breakdown | User | **2 business days after cut date** |
| Generate invoice | Advisor | **2 business days after breakdown sent** |
| Send to pay / attach proof | User | 2 business days after invoice received |

---

# Deferral Rules (Diferida)

## Definition: When a commission is diferida

**A commission is considered diferida when it has exceeded its payment deadline, regardless of the cause.**

The system **automatically** flags a commission as diferida by comparing the current date with the computed deadlines (2 business days per step). No user action is required to mark it.

Example:

- Commission due: 21 February 2026 (cut date).
- Today: 23 March 2026.
- Commission not paid → system marks it as **diferida**.

**Legacy / invoice-late flow:** When the advisor’s invoice arrives after the 2-business-day limit, the commission may also have `deferredToCutDate` and appear in the next cut. Both concepts coexist: auto-diferida by deadline, and explicit deferral to next cut.

## Commission Cuts UI — una diferida, como mucho dos cortes

En la pantalla **Cortes de comisión**, la misma línea de pago **no** se acumula en todos los cortes futuros. Regla:

- Como mucho en **dos** cortes: **original** (`cutDate`) + **un** destino cuando corresponda.
- **Destino explícito:** `deferredToCutDate` (p. ej. factura tarde) e impaga.
- **Destino implícito (todos los `paymentType`):** el siguiente 7/21 del mes siguiente **solo si** (1) ya ocurrió el día de corte original (fecha México) y (2) el flujo desglose → factura → comprobante tiene un paso **vencido** según plazos de 2 días hábiles y timestamps en `CommissionCutAdvisorState` (sin documento de estado = pendiente de desglose). **No** depende de inmediata vs recurrente.
- No cadena may → jun → jul para la misma fila.

---

# Late Reasons (Motivos de atraso)

## Structure

Each late reason is stored as:

```ts
{
  step: 'DESGLOSE' | 'FACTURA' | 'PAGO';
  reason: string;   // catalog code (required)
  text?: string;    // optional free text
  at?: number;      // when the delay occurred
}
```

- **step**: Which transition was late (breakdown sent, invoice received, or payment).
- **reason**: Catalog code. Required. The user selects one from the catalog.
- **text**: Optional free text. The user may add an explanation in addition to the catalog reason.
- **at**: Optional timestamp when the delay occurred.

Reasons are recorded at each status change where a deadline is exceeded.

## Catalog

| Code | Label |
|------|-------|
| `DESGLOSE_NO_ENVIADO_A_TIEMPO` | El desglose no se envió a la asesora a tiempo |
| `FACTURA_NO_RECIBIDA_A_TIEMPO` | No se recibió factura a tiempo |
| `PAGO_NO_REALIZADO_A_TIEMPO` | El pago no se realizó a tiempo |

The user selects a catalog reason (**motivo**) and may optionally add free text (**texto**). Both fields are stored.

---

# Visual Alerts (Colores en el detalle)

| Condition | Color | Meaning |
|-----------|-------|---------|
| Commission **diferida** (past deadline) | **Red** | Past payment deadline, regardless of cause |
| Commission **on time** but payment not yet done | **Yellow** | Within deadline, pending receipt |
| Commission **paid** (receipt attached) | **Green / normal** | Complete and **no** step exceeded its 2-business-day deadline |
| Commission **paid late** (any step exceeded deadline) | **Orange** | Any of desglose / factura / comprobante fuera de plazo; **sigue naranja aunque** el comprobante quede antes del siguiente corte |

Commissions that were **paid late** retain the orange indicator after payment (auditoría). **No** se “perdona” un paso tarde porque el comprobante llegó antes del corte siguiente: basta **un** paso tarde para franja naranja.

---

# Payment Flow with Deferred Commissions

The normal flow is: **Download breakdown** → **Attach invoice** → **Attach payment receipt**. This flow covers all commissions in the cut.

When there are **diferida** commissions in the cut, the system must support two exception paths:

## Path 1: Normal flow including all deferred

- User follows the normal flow (download breakdown, invoice, receipt) for the entire cut.
- Because there are deferred commissions, the system **asks for a reason** before proceeding:
  - **Motivo** (required): Why these deferred commissions are being paid in this cut.
  - **Texto** (optional): Additional explanation.
- That reason is **assigned to all** deferred commissions in the cut.
- Flow continues: attach invoice → attach receipt. One invoice and one receipt for the whole cut.

## Path 2: Process only selected deferred commissions

- User **selects** one or more deferred commissions (some or all, only diferida).
- User provides **dates** for each step: desglose, factura, comprobante.
- **Target cut logic** (when desglose date is before the deferred cut date):
  - `targetCutDate` = corte ≤ fecha desglose.
  - **Restricción:** Una comisión no puede asignarse a un corte anterior al primer corte en que fue diferida.
    - **Ej. incorrecto:** Original 7 feb → diferida a 7 mar → 21 mar. Desglose = 5 mar → corte ≤ 5 mar = 21 feb. La comisión saltó 21 feb al diferirse a 7 mar → **no** se puede asignar a 21 feb; `targetCutDate` = 7 mar.
    - **Ej. correcto:** Original 7 feb → diferida a 7 mar → 7 abr. Desglose = 15 mar → corte ≤ 15 mar = 7 mar. 7 mar ≠ original → sigue diferida con `deferredToCutDate` = 7 mar.
  - Si desglose ≥ corte diferido actual → `targetCutDate` = corte diferido actual.
- Si se seleccionan comisiones de distintos cortes originales, cada grupo se procesa con su propio `originalCutDate` y `targetCutDate`.
- **`cutDate` (original)** no se modifica nunca; siempre conserva el corte de origen.
- **`deferredToCutDate`**: Si `targetCutDate === originalCutDate` → se quita (pagada en su corte original). Si `targetCutDate !== originalCutDate` → se actualiza a `targetCutDate` (aún diferida para auditoría).
- User provides **motivo** (required), **texto** (optional), **invoice**, and **receipt**.
- **Color logic:** If **any** status date exceeds its step deadline (2 business days in the chain) → **orange** (paid late). Otherwise → **green**. Un paso tarde no se compensa con pasos posteriores “a tiempo”.
- Deferred commissions **not** selected remain pending and will be processed later via Path 1 (or another Path 2 selection).

---

# Guided Flow (Flujo por pasos)

The system guides the user through three steps:

1. **Desglose**: Download/attach the breakdown.
2. **Factura**: Attach the advisor invoice.
3. **Pago**: Attach the payment receipt.

**Deadline per step:** Each transition has a limit of **2 business days**. If the user attempts to advance to the next step after that limit has passed (e.g., attaching the invoice after the 2-day window), the system **asks for a motivo** (required) and optional text **before** allowing the transition.

This applies at each step: DESGLOSE → FACTURA, FACTURA → PAGO. If the deadline for that step was exceeded, the system records the reason in `lateReasons` before continuing.

---

# Exception Rules (Pago antes del siguiente corte)

- The user **can attach the invoice to a late/deferred commission at any time**.
- There are **exceptions** for specific reasons where, even if the commission was deferred to the next cut, the user can send it to payment **before** the next cut.
- **If a deferred commission is paid before the next cut:**
  1. Remove it from the deferred cut (it will no longer appear in that next cut).
  2. Keep the **paid-late** indicator (color) for audit — the commission is marked as paid late.
  3. The next cut where it was supposed to be paid will treat it as "already paid late" — it will not appear as pending there, but the late reason and color remain for historical visibility.

---

# Advisor Compliance

The system must show the user which advisors are **not meeting** the established deadlines (e.g., did not generate the invoice on time).

This may be displayed on the same breakdown (desglose) screen or on a separate screen. The purpose is to identify advisors who did not submit their invoice within the 2-business-day limit.

---

# Product Notes (Non-technical)

- **Same advisor in multiple places:** An advisor may appear in different contracts with **different roles**. Keep them in both places with distinct roles.
