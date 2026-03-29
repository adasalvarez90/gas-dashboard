# Commission Cuts / Summary Page

A dedicated page for commission cuts that aggregates commissions by advisor (asesora) and provides PDF export. Payment actions are **not** performed in the contract view; see commissions.md.

**State model (hybrid, implemented):** Each **commission line** (`CommissionPayment`) holds authoritative **timestamps, late reasons, attachments, and deferral fields**. The advisor + cut grouping is **UX only**; the card header is **derived** from those lines (including **MIXED** when steps differ) — see [commissions.md](./commissions.md). The dashboard **does not** read or write `commissionCutAdvisorStates` for workflow. Card actions update **payment** documents (or explicit subsets such as deferred selection).

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

1. Find all contracts that have commissions for the **specified cut** — including payments whose **`cutDate`** is that cut **or** whose **`deferredToCutDate`** is that cut (same physical row; see “Persistence in the database” under *Deferred Commission Payment Behavior*).
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

# Commission Status (authoritative per line)

**Source of truth:** each **commission** (`CommissionPayment` row) has its own status and timestamps. The advisor card shows a **derived** summary (Pendiente / Parcial / En proceso / same status / Pagada) computed from its lines — not a parallel authority.

| Status | Description |
|--------|-------------|
| **Pendiente** | Initial state when commission is generated |
| **Desglose enviado** | Breakdown for **this** commission was sent (date stored on the line) |
| **Enviada a pago** | Invoice linked for **this** line (or included in a shared invoice that is linked to this line) |
| **Pagada** | Payment receipt linked for **this** line; line marked paid |

Deadlines, **red/yellow/orange/green**, and **`lateReasons`** are evaluated **per commission** (using that line’s cut / deferral context).

---

# Status Workflow (commission-scoped actions)

1. Commission is generated → that line → **Pendiente**.
2. User sends breakdown for **selected** line(s) → only those lines → **Desglose enviado** (with date on each).
3. Advisor generates invoice; user attaches **one** file that may cover **multiple** selected lines → each included line moves to **Enviada a pago**, subject to prerequisites (e.g. line must already be Desglose enviado if rules require it).
4. User attaches payment proof → **selected** lines (or lines covered by the same receipt) → **Pagada**.

**No automatic propagation:** an action must **not** advance every commission under the advisor card unless the user explicitly selects them (or the UI action is explicitly “apply to all” with confirmation).

---

# File Attachments (per commission; optional one invoice many lines)

- **Factura:** Each commission must **reference** the invoice (URL/storage id). One physical file may back **several** commissions in the same advisor + cut if the user groups them; **compatibility rules** apply (e.g. do not include a line still Pendiente de desglose if invoice requires prior desglose).
- **Comprobante:** Same idea — per-line link; one file may cover multiple lines when allowed.

**The user can attach the invoice to a late commission at any time** — subject to the compatibility rules above. Exceptions: see Deferred & Exception Rules.

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

## Siguiente corte al diferir (mismo día 7 o 21, mes siguiente)

Al **arrastrar** una comisión impaga al siguiente ciclo de negocio, el destino **no** es el otro día del **mismo** mes (p. ej. **no** es 7 mar → **21 mar**). Es el **mismo día de corte** (7 u 21) en el **mes calendario siguiente**:

| Corte original | Primer destino de diferido |
|----------------|----------------------------|
| **7 marzo** | **7 abril** |
| **21 marzo** | **21 abril** |

Misma regla que `getNextCutDate` en código. Si vuelve a incumplirse el flujo en ese destino, la cadena avanza **7 abr → 7 may**, etc.; en pantalla solo **original + un** `deferredToCutDate` vigente.

## Commission Cuts UI — una diferida, como mucho dos cortes

En la pantalla **Cortes de comisión**, la misma línea de pago **no** se acumula en todos los cortes futuros. Regla:

