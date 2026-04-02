import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { filter, take } from 'rxjs/operators';

import { AlertController, ToastController } from '@ionic/angular';

import * as CommissionPolicyActions from 'src/app/store/commission-policy/commission-policy.actions';
import { CommissionPolicyFacade } from 'src/app/store/commission-policy/commission-policy.facade';
import {
	CommissionPolicy,
	CommissionPolicyRule,
	CommissionSchemeCode,
	YieldCompareOperator,
	YieldConditionDto,
} from 'src/app/store/commission-policy/commission-policy.model';
import {
	collectCommissionPolicyValidationErrors,
} from 'src/app/domain/commission-policy/commission-policy.validation';
import { normalizeBetweenLowHigh } from 'src/app/domain/commission-policy/commission-policy-yield.util';

export type YieldUiOperator = YieldCompareOperator | 'BETWEEN';

export interface RuleDraft {
	scheme: CommissionSchemeCode;
	additionalPercent: number | null;
	appliesToImmediate: boolean;
	appliesToRecurring: boolean;
	yieldEnabled: boolean;
	yieldOp: YieldUiOperator;
	yieldValue: number | null;
	yieldMin: number | null;
	yieldMax: number | null;
}

@Component({
	selector: 'app-commission-dynamic-manage',
	standalone: false,
	templateUrl: './commission-dynamic-manage.page.html',
	styleUrls: ['./commission-dynamic-manage.page.scss'],
})
export class CommissionDynamicManagePage implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly facade = inject(CommissionPolicyFacade);
	private readonly actions$ = inject(Actions);
	private readonly toastCtrl = inject(ToastController);
	private readonly alertCtrl = inject(AlertController);

	isNew = false;
	policyUid: string | null = null;

	name = '';
	active = true;
	allowedSchemes: CommissionSchemeCode[] = [];
	ruleRows: RuleDraft[] = [];

	nameError = '';
	schemesError = '';
	generalErrors: string[] = [];
	ruleErrors: string[][] = [];

	pendingNavigateAfterCreate = false;
	pendingNavigateAfterUpdate = false;

	readonly schemeOptions: { value: CommissionSchemeCode; label: string }[] = [
		{ value: 'A', label: 'Esquema A' },
		{ value: 'B', label: 'Esquema B' },
	];

	readonly yieldOpOptions: { value: YieldUiOperator; label: string }[] = [
		{ value: '<', label: 'Menor que (<)' },
		{ value: '>', label: 'Mayor que (>)' },
		{ value: '<=', label: 'Menor o igual (≤)' },
		{ value: '>=', label: 'Mayor o igual (≥)' },
		{ value: '=', label: 'Igual (=)' },
		{ value: '!=', label: 'Distinto (!=)' },
		{ value: 'BETWEEN', label: 'Entre' },
	];

	private basePolicy: Partial<CommissionPolicy> = {};

	ngOnInit(): void {
		this.facade.loadCommissionPolicies();

		const path = this.route.snapshot.routeConfig?.path ?? '';
		this.isNew = path === 'nueva';
		this.policyUid = this.route.snapshot.paramMap.get('uid');

		this.actions$
			.pipe(
				ofType(CommissionPolicyActions.createCommissionPolicySuccess),
				filter(() => this.pendingNavigateAfterCreate),
				takeUntilDestroyed(),
			)
			.subscribe(() => {
				this.pendingNavigateAfterCreate = false;
				void this.router.navigateByUrl('/dashboard/commission-dynamics');
			});

		this.actions$
			.pipe(
				ofType(CommissionPolicyActions.updateCommissionPolicySuccess),
				filter(() => this.pendingNavigateAfterUpdate),
				takeUntilDestroyed(),
			)
			.subscribe(() => {
				this.pendingNavigateAfterUpdate = false;
				void this.router.navigateByUrl('/dashboard/commission-dynamics');
			});

		this.actions$
			.pipe(
				ofType(
					CommissionPolicyActions.createCommissionPolicyFailure,
					CommissionPolicyActions.updateCommissionPolicyFailure,
				),
				filter(() => this.pendingNavigateAfterCreate || this.pendingNavigateAfterUpdate),
				takeUntilDestroyed(),
			)
			.subscribe(() => {
				this.pendingNavigateAfterCreate = false;
				this.pendingNavigateAfterUpdate = false;
			});

		if (this.isNew) {
			this.resetNewForm();
			return;
		}

		if (this.policyUid) {
			let hydrated = false;
			const tryHydrate = async (list: CommissionPolicy[]) => {
				if (hydrated) return;
				const p = list.find((x) => x.uid === this.policyUid);
				if (!p) return;
				hydrated = true;
				this.hydrateFromPolicy(p);
			};

			const failIfMissing = async (list: CommissionPolicy[]) => {
				if (hydrated) return;
				const p = list.find((x) => x.uid === this.policyUid);
				if (p) return;
				hydrated = true;
				const t = await this.toastCtrl.create({
					message: 'No se encontró esta dinámica en el catálogo.',
					color: 'warning',
					duration: 4000,
					position: 'bottom',
				});
				await t.present();
				void this.router.navigateByUrl('/dashboard/commission-dynamics');
			};

			this.facade.allCommissionPolicies$.pipe(take(1)).subscribe((list) => void tryHydrate(list));

			this.facade.loadCommissionPolicies();

			this.actions$
				.pipe(
					ofType(
						CommissionPolicyActions.loadCommissionPoliciesSuccess,
						CommissionPolicyActions.loadCommissionPoliciesFailure,
					),
					take(1),
					takeUntilDestroyed(),
				)
				.subscribe(() => {
					this.facade.allCommissionPolicies$.pipe(take(1)).subscribe((list) => {
						void tryHydrate(list);
						void failIfMissing(list);
					});
				});
		}
	}

	private resetNewForm(): void {
		this.basePolicy = {};
		this.name = '';
		this.active = true;
		this.allowedSchemes = [];
		this.ruleRows = [];
		this.clearErrors();
	}

	private hydrateFromPolicy(p: CommissionPolicy): void {
		this.basePolicy = { ...p };
		this.name = p.name ?? '';
		this.active = p.active !== false;
		this.allowedSchemes = [...(p.allowedSchemes?.length ? p.allowedSchemes : p.scheme ? [p.scheme] : [])];
		this.ruleRows = (p.rules ?? []).map((r) => this.ruleToDraft(r));
		this.clearErrors();
	}

	private ruleToDraft(r: CommissionPolicyRule): RuleDraft {
		let yieldEnabled = false;
		let yieldOp: YieldUiOperator = '<';
		let yieldValue: number | null = null;
		let yieldMin: number | null = null;
		let yieldMax: number | null = null;

		const y = r.yieldCondition;
		if (y) {
			yieldEnabled = true;
			if (y.type === 'between') {
				yieldOp = 'BETWEEN';
				yieldMin = y.low;
				yieldMax = y.high;
			} else {
				yieldOp = y.operator;
				yieldValue = y.value;
			}
		}

		return {
			scheme: r.scheme,
			additionalPercent: r.additionalPercent,
			appliesToImmediate: r.appliesToImmediate,
			appliesToRecurring: r.appliesToRecurring,
			yieldEnabled,
			yieldOp,
			yieldValue,
			yieldMin,
			yieldMax,
		};
	}

	private clearErrors(): void {
		this.nameError = '';
		this.schemesError = '';
		this.generalErrors = [];
		this.ruleErrors = [];
	}

	onAllowedSchemesChange(next: CommissionSchemeCode[] | undefined): void {
		this.allowedSchemes = [...(next ?? [])];
		const before = this.ruleRows.length;
		this.ruleRows = this.ruleRows.filter((row) => next.includes(row.scheme));
		if (this.ruleRows.length < before) {
			void this.toastForRemovedRules(before - this.ruleRows.length);
		}
	}

	private async toastForRemovedRules(n: number): Promise<void> {
		const t = await this.toastCtrl.create({
			message:
				n === 1
					? 'Se quitó una regla cuyo esquema ya no está permitido.'
					: `Se quitaron ${n} reglas cuyos esquemas ya no están permitidos.`,
			duration: 3500,
			position: 'bottom',
			color: 'warning',
		});
		await t.present();
	}

	addRuleRow(): void {
		const scheme = this.allowedSchemes[0] ?? 'A';
		this.ruleRows.push({
			scheme,
			additionalPercent: 0,
			appliesToImmediate: true,
			appliesToRecurring: false,
			yieldEnabled: false,
			yieldOp: '<',
			yieldValue: null,
			yieldMin: null,
			yieldMax: null,
		});
	}

	async confirmRemoveRule(index: number): Promise<void> {
		const row = this.ruleRows[index];
		if (!row) return;
		if (!this.ruleRowHasData(row)) {
			this.ruleRows.splice(index, 1);
			return;
		}
		const alert = await this.alertCtrl.create({
			header: 'Quitar regla',
			message: 'Esta regla ya tiene datos. ¿La quitas del listado?',
			buttons: [
				{ text: 'Cancelar', role: 'cancel' },
				{
					text: 'Quitar',
					role: 'destructive',
					handler: () => {
						this.ruleRows.splice(index, 1);
					},
				},
			],
		});
		await alert.present();
	}

	ruleRowHasData(row: RuleDraft): boolean {
		if (row.yieldEnabled) return true;
		if (row.appliesToRecurring) return true;
		if (!row.appliesToImmediate) return true;
		const p = row.additionalPercent;
		if (p != null && p !== 0) return true;
		return false;
	}

	schemesForRow(row: RuleDraft): CommissionSchemeCode[] {
		return this.allowedSchemes.length ? this.allowedSchemes : ['A', 'B'];
	}

	private normalizeBetweenInRow(row: RuleDraft): void {
		if (row.yieldOp !== 'BETWEEN' || row.yieldMin == null || row.yieldMax == null) return;
		if (row.yieldMin <= row.yieldMax) return;
		const t = row.yieldMin;
		row.yieldMin = row.yieldMax;
		row.yieldMax = t;
		void this.toastCtrl
			.create({
				message: 'Se ordenaron mínimo y máximo (intervalo inclusivo).',
				duration: 2800,
				position: 'bottom',
				color: 'medium',
			})
			.then((x) => x.present());
	}

	private draftToYieldCondition(row: RuleDraft): YieldConditionDto | undefined {
		if (!row.yieldEnabled) return undefined;
		if (row.yieldOp === 'BETWEEN') {
			if (row.yieldMin == null || row.yieldMax == null) return undefined;
			this.normalizeBetweenInRow(row);
			const { low, high } = normalizeBetweenLowHigh(row.yieldMin, row.yieldMax);
			return { type: 'between', low, high };
		}
		if (row.yieldValue == null) return undefined;
		return { type: 'compare', operator: row.yieldOp as YieldCompareOperator, value: row.yieldValue };
	}

	private semanticFormErrors(): string[] {
		const out: string[] = [];
		if (!this.name.trim()) {
			out.push('El nombre es obligatorio');
		}
		if (!this.allowedSchemes.length) {
			out.push('Selecciona al menos un esquema permitido');
		}
		this.ruleRows.forEach((row, i) => {
			const n = i + 1;
			if (!row.appliesToImmediate && !row.appliesToRecurring) {
				out.push(`Regla ${n}: elige al menos un tipo de comisión (Inmediata y/o Regular).`);
			}
			const pct = row.additionalPercent;
			if (pct == null || !Number.isFinite(pct)) {
				out.push(`Regla ${n}: indica un porcentaje adicional válido (≥ 0).`);
			} else if (pct < 0) {
				out.push(`Regla ${n}: el porcentaje adicional no puede ser negativo.`);
			}
			if (row.yieldEnabled) {
				if (row.yieldOp === 'BETWEEN') {
					if (row.yieldMin == null || !Number.isFinite(row.yieldMin) || row.yieldMax == null || !Number.isFinite(row.yieldMax)) {
						out.push(`Regla ${n}: completa mínimo y máximo del rendimiento (Entre, inclusivo).`);
					}
				} else if (row.yieldValue == null || !Number.isFinite(row.yieldValue)) {
					out.push(`Regla ${n}: indica el valor de rendimiento para la condición.`);
				}
			}
		});
		return out;
	}

	private buildPolicyPayload(): CommissionPolicy {
		const rules: CommissionPolicyRule[] = this.ruleRows.map((row) => ({
			scheme: row.scheme,
			additionalPercent: Number(row.additionalPercent),
			appliesToImmediate: row.appliesToImmediate,
			appliesToRecurring: row.appliesToRecurring,
			yieldCondition: this.draftToYieldCondition(row) ?? undefined,
		}));

		const { validFrom: _legacyFrom, validTo: _legacyTo, ...baseRest } =
			(this.basePolicy ?? {}) as Partial<CommissionPolicy>;

		return {
			...baseRest,
			uid: this.policyUid ?? '',
			name: this.name,
			active: this.active,
			allowedSchemes: [...this.allowedSchemes],
			rules,
		} as CommissionPolicy;
	}

	save(): void {
		this.clearErrors();

		const semantic = this.semanticFormErrors();
		if (semantic.length) {
			this.applyErrorMessages(semantic);
			void this.toastCtrl
				.create({
					color: 'danger',
					message: semantic.slice(0, 3).join(' · ') + (semantic.length > 3 ? '…' : ''),
					duration: 5000,
					position: 'bottom',
				})
				.then((t) => t.present());
			return;
		}

		const payload = this.buildPolicyPayload();
		const domainErrors = collectCommissionPolicyValidationErrors(payload);
		if (domainErrors.length) {
			this.applyErrorMessages(domainErrors);
			void this.toastCtrl
				.create({
					color: 'danger',
					message: domainErrors.slice(0, 3).join(' · ') + (domainErrors.length > 3 ? '…' : ''),
					duration: 5000,
					position: 'bottom',
				})
				.then((t) => t.present());
			return;
		}

		if (this.isNew) {
			this.pendingNavigateAfterCreate = true;
			this.facade.createCommissionPolicy(payload);
		} else if (this.policyUid) {
			this.pendingNavigateAfterUpdate = true;
			this.facade.updateCommissionPolicy({ ...payload, uid: this.policyUid });
		}
	}

	private applyErrorMessages(messages: string[]): void {
		for (const m of messages) {
			if (m.includes('nombre') || m === 'El nombre es obligatorio') {
				this.nameError = 'El nombre es obligatorio';
				continue;
			}
			if (m.includes('esquema permitido') || m.includes('allowedSchemes')) {
				this.schemesError = 'Selecciona al menos un esquema permitido';
				continue;
			}
			const ruleMatch = /^rules\[(\d+)\]:\s*(.+)$/.exec(m);
			if (ruleMatch) {
				const idx = Number(ruleMatch[1]);
				const msg = ruleMatch[2];
				if (!this.ruleErrors[idx]) this.ruleErrors[idx] = [];
				this.ruleErrors[idx].push(msg);
				continue;
			}
			this.generalErrors.push(m);
		}
	}

	cancel(): void {
		void this.router.navigateByUrl('/dashboard/commission-dynamics');
	}
}
