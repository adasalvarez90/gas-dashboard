import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

//RxJs
import { switchMap } from 'rxjs/operators';

// Feature actions
import * as UtilActions from './util.actions';
import * as UserActions from '../user/user.actions';
import * as InviteActions from '../invite/invite.actions';
import * as AdvisorActions from '../advisor/advisor.actions';
import * as ContractActions from '../contract/contract.actions';

@Injectable()
export class UtilEffects {

    loadAfterAuth$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UtilActions.loadAfterAuth),
            switchMap(() => [
                UserActions.loadUsers(),
                InviteActions.loadInvites(),
                AdvisorActions.loadAdvisors(),
                ContractActions.loadContracts()
            ])
        )
    );

    constructor(private actions$: Actions) { }
}
