import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreRouterConnectingModule, NavigationActionTiming } from '@ngrx/router-store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
// Modules
import { UtilModule } from './util/util.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { InviteModule } from './invite/invite.module'
import { AdvisorModule } from './advisor/advisor.module'
import { ContractModule } from './contract/contract.module'
import { CommissionConfigModule } from './commission-config/commission-config.module'

// Custom serializer
import { CustomSerializer } from './router/router-custom-serializer';
// Reducers
import { reducers } from './store.reducer';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		UtilModule,
		AuthModule,
		UserModule,
		InviteModule,
		AdvisorModule,
		ContractModule,
		CommissionConfigModule,
		// NGRX Modules
		StoreModule.forRoot(reducers),
		EffectsModule.forRoot([]),
		StoreRouterConnectingModule.forRoot({
			serializer: CustomSerializer,
			navigationActionTiming: NavigationActionTiming.PreActivation
		}),
		StoreDevtoolsModule.instrument({
			maxAge: 30
		}),
	]
})
export class MyStoreModule { }
