import { AbstractControl, FormArray, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

const MEXICO_TZ = 'America/Mexico_City';

function todayInMexico(): { y: number; m: number; d: number } {
	const s = new Date().toLocaleDateString('en-CA', { timeZone: MEXICO_TZ });
	const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
	return { y, m, d };
}

/** Edad cumplida hoy en México (≥18). */
export function isAtLeast18InMexico(fechaNacimientoYmd: string): boolean {
	if (!fechaNacimientoYmd || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimientoYmd)) return false;
	const [y, m, d] = fechaNacimientoYmd.split('-').map((x) => parseInt(x, 10));
	const today = todayInMexico();
	let age = today.y - y;
	if (today.m < m || (today.m === m && today.d < d)) age--;
	return age >= 18;
}

export function beneficiaryAgeValidator(): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		const v = control.value;
		if (!v) return null;
		return isAtLeast18InMexico(v) ? null : { menorDeEdad: true };
	};
}

/** Si hay ≥1 beneficiario: suma porcentajes = 100; si uno solo, debe ser 100. */
export function beneficiariesArrayValidator(): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		const fa = control as FormArray;
		if (!fa || !fa.length) return null;
		let sum = 0;
		for (const c of fa.controls) {
			const g = c as FormGroup;
			const pct = Number(g.get('porcentaje')?.value);
			if (!isFinite(pct)) return { porcentajeInvalido: true };
			sum += pct;
			const fn = g.get('fechaNacimiento')?.value;
			if (fn && !isAtLeast18InMexico(fn)) return { menorDeEdad: true };
		}
		if (Math.abs(sum - 100) > 0.01) return { sumaPorcentajes: { sum } };
		return null;
	};
}