- Como mucho en **dos** cortes: **original** (`cutDate`) + **un** destino cuando corresponda — siempre como **vistas** de la **misma** fila en BD (`cutDate` + referencia `deferredToCutDate`), no como dos pagos duplicados.
- **Destino explícito:** `deferredToCutDate` (p. ej. factura tarde) e impaga.
- **Destino implícito (todos los `paymentType`):** el siguiente 7/21 del **mes siguiente** (no el otro corte del mismo mes) **solo si** (1) ya ocurrió el día de corte original (fecha México) y (2) el flujo desglose → factura → comprobante tiene un paso **vencido** según plazos de 2 días hábiles y los timestamps en **`CommissionPayment`** (vía `paymentWorkflowStateAtCut` / estado sintético por corte; en cortes intermedios de la cadena no hay “avance local” hasta origen o `deferredToCutDate`). **No** depende de inmediata vs recurrente.
- No se muestra la misma fila en ene + feb + mar + abr a la vez: solo **origen + último `deferredToCutDate`** que aplique tras reconciliar o tras una acción del usuario.

---

# Deferred Commission Payment Behavior (domain rule)

*Canonical English spec for precision. Complementa “Payment Flow with Deferred Commissions” y “Exception Rules”.*

## Context

A commission can exist in two places **in the UI**:

- Its **original cut** (`cutDate`)
- A **deferred cut** (via `deferredToCutDate`) if it was carried forward

The system may show the **same commission in both cuts**; that is **one underlying record** in the database, not two copies.

## Persistence in the database — single row + reference (no duplicate payments)

**Rule:** Do **not** persist a second `CommissionPayment` (or equivalent) for the same logical commission just because it appears in the deferred cut.

| Stored | Role |
|--------|------|
| **`cutDate`** | Immutable **origin** cut for that payment row. Never rewritten to “move” the commission to another month. |
| **`deferredToCutDate`** (optional) | **Reference only**: “this same row is also included / actionable when the user is viewing this deferred cut.” Clearing or updating this field removes or moves that **visibility**, not a second document. |

**Queries** for “commissions in cut X” must include payments where **`cutDate === X`** **or** **`deferredToCutDate === X`** (plus your other filters). Two list rows in two cuts = **one** persisted payment hit twice by two different query keys — not two inserts.

**Deferral chain (ene → feb → mar):** Each step **updates fields on the same document** (e.g. set `deferredToCutDate` to the new target, or clear it when Case 1 applies). **Never** insert a duplicate payment for the same commission to “put it” in the destination cut.

**Idea de “materializar al entrar a la página”:** La app corre un pase idempotente (`reconcileDeferredToCutDates`) que solo **muta** filas `CommissionPayment` (alinea `deferredToCutDate` con el índice efectivo) — **sin** duplicar comisiones; identidad estable = `CommissionPayment.uid`.

This persistence model is what makes Case 1 / Case 2 (below) implementable without split data: status and dates live on **one** commission payment; `deferredToCutDate` only controls **where else** it appears until removed.

## Rule

When a commission is overdue (**diferida**), the user can process (pay) it **independently of the cut where it is currently displayed**.

The user **manually provides the dates** for each status:

- Breakdown sent  
- Invoice received  
- Payment completed  

Behavior depends on how those dates relate to the **current** **`deferredToCutDate`** (corte diferido **vigente** en BD) and on the inferred **`targetCutDate`** (corte de negocio donde encajan las fechas; misma idea que Path 2).

### Case 1 — All status dates **strictly before** the **calendar day** of the current `deferredToCutDate`

When **every** relevant user date is **strictly before** the **Mexico calendar date** of the **current** deferred cut (e.g. all in March when `deferredToCutDate` is **7 abril**):

The system must:

1. Compute **`targetCutDate`** = latest business cut (7 or 21) **≤** those dates (e.g. `getLastCutDateOnOrBefore` on the breakdown / earliest date).
2. Apply the **floor**: the commission **cannot** be assigned to a cut **before** the first cut where it was deferred (`getMinValidTargetCut(originalCutDate, deferredCutDate)` with the **current** deferred cut before mutation).
3. **`targetCutDate`:** si el candidato es mayor o igual al piso, usar el candidato; si no, usar el piso (Path 2: `candidate >= minValid ? candidate : minValid`).

Then branch:

