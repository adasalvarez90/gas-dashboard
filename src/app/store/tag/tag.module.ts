import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { tagReducer } from './tag.reducer';
import { EffectsModule } from '@ngrx/effects';
import { TagEffects } from './tag.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([TagEffects]),
		StoreModule.forFeature('tags', tagReducer)
	]
})
export class TagModule { }
