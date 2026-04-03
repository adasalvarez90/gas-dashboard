# Commission Cuts — Implementation Reference

This document describes the **implemented** Firestore and TypeScript shapes for commission cuts (see [commission-cuts.md](./commission-cuts.md) for domain rules).

---

# Hybrid commission state (implemented)

**Aligned with** [commissions.md](./commissions.md) — *Commission state model*.

| Layer | Role |
|-------|------|
| **`CommissionPayment` (per `uid`)** | **Source of truth:** workflow timestamps and flags on each line — see *CommissionPayment — workflow fields* below. Deadlines and stripes computed **per line** (and aggregated for the card). |
| **`CommissionCutAdvisorState` (`commissionCutAdvisorStates`)** | **Not used** by the Commission Cuts dashboard for workflow reads or writes. The service may remain in the repo for legacy data or future use; **do not** assume it stays in sync with payments. |
| **Advisor card UI** | **Derived** from child payments: `deriveAdvisorWorkflowFromPayments` → label includes **MIXED** when lines disagree (`cardWorkflowUiKey` / `stateLabel`). |

**Behavioral requirements (enforced in app):**

- Desglose / factura / pago / motivos tarde escriben en **documentos `commissionPayments`** (`CommissionPaymentFirestoreService`: `applyBreakdownSentToPaymentUids`, `applyInvoiceSentToPaymentUids`, `applyPaidToPaymentUids`, `mergeLateReasonToPaymentUids`, `movePaymentsToNextCut`, Path 2 `completeDeferredPath2OnPaymentGroups`, etc.).
- **No** `upsert` de un solo estado por asesora+corte que avance todas las líneas.
- Una **factura** puede enlazarse en **varias** filas (misma URL en cada `uid` que aplique).
- Líneas **diferidas** se actualizan por `uid`; no se propagan cambios a hermanas en el mismo bucket salvo acción explícita de conjunto en UI.

---

# Processing modes: GROUPED vs INDIVIDUAL

| Mode | UI trigger | Code |
|------|------------|------|
| **GROUPED** | Botones de tarjeta asesora: desglose, factura (con/sin archivo), pagada; menú `...` de adjuntos | `commission-cuts.page.ts` pasa `'GROUPED'` a `applyDeferredCaseInvoiceFlow` / `applyDeferredCaseMarkPaidFlow`; desglose usa **todas** las líneas pendientes del resumen sin ramas Case 1/2. |
| **INDIVIDUAL** | *Procesar seleccionadas* (Path 2) | `completeDeferredPath2OnPaymentGroups` + `targetCutDate` / `deferredToCutDate` según fechas; `applyDeferredCase*` con `mode === 'INDIVIDUAL'` conserva el comportamiento histórico (classifier + `clearDeferredToCutDate` + `movePaymentsToNextCut` donde aplique). |

**GROUPED — garantías:** No recalcular corte destino por fechas; no quitar `deferredToCutDate` por fecha “antes del corte diferido”; no `movePaymentsToNextCut` desde acciones de factura tarde a nivel tarjeta. Las fechas siguen escribiendo `breakdownSentAt` / `invoiceSentAt` / `paidAt` y motivos en cada `CommissionPayment`.

**Tipo:** `CommissionProcessingMode` en `src/app/models/commission-processing-mode.model.ts`.

---

# CommissionPayment — workflow fields (authoritative)

Persisted on each `commissionPayments` document (names as in `commission-payment.model.ts`):

| Field | Role |
|-------|------|
| `breakdownSentAt`, `invoiceSentAt`, `receiptSentAt` | Timestamps del flujo (comprobante alineado con pago: `receiptSentAt` / `paidAt` según implementación). |
| `invoiceUrl`, `receiptUrl` | Adjuntos por línea. |
| `lateReasons` | `LateReasonEntry[]` por comisión. |
| `paidLate` | Auditoría “pagada con paso tarde”. |
| `deferredToCutDate` | Puntero de vista en otro corte (sin segundo documento). |
| `movedToNextCut`, `workflowOriginalCutDate` | Arrastre por factura tarde / trazabilidad de origen. |

