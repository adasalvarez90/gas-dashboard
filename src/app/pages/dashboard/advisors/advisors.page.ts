import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { map } from 'rxjs/operators';
// Components
import { AdvisorsManageComponent } from 'src/app/components/advisors-manage/advisors-manage.component';
// Facades
import { AdvisorFacade } from 'src/app/store/advisor/advisor.facade';
// Model
import { Advisor } from 'src/app/store/advisor/advisor.model'

@Component({
	selector: 'app-advisors',
	standalone: false,
	templateUrl: './advisors.page.html',
	styleUrls: ['./advisors.page.scss'],
})
export class AdvisorsPage implements OnInit {
	advisors$ = this.advisorFacade.advisors$;
	managersDic$ = this.advisorFacade.managerEntities$;
	// Categorized advisors
	ceos$ = this.advisors$.pipe(
		map(list => list.filter(a => a.hierarchyLevel === 'CEO'))
	);

	managers$ = this.advisors$.pipe(
		map(list => list.filter(a => a.hierarchyLevel === 'MANAGER'))
	);

	consultants$ = this.advisors$.pipe(
		map(list => list.filter(a => a.hierarchyLevel === 'CONSULTANT'))
	);
	// Search term
	search$ = this.advisorFacade.search$;
	total$ = this.advisorFacade.total$;

	constructor(
		private advisorFacade: AdvisorFacade,
		private modalCtrl: ModalController
	) { }

	ngOnInit() {
		// subscribe to advisors
		this.advisors$.subscribe();
	}

	filter(searchTerm: any) {
		// dispatch search term
		this.advisorFacade.searchText(searchTerm);
	}

	async openAdvisor(advisor: Advisor = null) {
		// set selected advisor
		this.advisorFacade.selectAdvisor(advisor);
		// Modal
		const modal = await this.modalCtrl.create({
			component: AdvisorsManageComponent,
			cssClass: 'glass-modal',
			backdropDismiss: false,
		});

		await modal.present();
	}
}
