import { RouterReducerState } from '@ngrx/router-store';
// Models
import { Metadata } from '../models/metadata.model';

//
function collectSearchTokens(value: any, out: string[]) {
	if (value === null || value === undefined) return;

	const t = typeof value;
	if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') {
		out.push(String(value));
		return;
	}

	if (Array.isArray(value)) {
		for (const v of value) collectSearchTokens(v, out);
		return;
	}

	if (value instanceof Date) {
		out.push(value.toISOString());
		return;
	}

	if (t === 'object') {
		for (const k of Object.keys(value)) collectSearchTokens(value[k], out);
	}
}

export function match(item: Metadata, search: string) {
	// try catch
	try {
		if (!search || !search.trim()) return true;
		// Create the pattern
		const pattern = new RegExp(search, 'i');

		const tokens: string[] = [];
		collectSearchTokens(item, tokens);

		return pattern.test(tokens.join(' '));
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
