import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { combineLatest, filter, map, take, timeout, catchError, of } from 'rxjs';

import { CommissionPaymentFacade } from 'src/app/store/commission-payment/commission-payment.facade';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
/**
 * Resolver que fuerza la carga de advisors y commission payments antes de mostrar
 * la página Cortes de comisión. Evita que llegues a la pantalla sin datos.
 */
@Injectable({ providedIn: 'root' })
export class CommissionCutsResolver implements Resolve<boolean> {
	constructor(
		private commissionPaymentFacade: CommissionPaymentFacade,
		private advisorFacade: AdvisorFacade,
	) {}

	resolve(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> {
		this.advisorFacade.loadAdvisors();
		this.commissionPaymentFacade.loadCommissionPaymentsForCuts();

		return combineLatest([
			this.commissionPaymentFacade.loading$,
			this.advisorFacade.loading$,
		]).pipe(
			filter(([cpLoading, advLoading]) => !cpLoading && !advLoading),
			take(1),
			map(() => true),
			timeout(20000),
			catchError(() => of(true)),
		);
	}
}