**Inferencia de paso:** `inferCommissionWorkflowState` (PENDING → BREAKDOWN_SENT → SENT_TO_PAYMENT → PAID) desde esos campos.

**Diferido en UI:** `paymentWorkflowStateAtCut(payment, cutDate)` devuelve estado sintético solo en **corte origen** o en **`deferredToCutDate`**; en cortes intermedios de la cadena → `null` (sin avance local), coherente con `getEffectiveDeferredDisplayCut` vía `computeDeferralDisplayIndexFromPayments`.

---

# CommissionCutAdvisorState — legacy schema (reference only)

**Optional Firestore collection.** The **Commission Cuts** page does **not** load or write it. The **synthetic** type `CommissionCutAdvisorState` is still used in TypeScript for **UI aggregates** built from payments (`commissionPaymentToSyntheticAdvisorState`, merged card state).

The table below documents the **legacy** document shape if the collection exists in old environments:

**Historical note:** These fields were duplicated from advisor docs; the **current** app mirrors the same *shape* in memory for the card, but persistence is on **`CommissionPayment`**. If you extend the legacy collection, keep it consistent with this doc — but new work should touch **payments** only.

**If** the collection is retained for non-dashboard consumers, it may still include:

| Field | Type | Description |
|-------|------|-------------|
| `lateReasons` | `LateReasonEntry[]` | One or more late reason entries. See schema below. |
| `paidLate` | `boolean` | `true` when the commission was paid after the normal deadline (exception payment before next cut). Keeps the "paid late" color for audit. |
| `originalCutDate` | `number` | When the state was deferred from a previous cut, this stores the cut date from which it originated. Used to label "Diferida" and for audit. |
| `movedToNextCut` | `boolean` | (existing) `true` when the commission moved to the next cut due to late invoice. |

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
| `PAGO_NO_REALIZADO_A_TIEMPO` | El pago no se realizó a tiempo |

```typescript
// Example: src/app/models/commission-cut-late-reason.model.ts
export const COMMISSION_CUT_LATE_REASONS: Record<string, string> = {
  DESGLOSE_NO_ENVIADO_A_TIEMPO: 'El desglose no se envió a la asesora a tiempo',
  FACTURA_NO_RECIBIDA_A_TIEMPO: 'No se recibió factura a tiempo',
  PAGO_NO_REALIZADO_A_TIEMPO: 'El pago no se realizó a tiempo',
};
```

---

# CommissionCutAdvisorState — full legacy document schema (if present in Firestore)

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
| `paymentDeadline` | `number` | No | Deadline for payment (2 business days from sent to payment) |
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

## Persistence — one document per commission line (no clone in deferred cut)

- **Do not** create a **second** `CommissionPayment` document to represent “the same commission in the deferred cut.”
- **Do** keep **one** row with immutable **`cutDate`** (origin) and optional **`deferredToCutDate`** as a **pointer**: the row is included when listing either cut (`cutDate === selectedCut` **or** `deferredToCutDate === selectedCut`).
- Advancing deferral (e.g. next month’s cut) = **update** `deferredToCutDate` (and related flags) on that **same** `uid`; never duplicate the payment for the destination cut.
- Domain detail: `docs/domain/commission-cuts.md` → *Deferred Commission Payment Behavior* → **Persistence in the database**.

When a commission is **deferred** to the next cut (current code paths):

- `movePaymentsToNextCut` sets `deferredToCutDate` on the **existing** payment. **`cutDate`** stays the original cut.
- The commission **appears** in **both** cuts in the UI because queries match **`cutDate` OR `deferredToCutDate`** — still **one** Firestore document.
- `markCommissionPaymentsPaidByCutDateAndAdvisor` finds payments by `cutDate` OR `deferredToCutDate`. On pay, clears `deferredToCutDate` as appropriate.

