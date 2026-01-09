import { RouterStateSnapshot } from '@angular/router';
import { RouterStateSerializer } from '@ngrx/router-store';

import { RouterStateUrl } from './router.state';

export class CustomSerializer implements RouterStateSerializer<RouterStateUrl> {
	//
	public serialize(routerState: RouterStateSnapshot): RouterStateUrl {
		//
		let route = routerState.root;
		// Iterate until the first child it's active
		while (route.firstChild) {
			// Set the first child
			route = route.firstChild;
		}
		// Get the url and the query params from the route state
		const {
			url,
			root: {
				queryParams
			}
		}  = routerState;
		// Get the params from the route
		const { params, data } = route;
		// Return an object that include only those three objects
		return {
			url,
			data,
			params,
			queryParams
		};
	}
}