- **Case 1a — Resolved in the original cut (`targetCutDate === cutDate`):**  
  - **Clear** `deferredToCutDate`.  
  - The row appears **only** under the **original** cut (plus normal queries).  
  - Persist all step dates on the **`CommissionPayment` row** (único documento).  
  - **Example:** Original **7 mar**, deferred **7 abr**, user dates **8–10 mar** → todo antes del día **7 abr** y corte ≤ fechas = **7 mar** → se elimina el diferido.

- **Case 1b — Resolved in an intermediate cut (`targetCutDate !== cutDate` but still before current deferred calendar day):**  
  - **Set** `deferredToCutDate = targetCutDate` (e.g. **7 feb**).  
  - **`cutDate` (origin) never changes.**  
  - The commission appears in **original + `targetCutDate` only**; it **must not** appear in later cuts that were only part of the old chain (e.g. **7 mar**, **7 abr** drop off the UI once the pointer moves back to **7 feb**).  
  - **Same** breakdown / invoice / payment fields on the **single** payment document (both cuts are views of that row — no “split brain” because there is only one persisted row).  
  - **Example:** Origin **7 ene**, chain had pointed to **7 abr**; user provides **15–17 feb** → `targetCutDate` = **7 feb** (≥ floor **7 feb**) → `deferredToCutDate` becomes **7 feb**; ene + feb visible, not mar/abr.

**Interpretation:** “Before the deferred cut” means **before the current deferred cut’s day**, not necessarily “everything happened in the origin month.” If dates fall in an **allowed** intermediate month, the system **rewinds** the deferral pointer to that cut instead of wiping deferral entirely.

### Case 2 — Status dates **on or after** the deferred cut

If the user provides status dates that are **equal to or later than** **`deferredToCutDate`**:

The system must:

1. **Keep** the commission in the **deferred** cut (still actionable / visible there as needed).
2. **Also keep** the commission in the **original** cut **for traceability** (same underlying record, two views).
3. **Synchronize** status data: cualquier actualización hecha “desde” el corte diferido vive en el **mismo** `CommissionPayment`; el corte original y el diferido son **vistas** de esa fila, así que los campos son idénticos por definición.

**Interpretation:** Processing truly occurred in the **deferred** period; both cuts remain for history as **query projections** of one row — **no split brain**.

## Key constraints

| Constraint | Meaning |
|------------|---------|
| **`cutDate` (original)** | **Never modified** — it remains the commission’s origin cut. |
| **`deferredToCutDate`** | **Single** pointer: where the row is also shown / actionable besides `cutDate`. Case 1 may **clear** it (1a) or **rewind** it to an intermediate cut (1b). |
| **Consistency** | Una sola fila: mismos timestamps y adjuntos en origen y diferido (no hay segundo documento de flujo por asesora+corte en el dashboard). |
| **Audit** | Ambas vistas (cuando existen) leen los **mismos** campos del `CommissionPayment`. |

## Summary

| Situation | `deferredToCutDate` | Visible cuts (máx.) | Status / fechas |
|-----------|----------------------|---------------------|-----------------|
| **Case 1a** — fechas antes del día del diferido vigente **y** `targetCutDate === cutDate` | Se **elimina** | Solo **original** | Solo en original |
| **Case 1b** — fechas antes del día del diferido vigente **y** `targetCutDate` intermedio | Se **actualiza** a `targetCutDate` | **Original + target** | Un solo doc: mismos campos en ambas vistas |
| **Case 2** — alguna fecha ≥ día del diferido vigente | Se **mantiene** (corte diferido actual) | **Original + diferido vigente** | Un solo doc: mismos campos en ambas vistas |

---

# Ejemplos canónicos (pago de comisiones)

Referencias alineadas con las reglas anteriores y con Path 2 (`targetCutDate`, `getMinValidTargetCut`).

## 1. Comisión pagada a tiempo

**Corte:** 7 marzo.

| Paso | Fecha |
|------|--------|
| Generación / corte | 7 mar |
| Desglose | 8 mar |
| Factura | 9 mar |
| Pago | 10 mar |

**Resultado:** 🟢 Verde (ningún paso fuera de su plazo de 2 hábiles, según reglas de color).

**BD / UI:** solo **`cutDate = 7 marzo`**. Sin `deferredToCutDate` (o sin usarlo). Nunca estuvo en otro corte como diferida.

---

