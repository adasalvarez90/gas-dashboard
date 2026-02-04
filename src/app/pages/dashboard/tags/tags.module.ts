import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TagsPageRoutingModule } from './tags-routing.module';

import { TagsPage } from './tags.page';

import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		PipesModule,
		IonicModule,
		TagsPageRoutingModule
	],
	declarations: [TagsPage]
})
export class TagsPageModule {}
