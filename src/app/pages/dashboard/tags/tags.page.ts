import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
// Components
import { TagsManageComponent } from 'src/app/components/tags-manage/tags-manage.component';
// Facades
import { TagFacade } from 'src/app/store/tag/tag.facade';
// Model
import { Tag } from 'src/app/store/tag/tag.model'

@Component({
	selector: 'app-tags',
	standalone: false,
	templateUrl: './tags.page.html',
	styleUrls: ['./tags.page.scss'],
})
export class TagsPage implements OnInit {
	tags$ = this.tagFacade.tags$;

	// Search term
	search$ = this.tagFacade.search$;
	total$ = this.tagFacade.total$;

	constructor(
		private tagFacade: TagFacade,
		private modalCtrl: ModalController
	) { }

	ngOnInit() { }

	filter(searchTerm: any) {
		// dispatch search term
		this.tagFacade.searchText(searchTerm);
	}

	async openTag(tag: Tag = null) {
		// set selected tag
		this.tagFacade.selectTag(tag);
		// Modal
		const modal = await this.modalCtrl.create({
			component: TagsManageComponent,
			componentProps: {},
		});

		await modal.present();
	}
}
