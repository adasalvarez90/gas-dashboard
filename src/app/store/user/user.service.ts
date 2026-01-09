// Libraries
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Update } from '@ngrx/entity';
import { Observable, BehaviorSubject, concat, from, lastValueFrom } from 'rxjs';
import { skipWhile, map, switchMap, mergeMap, toArray } from 'rxjs/operators';
// Models
import { User } from './user.model';
import * as fromUser from './index';

@Injectable({
	providedIn: 'root'
})
export class UserService {
	//
	private _stream$: Observable<any>;
	private _stream: BehaviorSubject<any> = new BehaviorSubject<any>(null);
	//
	constructor() {
	}
	//
	public getActions(): Observable<any> {
		//
		return this._stream$;
	}
}
