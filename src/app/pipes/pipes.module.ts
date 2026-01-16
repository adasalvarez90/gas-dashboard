// Libraries
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// Pipes
import { PluralPipe } from './plural.pipe';

@NgModule({
	declarations: [
		PluralPipe,
	],
	imports: [
		CommonModule
	],
	exports: [
		PluralPipe,
	]
})
export class PipesModule { }
