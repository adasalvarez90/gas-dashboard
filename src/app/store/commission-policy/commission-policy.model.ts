// Interfaces
import { Metadata } from 'src/app/models/metadata.model';

export type CommissionSchemeCode = 'A' | 'B';

/** Comparisons on `contract.yieldPercent` (single operand). */
export type YieldCompareOperator = '<' | '>' | '<=' | '>=' | '=' | '!=';

/**
 * Optional yield filter on a rule. Omitted or null = no condition (rule applies on scheme + payment type only).
 * Stored in Firestore as a plain object (discriminated by `type`).
 */
export type YieldConditionDto =
	| { type: 'compare'; operator: YieldCompareOperator; value: number }
	| { type: 'between'; low: number; high: number };

export interface CommissionPolicyRule {
	scheme: CommissionSchemeCode;
	/** Extra commission points (e.g. 1 = +1%) when this rule matches. */
	additionalPercent: number;
	appliesToImmediate: boolean;
	appliesToRecurring: boolean;
	yieldCondition?: YieldConditionDto | null;
}

/**
 * Dinámica especial (Firestore + legacy fields).
 * Prefer `allowedSchemes` + `rules`; legacy `scheme` / overrides are normalized for the engine.
 */
export interface CommissionPolicy extends Metadata {
	name: string;
	active: boolean;

	/**
	 * Legacy / datos viejos en Firestore. La “vigencia” operativa es solo `active`
	 * (inactiva = no auto-asigna; sí puede asignarse a mano en tranche).
	 */
	validFrom?: number;
	validTo?: number;

	/** Multiselect: rules may only use schemes in this set. */
	allowedSchemes?: CommissionSchemeCode[];
	rules?: CommissionPolicyRule[];

	/**
	 * Optional tie-break for auto-assignment (higher wins).
	 * Si empata, gana el documento con `_create` más reciente (ver `resolveDynamicForTranche`).
	 */
	priority?: number;

	// --- Legacy (pre–rules model); normalized into `rules` for computation ---
	/** @deprecated use `allowedSchemes` + `rules` */
	scheme?: CommissionSchemeCode;
	/** @deprecated not used by rule engine */
	yieldPercent?: number;
	/** @deprecated legacy Scheme A total % override */
	overrideTotalCommissionPercent?: number;
	/** @deprecated legacy Scheme A immediate % override */
	overrideImmediatePercent?: number;
}

/** Policy after `normalizeCommissionPolicy` (safe for engine + resolver). */
export interface NormalizedCommissionPolicy extends CommissionPolicy {
	allowedSchemes: CommissionSchemeCode[];
	rules: CommissionPolicyRule[];
}