## Diferida — agregación en pantalla (Cortes de comisión)

Una misma línea de pago **solo puede listarse en dos cortes a la vez** (como mucho), siempre como **proyección** de la **misma** fila:

1. **Corte original** (`cutDate`).
2. **Un único corte destino “actual”** cuando aplique: el pago se encadena mes a mes si cada corte intermedio también vence el mismo flujo (2 hábiles desglose desde el corte, etc.); **no** se listan en febrero y marzo a la vez: solo **original + último destino** (ej. ene atrasada + mar diferida). `deferredToCutDate` en Firestore puede quedar desfasado respecto al “destino efectivo” de reglas de negocio; la UI usa `getEffectiveDeferredDisplayCut` con estado inferido por línea (`paymentWorkflowStateAtCut` dentro de `computeDeferralDisplayIndexFromPayments`) — sin mapa de `commissionCutAdvisorStates` y sin duplicar documentos de pago.

Implementación: `computeDeferralDisplayIndexFromPayments`, `getDeferralEndCutDate` / horizonte, `addToBucket` en `commission-cuts.page`; `paymentRolledIntoSummaryCut` compara el resumen con ese destino efectivo.

## Attach flow guardrails (invoice / receipt)

- Prompt order is strict: **date → late reason (if needed) → file picker**.
- If user cancels date or reason modal, stop flow with no writes.
- `LateReasonEntry.text` is optional and must not be saved as `undefined` in Firestore (sanitize in `CommissionPaymentFirestoreService` before `updateDoc`).
- Status writes occur after successful upload; avoid false-negative UX errors for optional text.

## Advisor card actions (`...`)

Per advisor card in `commission-cuts.page` (gates use **derived** workflow, including **MIXED**):

- `PENDING`: no `...` menu.
- `BREAKDOWN_SENT`: menu with `Subir Factura`.
- `SENT_TO_PAYMENT`: menu with `Subir Comprobante`.
- `PAID`: menu with both (`Subir Factura`, `Subir Comprobante`) for attachment replacement / audit.
- **`MIXED`** (lines disagree): both upload options (same as practical need for partial progress).

Status transitions from **card-level** buttons use **GROUPED** mode: escriben en **todas** las líneas pendientes del resumen (incluidas diferidas con `deferredToCutDate ===` corte del card), **sin** splits Case 1/2 ni traslado automático por factura tarde. La fila **MIXED** muestra **Desglose / Factura / Pagada** con la misma semántica **GROUPED**.

## Path 2: selección de diferidas (`completeDeferredPath2OnPaymentGroups` + `targetCutDate`)

Al procesar comisiones diferidas seleccionadas con fechas retroactivas:

- **`cutDate`** nunca se modifica; siempre es el corte original.
- **`targetCutDate`** = corte donde se procesó (≤ desglose, con restricción de piso).
- **`deferredToCutDate`**: Si `targetCutDate === originalCutDate` → se elimina; si no → se actualiza a `targetCutDate`.
- **Piso:** `getMinValidTargetCut(originalCutDate, deferredCutDate)` — no se puede asignar a un corte anterior al primer corte en que fue diferida. Implementado en `commission-cut-deadlines.util.ts`.
- **Agrupación:** Si las comisiones seleccionadas tienen distintos `cutDate` (original), se agrupan y cada grupo se procesa con su propio `originalCutDate` y `targetCutDate`.
- **Persistencia del flujo completo en Path 2:** `completeDeferredPath2OnPaymentGroups` escribe en **cada** `uid` desglose, factura, envío a pago, comprobante, `paid` / `paidAt` / `receiptSentAt`, `paidLate`, `lateReasons` (PAGO si aplica) y `deferredToCutDate` según `targetCutDate` (o `deleteField` si Case 1a).
- **Utilidades** (`commission-cut-deadlines.util.ts`): `getLastCutDateOnOrBefore(ts)` = corte ≤ fecha; `getPreviousCutDate(cutDate)` = corte anterior en secuencia 7/21; `getMinValidTargetCut(original, deferred)` = mínimo corte válido para asignación.

