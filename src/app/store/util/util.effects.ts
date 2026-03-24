import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';

//RxJs
import { switchMap, filter, map, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';

// Feature actions
import * as UtilActions from './util.actions';
import * as UserActions from '../user/user.actions';
import * as InviteActions from '../invite/invite.actions';
import * as AdvisorActions from '../advisor/advisor.actions';
import * as ContractActions from '../contract/contract.actions';
import * as CommissionConfigActions from '../commission-config/commission-config.actions';
import * as CommissionPolicyActions from '../commission-policy/commission-policy.actions';
import * as CommissionPaymentActions from '../commission-payment/commission-payment.actions';

@Injectable()
export class UtilEffects {

    constructor(
        private actions$: Actions,
        private router: Router,
    ) {}

    /** Carga inicial tras login/restore: despacha cada loader por separado para garantizar que corran. */
    loadAfterAuth$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UtilActions.loadAfterAuth),
            mergeMap(() => {
                console.log('[UtilEffects] loadAfterAuth disparado');
                return from([
                    UserActions.loadUsers(),
                    InviteActions.loadInvites(),
                    AdvisorActions.loadAdvisors(),
                    ContractActions.loadContracts(),
                    CommissionConfigActions.loadCommissionConfigs(),
                    CommissionPolicyActions.loadCommissionPolicies(),
                    CommissionPaymentActions.loadCommissionPaymentsForCuts({}),
                ]);
            })
        )
    );

    /** Recarga comisiones y advisors al entrar a Cortes de comisión */
    loadCommissionPaymentsOnNavigateToCuts$ = createEffect(() =>
        this.actions$.pipe(
            ofType(routerNavigatedAction),
            filter(() => {
                const ok = (this.router.url || '').includes('commission-cuts');
                if (ok) console.log('[UtilEffects] loadCommissionPaymentsOnNavigateToCuts: URL=', this.router.url);
                return ok;
            }),
            mergeMap(() =>
                from([
                    AdvisorActions.loadAdvisors(),
                    CommissionPaymentActions.loadCommissionPaymentsForCuts({}),
                ]),
            ),
        )
    );
}
