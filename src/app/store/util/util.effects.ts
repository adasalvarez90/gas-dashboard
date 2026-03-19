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

import { getDefaultCutDateRange } from '../../domain/commission-cut/commission-cut-deadlines.util';

@Injectable()
export class UtilEffects {

    constructor(
        private actions$: Actions,
        private router: Router,
    ) {}

    loadAfterAuth$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UtilActions.loadAfterAuth),
            switchMap(() => {
                const { startCutDate, endCutDate } = getDefaultCutDateRange();
                return [
                    UserActions.loadUsers(),
                    InviteActions.loadInvites(),
                    AdvisorActions.loadAdvisors(),
                    ContractActions.loadContracts(),
                    CommissionConfigActions.loadCommissionConfigs(),
                    CommissionPolicyActions.loadCommissionPolicies(),
                    CommissionPaymentActions.loadCommissionPaymentsForCuts({ startCutDate, endCutDate }),
                ];
            })
        )
    );

    /** Recarga comisiones y advisors al entrar a Cortes de comisión */
    loadCommissionPaymentsOnNavigateToCuts$ = createEffect(() =>
        this.actions$.pipe(
            ofType(routerNavigatedAction),
            filter((a) => {
                const fromRouter = this.router.url || '';
                const fromPayload = (a as any)?.payload?.routerState?.url || '';
                const url = fromRouter || fromPayload;
                return url.includes('commission-cuts');
            }),
            switchMap(() => {
                const { startCutDate, endCutDate } = getDefaultCutDateRange();
                return [
                    AdvisorActions.loadAdvisors(),
                    CommissionPaymentActions.loadCommissionPaymentsForCuts({ startCutDate, endCutDate }),
                ];
            }),
        )
    );
}
