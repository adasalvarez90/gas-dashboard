import { Params, Data } from '@angular/router';

export interface RouterStateUrl {
	url: string;
	data: Data;
	params: Params;
	queryParams: Params;
}

export interface RouterState {
	state: RouterStateUrl;
	navigationId: number;
}