## 2. Comisión atrasada y pagada en el corte diferido

**Corte original:** 7 marzo. Incumplimiento → siguiente destino de negocio **7 abril** (**no** 21 marzo).

**Antes de pagar:** `cutDate = 7 mar`, `deferredToCutDate = 7 abr`. La misma línea se ve en **mar** y en **abr**.

**En el corte 7 abril** el usuario registra (tarde): desglose 8 abr, factura 10 abr, pago 12 abr.

**Resultado:** 🟠 Naranja (hubo atraso respecto a los plazos). La comisión **sigue** en **7 mar** (histórico) y **7 abr** (donde se cerró el flujo). Estados/fechas **alineados** en ambas vistas (Case 2).

---

## 3. Atrasada, pero fechas **antes** del corte diferido vigente (solo marzo)

**Origen:** 7 mar. **Diferido a:** 7 abr → `deferredToCutDate = 7 abr`.

**Acción (p. ej. Path 2 o flujo equivalente):** desglose **8 mar**, factura **9 mar**, pago **10 mar** — **todas** estrictamente **antes del día 7 abr** en calendario México.

**Sistema:** `targetCutDate` = corte ≤ fechas = **7 mar** = `cutDate` → **Case 1a.**

**Resultado:** se **elimina** `deferredToCutDate`. La línea **ya no** aparece en **abril**. Solo **7 mar**. Color 🟢 o 🟠 según si esas fechas cumplen o no los 2 hábiles por paso (puede ser naranja si algo iba tarde respecto al corte 7 mar).

---

## 4. Diferida en cadena (ene → feb → mar → abr) y pago con fechas en un corte intermedio

**Antes de la acción:** `cutDate = 7 ene`, `deferredToCutDate = 7 abr` (la UI solo muestra **ene + abr**; la cadena interna ya “pasó” por feb/mar al avanzar el puntero).

**Acción (Path 2 selectivo):** desglose **15 feb**, factura **16 feb**, pago **17 feb**.

**Sistema:**

1. Corte ≤ fechas → **7 feb**.
2. Piso: no asignar antes del **primer** corte en que fue diferida → **7 feb** es válido (≥ piso).
3. **Case 1b:** `cutDate` sigue **7 ene**; `deferredToCutDate` pasa a **7 feb** (ya no **7 abr**). Desaparecen de la vista los cortes **posteriores** a feb que solo existían por la cadena (p. ej. **7 mar**, **7 abr**).

**Resultado visual:** la comisión “vivía” en ene+abr, pero las fechas demuestran cierre en **feb** → el sistema **rebobina** el puntero a **7 feb**. **🟠 Naranja** casi seguro (debía cerrarse en ene; auditoría de pago tardío se conserva).

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

- User follows the flow (download breakdown, invoice, receipt) for a **defined set of lines** — in the hybrid model, that set must be **explicit** (e.g. “all pending in this advisor card” with confirmation, or pre-selected checkboxes). **Do not** mutate lines the user did not include in that set.
- Because there are deferred commissions in the set, the system **asks for a reason** before proceeding:
  - **Motivo** (required): Why these deferred commissions are being paid in this cut.
  - **Texto** (optional): Additional explanation.
- That reason is recorded on **each** commission in the set (or per line as required for audit).
- Flow continues: attach invoice → attach receipt. **One** invoice file may cover **multiple** lines in the set; each line must **link** to it. Same for receipt when rules allow grouping.

## Path 2: Process only selected deferred commissions

- User **selects** one or more deferred commissions (some or all, only diferida).
- User provides **dates** for each step: desglose, factura, comprobante.
- **Target cut logic** (cuando las fechas caen **antes del día** del corte diferido vigente — alinea con **Case 1a / 1b** arriba):
  - `targetCutDate` = corte ≤ fecha desglose (`getLastCutDateOnOrBefore`).
  - **Restricción:** Una comisión no puede asignarse a un corte anterior al primer corte en que fue diferida (`getMinValidTargetCut(originalCutDate, deferredCutDate)`).
    - **Ej. incorrecto:** Original 7 feb → diferida a 7 mar → 21 mar. Desglose = 5 mar → corte ≤ 5 mar = 21 feb. La comisión saltó 21 feb al diferirse a 7 mar → **no** se puede asignar a 21 feb; `targetCutDate` = 7 mar.
    - **Ej. correcto (intermedio):** Ver **ejemplo canónico 4** (origen 7 ene, diferido vigente 7 abr, fechas 15–17 feb → `targetCutDate` = 7 feb, `deferredToCutDate` actualizado a 7 feb).
    - **Ej. correcto (solo original):** Ver **ejemplo canónico 3** (origen 7 mar, diferido 7 abr, fechas 8–10 mar → `targetCutDate` = 7 mar → se **quita** `deferredToCutDate`).
  - Si desglose ≥ día del corte diferido actual → `targetCutDate` = corte diferido actual (alineado con **Case 2** al cerrar en ese corte).