## Deferred commission — dual representation & status sync (see commission-cuts.md)

Domain reference: **“Deferred Commission Payment Behavior”** in `commission-cuts.md`.

Implementation enforces:

1. **One underlying commission** = **one** `CommissionPayment` document; it may **appear** in **original cut** (`cutDate`) and **deferred cut** via **`deferredToCutDate`**; UI rows are **query views**. **Consistency** = los mismos campos en **ese único documento**; no hay segundo doc de estado por asesora que deba mantenerse al día para el dashboard.
2. **Case 1 — all user dates strictly before the Mexico calendar day of the current `deferredToCutDate`:** Compute **`targetCutDate`** (Path 2: `getLastCutDateOnOrBefore` + `getMinValidTargetCut` floor).  
   - **Case 1a** (targetCutDate equals the payment’s origin cutDate): clear `deferredToCutDate`; persist workflow fields on the **payment** row only.  
   - **Case 1b** (`targetCutDate` strictly between original and former deferred): set `deferredToCutDate = targetCutDate` on the **same** payment row; UI must not list the row under later cuts in the old chain.  
   See **“Ejemplos canónicos”** 3 and 4 in `commission-cuts.md`.
3. **Case 2 (status dates on or after the deferred cut day):** Keep visibility in **original + current deferred** cut; **same** breakdown / invoice / payment fields on the **single** payment document (both cuts are views of that row). **GROUPED** card flows apply updates to **all** pending **uids** in the advisor summary row (including deferred-in-cut) **without** Case 1/2 splitting; **INDIVIDUAL** (Path 2) uses `targetCutDate` / `deferredToCutDate` rules above.
4. **`cutDate` on the payment row** remains the **original** cut; do not rewrite origin.
5. After writes, **`refreshCutData(true)`** → `loadCommissionPaymentsForCuts` refreshes the store (no local advisor-state merge).

---

# Implementation decisions (defaults) — enforced in code

## 1. Identity / dedupe

- **Canonical row:** `CommissionPayment.uid` is the unique commission line. Deferral and reconciliation only **update** that document; never insert a clone for the deferred cut.

## 2. Persist `deferredToCutDate` on enter (reconcile)

- **When:** `ionViewWillEnter` on **Commission Cuts** runs `CommissionPaymentFirestoreService.reconcileDeferredToCutDates(payments)` (solo lista de pagos del store).
- **What:** `computeDeferralDisplayIndexFromPayments` → `effectiveByUid` por línea; para cada pago activo no pagado, alinear `deferredToCutDate` en Firestore con el destino efectivo o limpiar con `deleteField` (idempotente, chunks de **400**). Si hubo cambios, `loadCommissionPaymentsForCuts`.

## 3. GROUPED — resumen con diferidas (`deferredToCutDate ===` corte del card)

- Desglose: `downloadCalculationAndMarkBreakdown` → `applyBreakdownSentToPaymentUids` sobre **todos** los `uid` pendientes del resumen (no classifier).
- Factura / pago (y adjuntos): `applyDeferredCaseInvoiceFlow` / `applyDeferredCaseMarkPaidFlow` con `mode: 'GROUPED'` → aplican a líneas con prerequisito (desglose / factura) **sin** `clearDeferredToCutDateForPaymentUids` y **sin** `movePaymentsToNextCut` por factura tarde en ese flujo.

## 4. INDIVIDUAL — Case 1 vs Case 2 (fechas vs corte diferido)

