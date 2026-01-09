import { RouterReducerState } from '@ngrx/router-store';
// Models
import { Metadata } from '../models/metadata.model';

//
export function match(item: Metadata, search: string) {
	// try catch
	try {
		// Create the pattern
		const pattern = new RegExp(search, 'gi');
		// Reduce every key match by the pattern
		return Object.keys(item).reduce((acc, key) => acc || (item[key] && item[key].toString().match(pattern)), false);
	// Catch an error
	} catch (error) {
		// If there's an error return true
		return true;
	}
}

// Define the root state
export interface State {
	router: RouterReducerState;
}
