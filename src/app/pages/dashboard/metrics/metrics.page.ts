import { Component, OnInit } from '@angular/core';
// RxJS
import { combineLatest, map } from 'rxjs';

// Services
import { CommissionEngineService } from 'src/app/domain/engines/commission-engine.service';
import { CommissionConfigFacade } from 'src/app/store/commission-config/commission-config.facade';
import { ContractFacade } from 'src/app/store/contract/contract.facade';

// Domain
import { RoleResolverService } from 'src/app/domain/engines/role-resolver.service';
import { MetricsAggregatorService } from 'src/app/domain/metrics/metrics-aggregator.service';

@Component({
	selector: 'app-metrics',
	standalone: false,
	templateUrl: './metrics.page.html',
	styleUrls: ['./metrics.page.scss'],
})
export class MetricsPage implements OnInit {

	contracts$ = this.contractFacade.contracts$;
	matrix$ = this.commissionConfigFacade.commissionConfigs$;

	draftPayments$ = combineLatest([
		this.contracts$,
		this.matrix$
	]).pipe(
		map(([contracts, matrix]) => {

			return contracts.flatMap(contract => {

				const splits = this.roleResolver.resolveRoleSplits(
					contract,
					matrix
				);

				return this.engine.generatePayments(contract, splits);

			});

		})
	);

	metrics$ = combineLatest([
		this.contracts$,
		this.matrix$
	]).pipe(
		map(([contracts, matrix]) => {

			const drafts = contracts.flatMap(contract => {

				const splits = this.roleResolver.resolveRoleSplits(
					contract,
					matrix
				);

				return this.engine.generatePayments(contract, splits);

			});

			return this.metricsAggregator.buildDashboardMetrics(
				contracts,
				drafts
			);

		})
	);

	constructor(
		private engine: CommissionEngineService,
		private roleResolver: RoleResolverService,
		private metricsAggregator: MetricsAggregatorService,
		private contractFacade: ContractFacade,
		private commissionConfigFacade: CommissionConfigFacade,
	) { }

	ngOnInit() { }

}