- Aplica a **Path 2** (`completeDeferredPath2OnPaymentGroups`) y a `applyDeferredCase*` cuando `mode === 'INDIVIDUAL'` (p. ej. futuras herramientas o llamadas explícitas).
- **Classifier:** `classifyDeferralPaymentCase(deferredCutDate, actionTimestamps)` — comparación por **día calendario México** (`YYYY-MM-DD`): estrictamente **antes** del día del corte diferido → **BEFORE** (Case 1); mismo día o después → **ON_OR_AFTER** (Case 2).
- **Case 1:** `clearDeferredToCutDateForPaymentUids` cuando aplica; escrituras en orígenes según implementación previa.
- **Case 2:** mantener puntero; mismos campos en la **misma** fila.
- Factura tarde en flujo **INDIVIDUAL** con diferidas: `movePaymentsToNextCut` + `mergeLateReasonToPaymentUids` en `applyDeferredCaseInvoiceFlow` como antes.

## 5. Batches & failures

- Reconcile, `clearDeferredToCutDateForPaymentUids`, y Path 2 usan batches / updates acotados (**400** donde aplica). Si un flujo falla a mitad, error visible; evitar toasts de éxito optimista.

## 6. Legacy `commissionCutAdvisorStates`

- El dashboard **no** lee ni escribe esta colección. Si quedan documentos viejos, no afectan la pantalla; pueden borrarse o migrarse a solo-pagos según operación.

### Code map

| Area | Location |
|------|----------|
| Reconcile, Path 2 complete, apply breakdown/invoice/paid, patch attachments, `movePaymentsToNextCut`, `getPaymentUidsForCutAndAdvisor` | `commission-payment-firestore.service.ts` |
| `computeDeferralDisplayIndexFromPayments`, Case classifier, `normalizeDeferredToCutStored`, `sameCanonicalCutDate` | `commission-cut-deadlines.util.ts` |
| `inferCommissionWorkflowState`, `paymentWorkflowStateAtCut`, `deriveAdvisorWorkflowFromPayments`, synthetic advisor shape | `commission-payment-workflow.util.ts` |
| Deferred summary, Case 1/2 flows, `enterCommissionCuts`, UI MIXED | `commission-cuts.page.ts` / `.html` / `.scss` |
| Optional legacy service (unused by page) | `commission-cut-state-firestore.service.ts` |

**Nota:** Path 2 usa `completeDeferredPath2OnPaymentGroups` (un update por comisión con flujo completo). Las acciones de tarjeta alinean `targetCutDate` / Case 1b con los mismos utilitarios que el **ejemplo canónico 4** donde aplica.

---

# Excel export — Desglose sheet

**Code:** `src/app/services/excel-export.service.ts` → `buildSheetDesglose`.

Aligned with [commissions.md](./commissions.md) (*Excel export — Desglose sheet*):

| Rule | Implementation detail |
|------|------------------------|
| Row grain | Iterate unique `(contractUid, trancheUid)` from `commissionPayments` for the cut, per block (`IMMEDIATE` / `FINAL` / `ADJUSTMENT` vs `RECURRING`). |
| Capital / Depósito | From `Tranche` for that `trancheUid` (`amount`, `fundedAt`). |
| Commission columns | `sumPaymentsByRole` and totals use only payments in that tranche slice matching the block’s types. |
| Sort | Investor (`Contract.investor`), then `Tranche.sequence`, then `trancheUid`. |

---

# View: Comisiones atrasadas / Requieren acción

**Logic (Commission Cuts page):** Derivado de **`AdvisorCutSummaryWithState`** construido desde pagos: `isOverdue` combina plazos de factura/pago vía estado fusionado de la tarjeta, `lateReasons`, y banderas de diferido (`movedToNextCut` / `workflowOriginalCutDate` en líneas). Filtros **noncompliance** / **paidLate** usan `summaryHasAnyPaidLateStrip` y stripes por línea (`getPaymentStripStatus` + `commissionPaymentToSyntheticAdvisorState`). **No** depende de una query a `commissionCutAdvisorStates`.
