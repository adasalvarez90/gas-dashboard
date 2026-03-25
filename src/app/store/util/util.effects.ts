import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { mergeMap } from 'rxjs/operators';
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

    constructor(private actions$: Actions) {}

    /** Carga inicial tras login/restore: despacha cada loader por separado para garantizar que corran. */
    loadAfterAuth$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UtilActions.loadAfterAuth),
            mergeMap(() =>
                from([
                    UserActions.loadUsers(),
                    InviteActions.loadInvites(),
                    AdvisorActions.loadAdvisors(),
                    ContractActions.loadContracts(),
                    CommissionConfigActions.loadCommissionConfigs(),
                    CommissionPolicyActions.loadCommissionPolicies(),
                    CommissionPaymentActions.loadCommissionPaymentsForCuts({}),
                ]),
            ),
        ),
    );
}