- Si se seleccionan comisiones de distintos cortes originales, cada grupo se procesa con su propio `originalCutDate` y `targetCutDate`.
- **`cutDate` (original)** no se modifica nunca; siempre conserva el corte de origen.
- **`deferredToCutDate` después del proceso:** Si `targetCutDate === originalCutDate` → **Case 1a:** se **elimina** el campo (solo original). Si `targetCutDate !== originalCutDate` → **Case 1b o seguimiento en diferido:** se **actualiza** a `targetCutDate` (la comisión queda en origen + ese corte; desaparece de cortes posteriores que ya no son el puntero).
- User provides **motivo** (required), **texto** (optional), **invoice**, and **receipt**.
- **Color logic:** If **any** status date exceeds its step deadline (2 business days in the chain) → **orange** (paid late). Otherwise → **green**. Un paso tarde no se compensa con pasos posteriores “a tiempo”.
- Deferred commissions **not** selected remain pending and will be processed later via Path 1 (or another Path 2 selection).

---

# Guided Flow (Flujo por pasos)

The system guides the user through three steps, **per commission** (or per **explicit multi-select** with shared files):

1. **Desglose**: Download/attach the breakdown for **selected** line(s).
2. **Factura**: Attach invoice (one file may link to **several** selected lines if prerequisites hold).
3. **Pago**: Attach receipt (same grouping rules).

**Deadline per step:** Each transition is evaluated **per commission** (that line’s dates and cut context). If the user attempts to advance after the 2-business-day window for **that line**, the system **asks for a motivo** (required) and optional text **before** allowing the transition.

Record late reasons on **`lateReasons` on each `CommissionPayment`**. The Commission Cuts app does **not** persist workflow on `commissionCutAdvisorStates`; any legacy advisor docs must **not** be treated as source of truth over the line.

## UX rule: date first, reason before file upload

For actions that require file attachment (invoice or receipt):

1. Ask the action date first.
2. If that date exceeds the step deadline, ask motivo (required) + texto (optional) **before opening file picker**.
3. Only after confirmations, open OS file picker.
4. If user cancels date or motivo modal, the process is fully canceled (no upload, no status change).

## UX rule: advisor card + commission rows (hybrid)

- **Card header:** shows **derived** status (Pendiente / Parcial / En proceso / Pagada / etc.) from child commissions — see [commissions.md](./commissions.md).
- **Commission list:** each row shows **its own** status, color, deadlines, and late reasons (source of truth on the line).

**Preferred pattern:** primary actions on **each commission row** (or after **explicit multi-select**). Avoid a single card-level control that updates every line without selection.

## UX rule: advisor-level actions menu (`...`) — optional shortcut only

If a horizontal `...` remains at card level, it must operate on **selected lines** (or open a picker: “¿A qué comisiones aplica?”). Gate visibility on **derived** advisor status, not on a stored advisor-only FSM that ignores per-line state:

- Derived **all Pendiente** (no desglose on any included line): **hide** `...` or show only actions that apply to **selected** Pendiente lines.
- Derived **waiting invoice** (at least one line needs invoice, none blocked): show **Subir Factura** for **selection**.
- Derived **waiting payment**: show **Subir Comprobante** for **selection**.
- Derived **all Pagada**: allow replacement uploads for **selected** paid lines (audit).

Status-change **without** files must still **target selected commissions** and write to **each** `CommissionPayment` (or successor), not a single advisor state that overwrites the group.

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
