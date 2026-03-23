# Commission Cuts — Implementation Reference

This document defines the data structures and tables needed to implement the commission cut rules (see commission-cuts.md).

---

# CommissionCutAdvisorState — Schema Update

The existing `commissionCutAdvisorStates` collection must be extended with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `lateReasons` | `LateReasonEntry[]` | One or more late reason entries. See schema below. |
| `paidLate` | `boolean` | `true` when the commission was paid after the normal deadline (exception payment before next cut). Keeps the "paid late" color for audit. |
| `originalCutDate` | `number` | When the state was deferred from a previous cut, this stores the cut date from which it originated. Used to label "Diferida" and for audit. |
| `movedToNextCut` | `boolean` | (existing) `true` when the commission moved to the next cut due to late invoice. |

**Note:** `movedToNextCut` already exists. The new fields support the updated business rules: late reasons, paid-late audit trail, and "Diferida" vs "Regular" labeling.

---

# LateReasonEntry — Schema

Each late reason entry:

```typescript
type LateReasonStep = 'DESGLOSE' | 'FACTURA' | 'PAGO';

interface LateReasonEntry {
  step: LateReasonStep;  // Which transition was late
  reason: string;        // Catalog code (required)
  text?: string;         // Optional free text
  at?: number;           // Timestamp when the delay occurred
}
```

**Usage:** User selects a catalog reason (**motivo**) and may add optional free text (**texto**). Both fields are stored. Multiple entries allowed (one per step or per late occurrence).

---

# CommissionCutLateReason — Lookup Table

A simple catalog of late reasons. Can be implemented as:

- **Option A:** Firestore collection `commissionCutLateReasons` (if the catalog is managed by admins).
- **Option B:** In-code constant / enum (if the list is fixed).

## Catalog (Option B — recommended for now)

| Code | Label (es-MX) |
|------|--------------|
| `DESGLOSE_NO_ENVIADO_A_TIEMPO` | El desglose no se envió a la asesora a tiempo |
| `FACTURA_NO_RECIBIDA_A_TIEMPO` | No se recibió factura a tiempo |

```typescript
// Example: src/app/models/commission-cut-late-reason.model.ts
export const COMMISSION_CUT_LATE_REASONS: Record<string, string> = {
  DESGLOSE_NO_ENVIADO_A_TIEMPO: 'El desglose no se envió a la asesora a tiempo',
  FACTURA_NO_RECIBIDA_A_TIEMPO: 'No se recibió factura a tiempo',
};
```

---

# CommissionCutAdvisorState — Complete Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | `string` | Yes | Unique identifier |
| `cutDate` | `number` | Yes | Cut date (canonical timestamp, 12:00 UTC) |
| `advisorUid` | `string` | Yes | Advisor UID |
| `state` | `CommissionCutState` | Yes | `PENDING` \| `BREAKDOWN_SENT` \| `SENT_TO_PAYMENT` \| `PAID` |
| `breakdownDeadlineDay` | `7 \| 21` | No | Day of cut (7 or 21) |
| `breakdownSentAt` | `number` | No | When breakdown was sent |
| `invoiceDeadline` | `number` | No | Deadline for invoice (2 business days from breakdown or cut) |
| `invoiceSentAt` | `number` | No | When invoice was received/attached |
| `invoiceUrl` | `string` | No | Storage URL for invoice file |
| `paymentDeadline` | `number` | No | Deadline for payment (2 business days from invoice) |
| `receiptSentAt` | `number` | No | When payment was marked done |
| `receiptUrl` | `string` | No | Storage URL for receipt file |
| `movedToNextCut` | `boolean` | No | Moved to next cut due to late invoice |
| **`lateReasons`** | **`LateReasonEntry[]`** | **No** | **Late reasons per step; see LateReasonEntry schema** |
| **`paidLate`** | **`boolean`** | **No** | **Paid after deadline (exception); keep color** |
| **`originalCutDate`** | **`number`** | **No** | **Original cut when deferred (for "Diferida" label)** |
| `_on` | `boolean` | Yes | Soft-delete flag |
| `_create` | `number` | No | Created timestamp |
| `_update` | `number` | No | Updated timestamp |

---

# CommissionPayment — Implemented

When a commission is **deferred** to the next cut:

- `movePaymentsToNextCut` sets `deferredToCutDate` to the next cut. The `cutDate` **stays** as the original cut.
- The commission appears in **both** cuts: original (read-only badge "Diferida al sig. corte") and target (for payment).
- `markCommissionPaymentsPaidByCutDateAndAdvisor` finds payments by `cutDate` OR `deferredToCutDate`. On pay, clears `deferredToCutDate`.

---

# View: Comisiones atrasadas / Requieren acción

**Query logic:** Filter `CommissionCutAdvisorState` (or equivalent aggregation) where:

- `state !== 'PAID'` **and**
- (`lateReasons?.length > 0` **or** invoice/payment overdue **or** `movedToNextCut === true` **or** past deadline)

Or use the existing `isOverdue` logic in `commission-cuts.page.ts` and extend it to include `lateReasons` and deferred states.
