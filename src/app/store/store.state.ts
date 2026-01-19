import { RouterReducerState } from '@ngrx/router-store';
// Models
import { Metadata } from '../models/metadata.model';

//
export function match<T extends object>(item: T, search: string): boolean {
	try {
		const pattern = new RegExp(search, 'gi');

		return Object.keys(item).some(key => {
			const value = (item as any)[key];
			return value && value.toString().match(pattern);
		});

	} catch {
			return true;
	}
}

// Define the root state
export interface State {
	router: RouterReducerState;
}
