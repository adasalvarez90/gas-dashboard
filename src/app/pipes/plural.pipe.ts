import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'plural',
	standalone: false
})
export class PluralPipe implements PipeTransform {
	// Get the word
	transform(word: string, quantity: number = 1, suffix: string = 's', single: string = ''): string {
		// Validate the quantity
		if (quantity === 1) {
			// Chack if there's a single suffix
			if (single) {
				// Add the single suffix to the word
				return `${word}${single}`;
			} else {
				// if it's one return the word
				return word;
			}
		} else {
			// Validate if the end it's with zetha
			if (suffix) {
				// Return the word with suffix
				return `${word}${suffix}`;
			} else {
				// Return the word with an 's'
				return `${word}s`;
			}
		}
	}

}
