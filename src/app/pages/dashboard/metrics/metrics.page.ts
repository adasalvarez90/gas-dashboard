import { Component, OnInit } from '@angular/core';
// RxJS
import { combineLatest, map } from 'rxjs';

// Services
import { CommissionEngineService } from 'src/app/domain/engines/commission-engine.service';
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
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
	advisors$ = this.advisorFacade.entities$;
	matrix$ = this.commissionConfigFacade.commissionConfigs$;

	draftPayments$ = combineLatest([
		this.contracts$,
		this.advisors$,
		this.matrix$
	]).pipe(
		map(([contracts, advisors, matrix]) => {

			return contracts.flatMap(contract => {

				const splits = this.roleResolver.resolveRoleSplits(
					contract,
					advisors,
					matrix
				);

				return this.engine.generatePayments(contract, splits);

			});

		})
	);

	metrics$ = combineLatest([
		this.contracts$,
		this.advisors$,
		this.matrix$
	]).pipe(
		map(([contracts, advisors, matrix]) => {

			const drafts = contracts.flatMap(contract => {

				const splits = this.roleResolver.resolveRoleSplits(
					contract,
					advisors,
					matrix
				);

				console.log('Splits for contract', contract.uid, splits);

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
		private advisorFacade: AdvisorFacade,
		private contractFacade: ContractFacade,
		private commissionConfigFacade: CommissionConfigFacade,
	) { }

	ngOnInit() { }

}
